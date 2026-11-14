// .dxt doku dosyaları (N3Texture). Ayrıntı: docs/formatlar/dxt.md
//   int32 ad_uzunlugu, ad                      (N3BaseFileAccess)
//   "NTF" + sürüm(1 bayt: 3, 4 veya 7)
//   int32 genişlik, int32 yükseklik, uint32 biçim (D3DFORMAT), int32 mipmap_var
//   en büyük seviyeden başlayarak mipmap seviyeleri (mipmap yoksa tek seviye)
//   (ardından ekran kartı DXT desteklemezse diye yarım boyutlu 16 bitlik bir kopya gelir; okumuyoruz)

import crypto from 'node:crypto';

export const BICIM = {
  DXT1: 0x31545844, DXT2: 0x32545844, DXT3: 0x33545844, DXT4: 0x34545844, DXT5: 0x35545844,
  A8R8G8B8: 21, X8R8G8B8: 22, A1R5G5B5: 25, A4R4G4B4: 26,
} as const;

export interface Doku {
  ad: string;
  surum: number;
  genislik: number;
  yukseklik: number;
  bicim: number;
  bicimAdi: string;
  mipmap: boolean;
  /** En büyük seviyenin ham verisi. */
  veri: Uint8Array;
}

export function bicimAdi(b: number): string {
  for (const [ad, deger] of Object.entries(BICIM)) if (deger === b) return ad;
  return `bilinmeyen(${b})`;
}

/** Bir seviyenin bayt boyu. */
export function seviyeBoyu(bicim: number, g: number, y: number): number {
  const bloklar = Math.max(1, Math.ceil(g / 4)) * Math.max(1, Math.ceil(y / 4));
  switch (bicim) {
    case BICIM.DXT1: return bloklar * 8;
    case BICIM.DXT2: case BICIM.DXT3: case BICIM.DXT4: case BICIM.DXT5: return bloklar * 16;
    case BICIM.A8R8G8B8: case BICIM.X8R8G8B8: return g * y * 4;
    case BICIM.A1R5G5B5: case BICIM.A4R4G4B4: return g * y * 2;
  }
  throw new Error(`Desteklenmeyen doku biçimi: ${bicimAdi(bicim)}`);
}

// ---------------- Sürüm 7 (şifreli) ----------------
// Anahtar akışı: RC4, anahtar = SHA-1(PAROLA) ilk 16 bayt (Windows CryptoAPI: CryptCreateHash(0x8004),
// CryptHashData, CryptDeriveKey(0x6801 = RC4, 128 bit)). Parola KnightOnline.exe içinde
// "Microsoft Enhanced Cryptographic Provider" yazısının hemen önünde düz metin olarak durur.
// Oyun her ReadFile çağrısını CryptDecrypt(Final=TRUE) ile çözer; Final=TRUE akışı baştan başlattığı için
// HER OKUMA anahtar akışının 0. baytından başlar. Okuma sınırları:
//   - sıkıştırılmış (DXT) ana seviyeler: seviyenin tamamı tek okuma
//   - sıkıştırılmamış ana seviyeler: satır satır (satır = genişlik * piksel baytı)
//   - DXT dosyalarındaki yarım boyutlu 16 bit kopya: seviye seviye, satır satır
// Başlık ("NTF", sürüm, 16 bayt) şifresizdir. Şifreleme XOR olduğundan çözme ile aynı işlemdir.
export const SURUM7_PAROLA = 'owsd9012%$1as!wpow1033b%!@%12';

let akis = Buffer.alloc(0);
function anahtarAkisi(n: number): Buffer {
  if (akis.length >= n) return akis;
  const anahtar = crypto.createHash('sha1').update(SURUM7_PAROLA, 'latin1').digest().subarray(0, 16);
  const uzunluk = Math.max(n, 1 << 16);
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + s[i] + anahtar[i & 15]) & 255; const t = s[i]; s[i] = s[j]; s[j] = t; }
  const cikti = Buffer.alloc(uzunluk);
  let a = 0; j = 0;
  for (let k = 0; k < uzunluk; k++) {
    a = (a + 1) & 255; j = (j + s[a]) & 255;
    const t = s[a]; s[a] = s[j]; s[j] = t;
    cikti[k] = s[(s[a] + s[j]) & 255];
  }
  akis = cikti;
  return akis;
}

/** Bir dokunun veri bölümündeki (başlıktan sonra) parçalar. `satir`: anahtar akışının yeniden başladığı aralık. */
export interface Parca { ofset: number; boy: number; satir: number }

function pikselBayti(bicim: number): number {
  switch (bicim) {
    case BICIM.A8R8G8B8: case BICIM.X8R8G8B8: return 4;
    case BICIM.A1R5G5B5: case BICIM.A4R4G4B4: return 2;
    default: return 0; // DXT
  }
}

/** Oyunun yazdığı seviye boyu (D3D'nin blok boyundan farklı olarak genişlik*yükseklik temelli). */
function seviyeBoyuOyun(bicim: number, g: number, y: number): number {
  if (bicim === BICIM.DXT1) return (g * y) >> 1;
  const pb = pikselBayti(bicim);
  return pb ? g * y * pb : g * y;
}

/**
 * Veri bölümünün düzeni. Mipmap zinciri en küçük kenar 4'e inene kadar sürer (4x4 dahil).
 * DXT biçimlerinde ana zincirin arkasına yarım boyutlu 16 bit (A4R4G4B4 / DXT1 için A1R5G5B5) kopya gelir.
 */
export function veriDuzeni(bicim: number, g: number, y: number, mipmap: boolean): { ana: Parca[]; yedek: Parca[]; toplam: number } {
  const ana: Parca[] = [], yedek: Parca[] = [];
  let ofset = 0;
  const pb = pikselBayti(bicim);
  for (let w = g, h = y; ; w >>= 1, h >>= 1) {
    const boy = seviyeBoyuOyun(bicim, w, h);
    ana.push({ ofset, boy, satir: pb ? w * pb : boy });
    ofset += boy;
    if (!mipmap || w <= 4 || h <= 4) break;
  }
  if (!pb) {
    const yb = bicim === BICIM.DXT1 ? BICIM.A1R5G5B5 : BICIM.A4R4G4B4;
    for (let w = g >> 1, h = y >> 1; w > 0 && h > 0; w >>= 1, h >>= 1) {
      const boy = seviyeBoyuOyun(yb, w, h);
      yedek.push({ ofset, boy, satir: w * 2 });
      ofset += boy;
      if (!mipmap || w <= 4 || h <= 4) break;
    }
  }
  return { ana, yedek, toplam: ofset };
}

/**
 * Sürüm 7 veri bölümünü yerinde çözer (ya da şifreler; XOR olduğu için aynı işlem).
 * `veri`: başlıktan sonraki baytlar. Yalnızca düzenin kapsadığı kısım işlenir; dosya daha kısaysa eldeki kadarı.
 */
export function surum7Donustur(veri: Uint8Array, bicim: number, g: number, y: number, mipmap: boolean): void {
  const d = veriDuzeni(bicim, g, y, mipmap);
  const k = anahtarAkisi(Math.max(...[...d.ana, ...d.yedek].map((p) => p.satir), 1));
  for (const p of [...d.ana, ...d.yedek]) {
    const son = Math.min(p.ofset + p.boy, veri.length);
    for (let i = p.ofset; i < son; i++) veri[i] ^= k[(i - p.ofset) % p.satir];
  }
}

export function dxtOku(dosya: Uint8Array): Doku {
  const b = Buffer.from(dosya.buffer, dosya.byteOffset, dosya.byteLength);
  const adUz = b.readInt32LE(0);
  let h = 4 + adUz;
  if (adUz < 0 || h + 20 > b.length || b.toString('latin1', h, h + 3) !== 'NTF') {
    // Bazı dosyalarda ad alanı tutarsız; "NTF" imzasını arayarak bul (oyun da böyle yapıyor).
    h = b.indexOf('NTF');
    if (h < 0) throw new Error('NTF imzası yok (doku değil ya da farklı biçim)');
  }
  const ad = h >= 4 ? b.toString('latin1', 4, Math.max(4, h)) : '';
  const genislik = b.readInt32LE(h + 4);
  const yukseklik = b.readInt32LE(h + 8);
  const bicim = b.readUInt32LE(h + 12);
  const mipmap = b.readInt32LE(h + 16) !== 0;
  const bas = h + 20;
  const boy = seviyeBoyu(bicim, genislik, yukseklik);
  if (bas + boy > b.length) throw new Error('Doku verisi eksik');
  const surum = b[h + 3];
  let veri: Uint8Array = b.subarray(bas, bas + boy);
  if (surum === 7) {
    // Orijinal dosyaya dokunmamak için kopya üzerinde çöz; sadece bu dokunun kapsadığı baytlar işlenir
    // (.gtt gibi çok dokulu dosyalarda arkası başka dokudur).
    const d = veriDuzeni(bicim, genislik, yukseklik, mipmap);
    const kopya = Uint8Array.from(b.subarray(bas, Math.min(b.length, bas + d.toplam)));
    surum7Donustur(kopya, bicim, genislik, yukseklik, mipmap);
    veri = kopya.subarray(0, boy);
  }
  return { ad, surum, genislik, yukseklik, bicim, bicimAdi: bicimAdi(bicim), mipmap, veri };
}

/**
 * `.tct` renk haritası: arka arkaya dizilmiş N×N adet 128×128 A1R5G5B5 doku (her biri ad uzunluğu 0 + "NTF" +
 * başlık + mipmap zinciri). 4/16/64/256 parça görülüyor. Sürüm 3 ve 7 ikisi de okunur.
 */
export function tctOku(dosya: Uint8Array): Doku[] {
  const b = Buffer.from(dosya.buffer, dosya.byteOffset, dosya.byteLength);
  const sonuc: Doku[] = [];
  let o = 0;
  while (o + 24 <= b.length) {
    const adUz = b.readInt32LE(o);
    const h = o + 4 + adUz;
    if (adUz < 0 || b.toString('latin1', h, h + 3) !== 'NTF') throw new Error(`.tct: ${sonuc.length}. parçada NTF imzası yok`);
    const g = b.readInt32LE(h + 4), y = b.readInt32LE(h + 8), bc = b.readUInt32LE(h + 12), mm = b.readInt32LE(h + 16) !== 0;
    const son = h + 20 + veriDuzeni(bc, g, y, mm).toplam;
    if (son > b.length) throw new Error(`.tct: ${sonuc.length}. parça dosya sonunu aşıyor`);
    sonuc.push(dxtOku(b.subarray(o, son)));
    o = son;
  }
  if (o !== b.length) throw new Error(`.tct: ${b.length - o} bayt artık var`);
  return sonuc;
}

// ---------------- Çözme (RGBA'ya) ----------------

function renk565(c: number, cikti: number[], i: number): void {
  const r = (c >> 11) & 31, g = (c >> 5) & 63, bl = c & 31;
  cikti[i] = (r << 3) | (r >> 2); cikti[i + 1] = (g << 2) | (g >> 4); cikti[i + 2] = (bl << 3) | (bl >> 2); cikti[i + 3] = 255;
}

function renkBlogu(v: Uint8Array, o: number, dxt1: boolean, palet: number[]): void {
  const c0 = v[o] | (v[o + 1] << 8), c1 = v[o + 2] | (v[o + 3] << 8);
  renk565(c0, palet, 0); renk565(c1, palet, 4);
  for (let k = 0; k < 3; k++) {
    if (!dxt1 || c0 > c1) {
      palet[8 + k] = Math.round((2 * palet[k] + palet[4 + k]) / 3);
      palet[12 + k] = Math.round((palet[k] + 2 * palet[4 + k]) / 3);
    } else {
      palet[8 + k] = Math.round((palet[k] + palet[4 + k]) / 2);
      palet[12 + k] = 0;
    }
  }
  palet[11] = 255;
  palet[15] = !dxt1 || c0 > c1 ? 255 : 0;
}

export function rgbayaCevir(d: Doku): Uint8Array {
  const { genislik: g, yukseklik: y, bicim, veri: v } = d;
  const out = new Uint8Array(g * y * 4);
  if (bicim === BICIM.DXT1 || bicim === BICIM.DXT2 || bicim === BICIM.DXT3 || bicim === BICIM.DXT4 || bicim === BICIM.DXT5) {
    const dxt1 = bicim === BICIM.DXT1;
    const alfaAcik = bicim === BICIM.DXT2 || bicim === BICIM.DXT3; // 4 bit açık alfa
    const blokBoyu = dxt1 ? 8 : 16;
    const palet = new Array<number>(16).fill(0);
    const alfa = new Array<number>(16).fill(255);
    const bx = Math.max(1, Math.ceil(g / 4)), by = Math.max(1, Math.ceil(y / 4));
    for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
      const o = (j * bx + i) * blokBoyu;
      let renkO = o;
      if (!dxt1) {
        renkO = o + 8;
        if (alfaAcik) {
          for (let p = 0; p < 16; p++) { const n = (v[o + (p >> 1)] >> ((p & 1) * 4)) & 15; alfa[p] = n * 17; }
        } else {
          const a0 = v[o], a1 = v[o + 1];
          const tablo = [a0, a1];
          if (a0 > a1) for (let k = 1; k < 7; k++) tablo.push(Math.round(((7 - k) * a0 + k * a1) / 7));
          else { for (let k = 1; k < 5; k++) tablo.push(Math.round(((5 - k) * a0 + k * a1) / 5)); tablo.push(0, 255); }
          let bitler = 0n;
          for (let k = 0; k < 6; k++) bitler |= BigInt(v[o + 2 + k]) << BigInt(8 * k);
          for (let p = 0; p < 16; p++) alfa[p] = tablo[Number((bitler >> BigInt(3 * p)) & 7n)];
        }
      }
      renkBlogu(v, renkO, dxt1, palet);
      const indeks = v[renkO + 4] | (v[renkO + 5] << 8) | (v[renkO + 6] << 16) | (v[renkO + 7] << 24);
      for (let p = 0; p < 16; p++) {
        const px = i * 4 + (p & 3), py = j * 4 + (p >> 2);
        if (px >= g || py >= y) continue;
        const s = ((indeks >>> (2 * p)) & 3) * 4;
        const t = (py * g + px) * 4;
        out[t] = palet[s]; out[t + 1] = palet[s + 1]; out[t + 2] = palet[s + 2];
        out[t + 3] = dxt1 ? palet[s + 3] : alfa[p];
      }
    }
    return out;
  }
  for (let p = 0; p < g * y; p++) {
    const t = p * 4;
    switch (bicim) {
      case BICIM.A8R8G8B8: case BICIM.X8R8G8B8:
        out[t] = v[t + 2]; out[t + 1] = v[t + 1]; out[t + 2] = v[t];
        out[t + 3] = bicim === BICIM.X8R8G8B8 ? 255 : v[t + 3];
        break;
      case BICIM.A1R5G5B5: {
        const c = v[p * 2] | (v[p * 2 + 1] << 8);
        const r = (c >> 10) & 31, gg = (c >> 5) & 31, b = c & 31;
        out[t] = (r << 3) | (r >> 2); out[t + 1] = (gg << 3) | (gg >> 2); out[t + 2] = (b << 3) | (b >> 2);
        out[t + 3] = c & 0x8000 ? 255 : 0;
        break;
      }
      case BICIM.A4R4G4B4: {
        const c = v[p * 2] | (v[p * 2 + 1] << 8);
        out[t] = ((c >> 8) & 15) * 17; out[t + 1] = ((c >> 4) & 15) * 17; out[t + 2] = (c & 15) * 17; out[t + 3] = ((c >> 12) & 15) * 17;
        break;
      }
      default: throw new Error(`Desteklenmeyen doku biçimi: ${bicimAdi(bicim)}`);
    }
  }
  return out;
}
