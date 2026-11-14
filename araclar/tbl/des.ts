// Knight Online tablolarında kullanılan DES çeşidi.
//
// Standart DES ile aynı anahtar takvimi, genişletme (E), S-kutuları ve P permütasyonu kullanılır;
// tek fark başlangıç (IP) ve bitiş (FP) permütasyonlarının UYGULANMAMASIDIR.
// Kaynak: Pentagram TBL editor v1.3 içindeki "Double Encryption (1886 and above)" sınıfının
// IL kodu incelenerek çıkarıldı; çıktısı editörün kendi çıktısıyla bayt bayt karşılaştırıldı.
// Ayrıntı: docs/formatlar/tbl.md

const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
  63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
];
const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
  41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
];
const KAYDIRMA = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
const E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
  16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
];
const P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25];
const S = [
  [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
    4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
  [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
    0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
  [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
    13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
  [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
    10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
  [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
    4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
  [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
    9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
  [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
    1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
  [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
    7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
];

/** SP[j][v]: j. S-kutusunun 6 bitlik v girdisi için, P permütasyonu uygulanmış 32 bitlik çıktısı. */
const SP: Uint32Array[] = S.map((kutu, j) => {
  const tablo = new Uint32Array(64);
  for (let v = 0; v < 64; v++) {
    const satir = ((v >> 4) & 2) | (v & 1);
    const sutun = (v >> 1) & 15;
    const cikti4 = kutu[satir * 16 + sutun];
    // S çıktısını 32 bitlik ara değerde 4j+1..4j+4 bitlerine yerleştir (1 = en anlamlı bit).
    const ara = (cikti4 << (28 - 4 * j)) >>> 0;
    let sonuc = 0;
    for (let i = 0; i < 32; i++) {
      if ((ara >>> (32 - P[i])) & 1) sonuc |= 1 << (31 - i);
    }
    tablo[v] = sonuc >>> 0;
  }
  return tablo;
});

function bit(veri: Uint8Array, n: number): number {
  // n: 1 tabanlı, 1 = ilk baytın en anlamlı biti
  return (veri[(n - 1) >> 3] >> (7 - ((n - 1) & 7))) & 1;
}

/** 16 tur anahtarı; her biri 8 adet 6 bitlik parça. */
export function turAnahtarlari(anahtar: Uint8Array): Uint8Array[] {
  if (anahtar.length !== 8) throw new Error('DES anahtarı 8 bayt olmalı');
  const cd = PC1.map((p) => bit(anahtar, p));
  let c = cd.slice(0, 28);
  let d = cd.slice(28);
  const sonuc: Uint8Array[] = [];
  for (let tur = 0; tur < 16; tur++) {
    for (let k = 0; k < KAYDIRMA[tur]; k++) {
      c = [...c.slice(1), c[0]];
      d = [...d.slice(1), d[0]];
    }
    const birlesik = [...c, ...d];
    const k48 = PC2.map((p) => birlesik[p - 1]);
    const parcalar = new Uint8Array(8);
    for (let j = 0; j < 8; j++) {
      let v = 0;
      for (let b = 0; b < 6; b++) v = (v << 1) | k48[j * 6 + b];
      parcalar[j] = v;
    }
    sonuc.push(parcalar);
  }
  return sonuc;
}

function f(r: number, k: Uint8Array): number {
  let sonuc = 0;
  for (let j = 0; j < 8; j++) {
    let v = 0;
    for (let b = 0; b < 6; b++) v = (v << 1) | ((r >>> (32 - E[j * 6 + b])) & 1);
    sonuc |= SP[j][v ^ k[j]];
  }
  return sonuc >>> 0;
}

function blokIsle(veri: Uint8Array, ofset: number, anahtarlar: Uint8Array[]): void {
  let l = ((veri[ofset] << 24) | (veri[ofset + 1] << 16) | (veri[ofset + 2] << 8) | veri[ofset + 3]) >>> 0;
  let r = ((veri[ofset + 4] << 24) | (veri[ofset + 5] << 16) | (veri[ofset + 6] << 8) | veri[ofset + 7]) >>> 0;
  for (let tur = 0; tur < 16; tur++) {
    const yeni = (l ^ f(r, anahtarlar[tur])) >>> 0;
    if (tur < 15) {
      l = r;
      r = yeni;
    } else {
      l = yeni; // son turda yer değiştirme yok
    }
  }
  veri[ofset] = l >>> 24; veri[ofset + 1] = l >>> 16; veri[ofset + 2] = l >>> 8; veri[ofset + 3] = l;
  veri[ofset + 4] = r >>> 24; veri[ofset + 5] = r >>> 16; veri[ofset + 6] = r >>> 8; veri[ofset + 7] = r;
}

/** Verinin 8 baytlık bloklarını yerinde şifreler (ECB). Uzunluk 8'in katı olmalı. */
export function desSifrele(veri: Uint8Array, anahtar: Uint8Array): void {
  if (veri.length % 8 !== 0) throw new Error('DES verisi 8 baytın katı olmalı');
  const k = turAnahtarlari(anahtar);
  for (let i = 0; i < veri.length; i += 8) blokIsle(veri, i, k);
}

/** Verinin 8 baytlık bloklarını yerinde çözer (ECB). Uzunluk 8'in katı olmalı. */
export function desCoz(veri: Uint8Array, anahtar: Uint8Array): void {
  if (veri.length % 8 !== 0) throw new Error('DES verisi 8 baytın katı olmalı');
  const k = turAnahtarlari(anahtar).reverse();
  for (let i = 0; i < veri.length; i += 8) blokIsle(veri, i, k);
}
