// .hdr + .src paket arşivleri. Kaynak: Launcher-Source/hdr.cpp (CHDRSystem).
//   .hdr : uint32 dosya_sayisi, sonra her dosya için: int32 ad_uzunlugu, ad (ASCII, alt klasör için "\"),
//          uint32 ofset (.src içinde), uint32 uzunluk
//   .src : dosyaların ham içerikleri art arda (sıkıştırma/şifreleme yok)
// Ayrıntı: docs/formatlar/paket.md
import fs from 'node:fs';
import path from 'node:path';

export interface PaketGirdisi { ad: string; ofset: number; uzunluk: number }

export function hdrOku(hdr: Uint8Array): PaketGirdisi[] {
  const dv = new DataView(hdr.buffer, hdr.byteOffset, hdr.byteLength);
  const adet = dv.getUint32(0, true);
  const girdiler: PaketGirdisi[] = [];
  let o = 4;
  for (let i = 0; i < adet; i++) {
    const uz = dv.getInt32(o, true); o += 4;
    if (uz < 0 || o + uz + 8 > hdr.length) throw new Error(`.hdr bozuk (girdi ${i})`);
    const ad = Buffer.from(hdr.subarray(o, o + uz)).toString('latin1'); o += uz;
    const ofset = dv.getUint32(o, true);
    const uzunluk = dv.getUint32(o + 4, true);
    o += 8;
    girdiler.push({ ad, ofset, uzunluk });
  }
  return girdiler;
}

export function hdrYaz(girdiler: PaketGirdisi[]): Uint8Array {
  const parcalar: Buffer[] = [];
  const say = Buffer.alloc(4); say.writeUInt32LE(girdiler.length); parcalar.push(say);
  for (const g of girdiler) {
    const ad = Buffer.from(g.ad, 'latin1');
    const b = Buffer.alloc(4 + ad.length + 8);
    b.writeInt32LE(ad.length, 0); ad.copy(b, 4);
    b.writeUInt32LE(g.ofset, 4 + ad.length); b.writeUInt32LE(g.uzunluk, 8 + ad.length);
    parcalar.push(b);
  }
  return Buffer.concat(parcalar);
}

/** Bir arşivi açık tutar; dosyaları ihtiyaç oldukça .src'den okur. */
export class PaketArsivi {
  readonly girdiler: PaketGirdisi[];
  private dizin = new Map<string, PaketGirdisi>();
  private fd: number;
  constructor(hdrYolu: string, srcYolu: string) {
    this.girdiler = hdrOku(fs.readFileSync(hdrYolu));
    // Aynı ad birden fazla kez geçerse launcher sonuncuyu günceller; biz de sonuncuyu kullanırız.
    for (const g of this.girdiler) this.dizin.set(anahtar(g.ad), g);
    this.fd = fs.openSync(srcYolu, 'r');
  }
  var(ad: string): boolean { return this.dizin.has(anahtar(ad)); }
  oku(ad: string): Buffer {
    const g = this.dizin.get(anahtar(ad));
    if (!g) throw new Error(`Arşivde yok: ${ad}`);
    const b = Buffer.alloc(g.uzunluk);
    fs.readSync(this.fd, b, 0, g.uzunluk, g.ofset);
    return b;
  }
  kapat(): void { fs.closeSync(this.fd); }
}

/** Yol karşılaştırması: büyük/küçük harf ve eğik çizgi farkı önemsiz. */
export function anahtar(ad: string): string {
  return ad.replace(/\//g, '\\').toLowerCase();
}

/** Bir klasördeki dosyaları yeni .hdr + .src çiftine paketler (dosya adları klasöre göreli). */
export function klasoruPaketle(klasor: string, hdrYolu: string, srcYolu: string): number {
  const dosyalar: string[] = [];
  const gez = (d: string) => {
    for (const g of fs.readdirSync(d, { withFileTypes: true })) {
      const tam = path.join(d, g.name);
      if (g.isDirectory()) gez(tam);
      else dosyalar.push(tam);
    }
  };
  gez(klasor);
  dosyalar.sort();
  const girdiler: PaketGirdisi[] = [];
  const src = fs.openSync(srcYolu, 'w');
  let ofset = 0;
  try {
    for (const d of dosyalar) {
      const veri = fs.readFileSync(d);
      fs.writeSync(src, veri);
      girdiler.push({ ad: path.relative(klasor, d).split(path.sep).join('\\'), ofset, uzunluk: veri.length });
      ofset += veri.length;
      if (ofset > 0xffffffff) throw new Error('Paket 4 GB sınırını aşıyor');
    }
  } finally {
    fs.closeSync(src);
  }
  fs.writeFileSync(hdrYolu, hdrYaz(girdiler));
  return girdiler.length;
}
