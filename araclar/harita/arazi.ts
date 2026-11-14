// .gtd arazi dosyası (N3Terrain). Ayrıntı: docs/formatlar/harita.md
//   int32 ad_uzunlugu, ad (eski tablo XOR'u ile şifreli: r=0x0816)
//   int32 (0)
//   int32 ızgara_boyu N (ör. 257 → 256×256 karo, karo = 4 m)
//   N×N × { float yükseklik; uint32 karo_bilgisi }   (sıra: x*N + z)
//       karo_bilgisi bitleri: 0 tam_karo | 1-5 yön1 | 6-10 yön2 | 11-20 doku1 | 21-30 doku2 (1023 = yok)
//   yama bilgisi (32×32 × 2 float), çim haritası (N×N bayt), 4096 bayt (bilinmiyor)
//   char[260] çim dosya adı
//   int32 karo_doku_sayısı, int32 kaynak_dosya_sayısı, kaynak_dosya_sayısı × char[260] (.gtt yolları)
//   karo_doku_sayısı × { int16 kaynak_no; int16 kaynak_içi_sıra }
//   (devamı: ışık haritası vb., henüz okunmuyor)
import { xorCoz, XOR_ESKI } from '../tbl/sifreleme.ts';

export interface Arazi {
  ad: string;
  boyut: number; // N (köşe sayısı bir kenarda)
  birim: number; // karo boyu (metre)
  yukseklik: Float32Array; // N*N, sıra x*N+z
  doku1: Uint16Array; // her köşe/karo için doku numarası
  doku2: Uint16Array; // 1023 = yok
  yon1: Uint8Array;
  yon2: Uint8Array;
  karolar: { kaynak: string; sira: number }[];
}

const MAX_PATH = 260;
const cstr = (b: Buffer, o: number) => b.toString('latin1', o, o + MAX_PATH).replace(/\0[\s\S]*$/, '');

export function gtdOku(dosya: Buffer): Arazi {
  const adUz = dosya.readInt32LE(0);
  const ad = Buffer.from(xorCoz(dosya.subarray(4, 4 + adUz), XOR_ESKI)).toString('latin1');
  let o = 4 + adUz + 4;
  const n = dosya.readInt32LE(o); o += 4;
  if (n < 2 || n > 4097) throw new Error(`Geçersiz ızgara boyu ${n}`);
  const yukseklik = new Float32Array(n * n);
  const doku1 = new Uint16Array(n * n), doku2 = new Uint16Array(n * n);
  const yon1 = new Uint8Array(n * n), yon2 = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    yukseklik[i] = dosya.readFloatLE(o);
    const d = dosya.readUInt32LE(o + 4);
    yon1[i] = (d >> 1) & 31; yon2[i] = (d >> 6) & 31;
    doku1[i] = (d >> 11) & 1023; doku2[i] = (d >> 21) & 1023;
    o += 8;
  }
  const yama = (n - 1) / 8;
  o += yama * yama * 8; // yama orta yükseklik + yarıçap
  o += n * n; // çim haritası
  o += yama * yama * 4; // bilinmeyen 4096 bayt (32×32 int)
  o += MAX_PATH; // çim dosya adı
  const karoSayisi = dosya.readInt32LE(o); o += 4;
  const kaynakSayisi = dosya.readInt32LE(o); o += 4;
  if (karoSayisi < 0 || karoSayisi > 1024 || kaynakSayisi < 0 || kaynakSayisi > 1024) {
    throw new Error(`Karo listesi okunamadı (${karoSayisi}, ${kaynakSayisi})`);
  }
  const kaynaklar: string[] = [];
  for (let i = 0; i < kaynakSayisi; i++) { kaynaklar.push(cstr(dosya, o)); o += MAX_PATH; }
  const karolar = [];
  for (let i = 0; i < karoSayisi; i++) {
    karolar.push({ kaynak: kaynaklar[dosya.readInt16LE(o)], sira: dosya.readInt16LE(o + 2) });
    o += 4;
  }
  return { ad, boyut: n, birim: 4, yukseklik, doku1, doku2, yon1, yon2, karolar };
}

/** Birden fazla doku içeren dosyada (ör. .gtt) sıra'ıncı dokunun başlangıcı. */
export function dokuKonumu(dosya: Buffer, sira: number): number {
  let bulunan = -1, i = -1;
  while ((i = dosya.indexOf('NTF', i + 1)) >= 0) {
    const g = dosya.readInt32LE(i + 4), y = dosya.readInt32LE(i + 8);
    // dxtOku, ad alanı tutarsızsa "NTF"yi kendisi arar; bu yüzden imzanın 4 bayt öncesini vermek yeterli.
    if (g > 0 && g <= 4096 && y > 0 && y <= 4096 && ++bulunan === sira) return Math.max(0, i - 4);
  }
  throw new Error(`Dosyada ${sira}. doku yok`);
}
