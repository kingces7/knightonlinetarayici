// .tbl dosyalarının şifre katmanları. Ayrıntı: docs/formatlar/tbl.md
import { desCoz, desSifrele } from './des.ts';

/** "Çift şifreli" (USKO, sürüm 1886 ve üstü) tabloların başındaki sabit 16 baytlık imza. */
export const USKO_IMZA = Uint8Array.from([
  0x4c, 0x26, 0x43, 0x7f, 0x80, 0xf1, 0x57, 0x98, 0x79, 0xfc, 0xaf, 0x26, 0x86, 0xd6, 0x20, 0x8e,
]);
const USKO_DES_ANAHTARI = Uint8Array.from([0xfe, 0xa8, 0x01, 0x97, 0x75, 0x73, 0x97, 0x76]);
const USKO_BASLIK = 20; // 16 bayt imza + 4 bayt düz metin uzunluğu (big-endian)

/** XOR akış şifresinin anahtarları. */
export interface XorAnahtari { r: number; c1: number; c2: number }
/** Eski tabloların tek katmanlı XOR şifresi (N3TableBase.h). */
export const XOR_ESKI: XorAnahtari = { r: 0x0816, c1: 0x6081, c2: 0x1608 };
/** Çift şifrenin XOR katmanı. */
export const XOR_USKO: XorAnahtari = { r: 0x0418, c1: 0x8041, c2: 0x1804 };

export function xorCoz(veri: Uint8Array, a: XorAnahtari): Uint8Array {
  const cikti = new Uint8Array(veri.length);
  let r = a.r;
  for (let i = 0; i < veri.length; i++) {
    const sifreli = veri[i];
    cikti[i] = sifreli ^ (r >> 8);
    r = ((sifreli + r) * a.c1 + a.c2) & 0xffff;
  }
  return cikti;
}

export function xorSifrele(veri: Uint8Array, a: XorAnahtari): Uint8Array {
  const cikti = new Uint8Array(veri.length);
  let r = a.r;
  for (let i = 0; i < veri.length; i++) {
    const sifreli = veri[i] ^ (r >> 8);
    cikti[i] = sifreli;
    r = ((sifreli + r) * a.c1 + a.c2) & 0xffff;
  }
  return cikti;
}

/**
 * usko-cift : imza + uzunluk + XOR(0x0418) + DES   (çoğu tablo)
 * xor-eski  : sadece XOR(0x0816)                    (N3TableBase.h'deki eski yöntem)
 * xor-0418  : sadece XOR(0x0418)                    (bazı tablolar)
 */
export type SifreTuru = 'usko-cift' | 'xor-eski' | 'xor-0418';

/** İmzası olan dosya kesin usko-cift'tir; olmayanlar için iki XOR çeşidi de aday olur. */
export function sifreAdaylari(dosya: Uint8Array): SifreTuru[] {
  if (dosya.length >= USKO_BASLIK && USKO_IMZA.every((b, i) => dosya[i] === b)) return ['usko-cift'];
  return ['xor-eski', 'xor-0418'];
}

export interface Cozulmus {
  tur: SifreTuru;
  /** Tablonun kendisi (düz metin). */
  veri: Uint8Array;
  /**
   * Sadece usko-cift: bildirilen uzunluktan sonra gelen, çözülmüş ama tabloya ait olmayan baytlar
   * (DES dolgusu vb.). Dosyayı birebir aynı geri üretebilmek için saklanır.
   */
  kuyruk: Uint8Array;
}

export function dosyaCoz(dosya: Uint8Array, tur: SifreTuru = sifreAdaylari(dosya)[0]): Cozulmus {
  if (tur === 'xor-eski') return { tur, veri: xorCoz(dosya, XOR_ESKI), kuyruk: new Uint8Array(0) };
  if (tur === 'xor-0418') return { tur, veri: xorCoz(dosya, XOR_USKO), kuyruk: new Uint8Array(0) };
  const gorunum = new DataView(dosya.buffer, dosya.byteOffset, dosya.byteLength);
  const uzunluk = gorunum.getUint32(16, false);
  // Kopya alınır: Node Buffer'da slice kopya üretmez, desCoz ise yerinde çalışır.
  const sifreli = Uint8Array.from(dosya.subarray(USKO_BASLIK));
  if (sifreli.length % 8 !== 0) throw new Error('Çift şifreli tablo: veri uzunluğu 8\'in katı değil');
  if (uzunluk > sifreli.length) throw new Error('Çift şifreli tablo: bildirilen uzunluk dosyadan büyük');
  desCoz(sifreli, USKO_DES_ANAHTARI);
  const acik = xorCoz(sifreli, XOR_USKO);
  return { tur, veri: acik.slice(0, uzunluk), kuyruk: acik.slice(uzunluk) };
}

export function dosyaSifrele(c: Cozulmus): Uint8Array {
  if (c.tur === 'xor-eski') return xorSifrele(c.veri, XOR_ESKI);
  if (c.tur === 'xor-0418') return xorSifrele(c.veri, XOR_USKO);
  let toplam = c.veri.length + c.kuyruk.length;
  if (toplam % 8 !== 0) toplam += 8 - (toplam % 8); // tablo boyu değiştiyse sıfırla doldur
  const acik = new Uint8Array(toplam);
  acik.set(c.veri, 0);
  acik.set(c.kuyruk, c.veri.length);
  const sifreli = xorSifrele(acik, XOR_USKO);
  desSifrele(sifreli, USKO_DES_ANAHTARI);
  const dosya = new Uint8Array(USKO_BASLIK + sifreli.length);
  dosya.set(USKO_IMZA, 0);
  new DataView(dosya.buffer).setUint32(16, c.veri.length, false);
  dosya.set(sifreli, USKO_BASLIK);
  return dosya;
}
