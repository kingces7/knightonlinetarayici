// Paket çerçevesi + (isteğe bağlı) şifreleme: bir TCP akışındaki baytları "opcode + gövde" paketlerine çevirir ve tersini yapar.
// Çerçeve: `AA 55 | uzunluk u16 | veri | 55 AA` (docs/protokol.md §2). Düz modda veri = `[opcode][gövde]`.
// Şifreli modda:
//   client → sunucu: JvSifre(`[sıra u32][opcode][gövde][CRC32]`), sıra 1'den başlar (şifreleme açıldıktan sonra)
//   sunucu → client: JvSifre(`FC 1E | sıra u16 | 00 | opcode | gövde`), CRC yok.
import { JvSifre } from './jvSifre.ts';
import { lzfAc } from './lzf.ts';

export interface Paket { opcode: number; govde: Uint8Array }

/** `WIZ_COMPRESS_PACKET`: gövdesi LZF ile sıkıştırılmış `[opcode][gövde]` taşır. */
const SIKISTIRILMIS = 0x42;

/**
 * Sıkıştırılmış paketin gövdesini açar. İki başlık düzeni görüldü (docs/protokol.md):
 *  - 1298 resmî sunucu (gerçek yakalama): `u16 sıkıştırılmış, u16 açık uzunluk, u32 CRC, veri`
 *  - Myko kaynağı: `u32 sıkıştırılmış, u32 açık uzunluk, u32 CRC, veri`
 * Hangisi olduğu toplam uzunluktan anlaşılır.
 */
export function sikistirilmisAc(govde: Uint8Array): Paket {
  const g = new DataView(govde.buffer, govde.byteOffset, govde.byteLength);
  let sik: number; let acik: number; let veri: Uint8Array;
  if (govde.length >= 12 && g.getUint32(0, true) + 12 === govde.length) {
    sik = g.getUint32(0, true); acik = g.getUint32(4, true); veri = govde.subarray(12);
  } else if (govde.length >= 8 && g.getUint16(0, true) + 8 === govde.length) {
    sik = g.getUint16(0, true); acik = g.getUint16(2, true); veri = govde.subarray(8);
  } else throw new CerceveHatasi('Sıkıştırılmış paket başlığı tanınamadı');
  void sik;
  const acilmis = lzfAc(veri, acik);
  if (acilmis.length === 0) throw new CerceveHatasi('Sıkıştırılmış paket boş çıktı');
  return { opcode: acilmis[0], govde: acilmis.slice(1) };
}

/** Sunucunun alma tamponu: login server 256, oyun sunucusu 64 KB. Gönderirken aşılmamalı. */
export const EN_BUYUK_VERI = 0xffff;

export class CerceveHatasi extends Error {}

/** `veri` (opcode dahil) baytlarını çerçeveye sarar. */
export function cerceveYap(veri: Uint8Array): Uint8Array {
  if (veri.length === 0 || veri.length > EN_BUYUK_VERI) throw new CerceveHatasi(`Geçersiz veri uzunluğu: ${veri.length}`);
  const cikis = new Uint8Array(veri.length + 6);
  cikis[0] = 0xaa; cikis[1] = 0x55;
  cikis[2] = veri.length & 0xff; cikis[3] = veri.length >>> 8;
  cikis.set(veri, 4);
  cikis[4 + veri.length] = 0x55; cikis[5 + veri.length] = 0xaa;
  return cikis;
}

export class PaketKanali {
  #sifre: JvSifre | null = null;
  #gidenSira = 0;
  #tampon: Uint8Array = new Uint8Array(0);

  get sifreli(): boolean { return this.#sifre !== null; }

  /** Sunucu açık anahtarı gönderdikten sonra çağrılır; sonraki paketler şifreli gider/gelir. */
  sifrelemeyiAc(acikAnahtar: bigint, ozelAnahtar?: bigint): void {
    this.#sifre = new JvSifre(acikAnahtar, ozelAnahtar);
    this.#gidenSira = 0;
  }

  /** Gönderilecek paketi ağa yazılacak baytlara çevirir (tek parça: sunucu bölünmüş paketleri 4 denemeden sonra reddeder). */
  paketYap(opcode: number, govde: Uint8Array = new Uint8Array(0)): Uint8Array {
    if (!this.#sifre) {
      const v = new Uint8Array(1 + govde.length);
      v[0] = opcode; v.set(govde, 1);
      return cerceveYap(v);
    }
    return cerceveYap(this.#sifre.istemciPaketiSifrele(++this.#gidenSira, opcode, govde));
  }

  /** Ağdan gelen baytları ekler; tamamlanan paketleri döndürür. Bozuk çerçevede CerceveHatasi fırlatır. */
  al(parca: Uint8Array): Paket[] {
    if (parca.length) {
      const yeni = new Uint8Array(this.#tampon.length + parca.length);
      yeni.set(this.#tampon); yeni.set(parca, this.#tampon.length);
      this.#tampon = yeni;
    }
    const sonuc: Paket[] = [];
    for (;;) {
      const t = this.#tampon;
      if (t.length < 4) break;
      if (t[0] !== 0xaa || t[1] !== 0x55) throw new CerceveHatasi(`Başlık AA 55 değil: ${t[0].toString(16)} ${t[1].toString(16)}`);
      const n = t[2] | (t[3] << 8);
      if (n === 0) throw new CerceveHatasi('Boş paket (opcode yok)');
      if (t.length < n + 6) break; // gerisi henüz gelmedi
      if (t[4 + n] !== 0x55 || t[5 + n] !== 0xaa) throw new CerceveHatasi('Son işaret 55 AA değil');
      const veri = t.slice(4, 4 + n);
      this.#tampon = t.slice(n + 6);
      const p = this.#paketAc(veri);
      sonuc.push(p.opcode === SIKISTIRILMIS ? sikistirilmisAc(p.govde) : p);
    }
    return sonuc;
  }

  #paketAc(veri: Uint8Array): Paket {
    if (!this.#sifre) return { opcode: veri[0], govde: veri.slice(1) };
    const d = this.#sifre.donustur(veri);
    if (d.length < 6) throw new CerceveHatasi('Şifreli paket çok kısa');
    if (d[0] !== 0xfc || d[1] !== 0x1e) throw new CerceveHatasi('Şifreli paket başlığı FC 1E değil (anahtar yanlış olabilir)');
    return { opcode: d[5], govde: d.slice(6) };
  }
}
