// N3 motoru model dosyaları: .n3pmesh (model), .n3shape (nesne = parçalar + dokular), .opd (harita nesne listesi)
// Ayrıntı: docs/formatlar/model.md
import { xorCoz, XOR_ESKI } from '../tbl/sifreleme.ts';

export class Okuyucu {
  o: number;
  readonly b: Buffer;
  constructor(b: Buffer, o = 0) { this.b = b; this.o = o; }
  i32(): number { const v = this.b.readInt32LE(this.o); this.o += 4; return v; }
  u16(): number { const v = this.b.readUInt16LE(this.o); this.o += 2; return v; }
  u32(): number { const v = this.b.readUInt32LE(this.o); this.o += 4; return v; }
  f32(): number { const v = this.b.readFloatLE(this.o); this.o += 4; return v; }
  v3(): [number, number, number] { return [this.f32(), this.f32(), this.f32()]; }
  q4(): [number, number, number, number] { return [this.f32(), this.f32(), this.f32(), this.f32()]; }
  str(maks = 1024): string {
    const n = this.i32();
    if (n < 0 || n > maks || this.o + n > this.b.length) throw new Error(`Geçersiz metin uzunluğu ${n} (ofset ${this.o - 4})`);
    const s = this.b.toString('latin1', this.o, this.o + n); this.o += n; return s;
  }
  atla(n: number): void { this.o += n; }
}

// ---------------- .n3pmesh ----------------
export interface Mesh {
  ad: string;
  konum: Float32Array; // x,y,z
  normal: Float32Array;
  uv: Float32Array;
  indeks: Uint16Array; // üçgenler (D3D: saat yönü ön yüz)
}

/**
 * Kademeli ağ (progressive mesh). Dosyadaki indeks dizisi **tüm çökmeler uygulanmış** durumdadır (kanıt: her çökmenin
 * değiştirdiği indeks yerlerinde hedef köşe numarası duruyor, kaybolan köşe değil). Kayıtlar en düşükten en ayrıntıya
 * (bölme) sırasındadır: her kayıtta köşe sayısı kaybolanKöşe kadar artar ve kaydın değiştirdiği yerlere yeni doğan
 * köşenin numarası (= o andaki köşe sayısı − 1) yazılır. Kanıt: ilk üçgenler 0 2 1, 1 3 2, 4 6 5 … ve kayıtlar
 * sırasıyla 3, +1, +3 köşe ekliyor.
 *
 *   başlık: int32 çökmeSayısı, int32 indeksDeğişimSayısı, int32 enÇokKöşe, int32 enÇokİndeks, int32 enAzKöşe, int32 enAzİndeks
 *   enÇokKöşe × { vec3 konum, vec3 normal, float u, float v }   (32 bayt)
 *   enÇokİndeks × uint16
 *   çökmeSayısı × { int32 kaybolanİndeks, int32 değişenİndeks, int32 kaybolanKöşe, int32 değişimBaşlangıcı, int32 hedefKöşe, float değer }
 *   indeksDeğişimSayısı × uint32 (indeks dizisindeki yerler)
 *   LOD kontrol değerleri (atlanır)
 */
export function pmeshOku(b: Buffer): Mesh {
  const r = new Okuyucu(b);
  const ad = r.str();
  const cokme = r.i32(), degisim = r.i32();
  const kose = r.i32(), indeks = r.i32();
  r.i32(); r.i32(); // en az köşe / indeks
  if (kose < 0 || kose > 65536 || indeks < 0 || indeks > 1_000_000 || cokme < 0 || degisim < 0) throw new Error(`pmesh başlığı geçersiz (${kose}, ${indeks})`);
  const konum = new Float32Array(kose * 3), normal = new Float32Array(kose * 3), uv = new Float32Array(kose * 2);
  for (let i = 0; i < kose; i++) {
    konum[i * 3] = r.f32(); konum[i * 3 + 1] = r.f32(); konum[i * 3 + 2] = r.f32();
    normal[i * 3] = r.f32(); normal[i * 3 + 1] = r.f32(); normal[i * 3 + 2] = r.f32();
    uv[i * 2] = r.f32(); uv[i * 2 + 1] = r.f32();
  }
  const ind = new Uint16Array(indeks);
  for (let i = 0; i < indeks; i++) ind[i] = r.u16();
  if (cokme > 0 && r.o + cokme * 24 + degisim * 4 <= b.length) {
    const c: { nch: number; vlose: number; off: number }[] = [];
    for (let i = 0; i < cokme; i++) { r.i32(); const nch = r.i32(), vlose = r.i32(), off = r.i32(); r.i32(); r.i32(); c.push({ nch, vlose, off }); }
    const yer = new Uint32Array(degisim);
    for (let i = 0; i < degisim; i++) yer[i] = r.i32() >>> 0;
    let sayi = kose - c.reduce((t, x) => t + x.vlose, 0); // en düşük ayrıntıdaki köşe sayısı (genelde 0)
    for (let i = 0; i < cokme; i++) { // kayıtlar bölme sırasında: en düşükten en ayrıntıya
      sayi += c[i].vlose;
      for (let k = 0; k < c[i].nch; k++) { const p = yer[c[i].off + k]; if (p < indeks) ind[p] = sayi - 1; }
    }
  }
  return { ad, konum, normal, uv, indeks: ind };
}

// ---------------- .n3shape ----------------
export interface ShapeParca { pivot: [number, number, number]; mesh: string; dokular: string[] }
export interface Shape {
  ad: string;
  konum: [number, number, number];
  donus: [number, number, number, number]; // dörtey (x,y,z,w)
  olcek: [number, number, number];
  parcalar: ShapeParca[];
}

function anahtarlariAtla(r: Okuyucu): void {
  for (let k = 0; k < 3; k++) {
    const n = r.i32();
    if (n < 0 || n > 100000) throw new Error('animasyon anahtarı sayısı geçersiz');
    if (n) { r.i32(); r.f32(); r.atla(n * (k === 1 ? 16 : 12)); }
  }
}

/** Okuyucunun bulunduğu yerden bir nesne okur; sondaki 5 int'lik alanı da tüketir. */
export function shapeOkuR(r: Okuyucu, kuyruk = true): Shape {
  const ad = r.str();
  const konum = r.v3(), donus = r.q4(), olcek = r.v3();
  anahtarlariAtla(r);
  r.str(); r.str(); // çarpışma ve tırmanma modeli adları
  const pc = r.i32();
  if (pc < 0 || pc > 512) throw new Error(`parça sayısı geçersiz ${pc}`);
  const parcalar: ShapeParca[] = [];
  for (let p = 0; p < pc; p++) {
    const pivot = r.v3();
    const mesh = r.str();
    r.atla(68 + 24); // D3DMATERIAL9 + renk/karışım ayarları
    const tc = r.i32(); r.f32();
    if (tc < 0 || tc > 1024) throw new Error(`doku sayısı geçersiz ${tc}`);
    const dokular: string[] = [];
    for (let t = 0; t < tc; t++) dokular.push(r.str());
    parcalar.push({ pivot, mesh, dokular });
  }
  if (kuyruk) r.atla(20); // belong, eventID, eventType, npcID, npcStatus
  return { ad, konum, donus, olcek, parcalar };
}

export function shapeOku(b: Buffer): Shape { return shapeOkuR(new Okuyucu(b)); }

// ---------------- .opd ----------------
export interface Opd { ad: string; genislik: number; uzunluk: number; nesneler: Shape[]; atlanan: number }

const KAYIT_ISARETI = new Set([1051, 5147]);

/** Harita nesne listesi. Önce çarpışma verisi gelir; nesne listesi dosyanın ilerisindedir. */
export function opdOku(b: Buffer): Opd {
  const adUz = b.readInt32LE(0);
  const ad = Buffer.from(xorCoz(b.subarray(4, 4 + adUz), XOR_ESKI)).toString('latin1');
  const r = new Okuyucu(b, 4 + adUz + 4);
  const genislik = r.f32(), uzunluk = r.f32();
  // Nesne listesinin başı: "sayı, işaret(1051|5147), nesne" — ilk geçerli kaydı ara.
  const ilk = b.indexOf('object\\');
  if (ilk < 0) return { ad, genislik, uzunluk, nesneler: [], atlanan: 0 };
  let bas = -1, sayi = 0;
  for (let o = Math.max(0, ilk - 2000); o < ilk && bas < 0; o++) {
    const n = b.readInt32LE(o);
    if (n < 1 || n > 200000 || !KAYIT_ISARETI.has(b.readInt32LE(o + 4))) continue;
    try { shapeOkuR(new Okuyucu(b, o + 8)); bas = o + 4; sayi = n; } catch { /* devam */ }
  }
  if (bas < 0) throw new Error('Nesne listesi bulunamadı');
  const nesneler: Shape[] = [];
  let atlanan = 0;
  r.o = bas;
  while (nesneler.length + atlanan < sayi && r.o < b.length - 8) {
    const bu = r.o;
    try {
      if (!KAYIT_ISARETI.has(r.i32())) throw new Error('işaret yok');
      nesneler.push(shapeOkuR(r));
    } catch {
      // Bilinmeyen ek alan: bir sonraki geçerli kayda atla
      let o = bu + 1, bulundu = false;
      for (; o < b.length - 8; o++) {
        if (!KAYIT_ISARETI.has(b.readInt32LE(o))) continue;
        try { shapeOkuR(new Okuyucu(b, o + 4)); bulundu = true; break; } catch { /* devam */ }
      }
      atlanan++;
      if (!bulundu) break;
      r.o = o;
    }
  }
  return { ad, genislik, uzunluk, nesneler, atlanan };
}
