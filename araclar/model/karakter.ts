// Karakter / canavar modelleri: .n3joint (iskelet + kareler), .n3cskins (deri), .n3cpart (parça), .n3anim (animasyon aralıkları)
// Ayrıntı: docs/formatlar/model.md
import { Okuyucu } from './n3.ts';
import { desCoz } from '../tbl/des.ts';

// ---------------- .n3joint ----------------
export interface Anahtarlar { oran: number; deger: Float32Array; bilesen: number } // oran: saniyedeki anahtar sayısı
export interface Eklem {
  ad: string;
  konum: [number, number, number];
  donus: [number, number, number, number];
  olcek: [number, number, number];
  kKonum: Anahtarlar | null; kDonus: Anahtarlar | null; kOlcek: Anahtarlar | null; kYon: Anahtarlar | null;
  cocuklar: Eklem[];
}

function anahtarOku(r: Okuyucu, bilesen: number): Anahtarlar | null {
  const n = r.i32();
  if (n < 0 || n > 200000) throw new Error(`anahtar sayısı geçersiz ${n}`);
  if (!n) return null;
  r.i32(); // anahtar türü
  const oran = r.f32();
  const deger = new Float32Array(n * bilesen);
  for (let i = 0; i < deger.length; i++) deger[i] = r.f32();
  return { oran, deger, bilesen };
}

function eklemOkuR(r: Okuyucu): Eklem {
  const ad = r.str();
  const konum = r.v3(), donus = r.q4(), olcek = r.v3();
  const kKonum = anahtarOku(r, 3), kDonus = anahtarOku(r, 4), kOlcek = anahtarOku(r, 3), kYon = anahtarOku(r, 4);
  const cc = r.i32();
  if (cc < 0 || cc > 1024) throw new Error(`çocuk sayısı geçersiz ${cc}`);
  const cocuklar: Eklem[] = [];
  for (let i = 0; i < cc; i++) cocuklar.push(eklemOkuR(r));
  return { ad, konum, donus, olcek, kKonum, kDonus, kOlcek, kYon, cocuklar };
}

export function eklemOku(b: Buffer): Eklem { return eklemOkuR(new Okuyucu(b)); }

/** Eklemleri ön-sıra (pre-order) dizisi olarak verir; deri kemik numaraları bu sıraya göredir. */
export function eklemDizisi(kok: Eklem): Eklem[] {
  const d: Eklem[] = [];
  const gez = (e: Eklem) => { d.push(e); e.cocuklar.forEach(gez); };
  gez(kok);
  return d;
}

// ---------------- .n3cskins ----------------
export interface Deri {
  ad: string;
  konum: Float32Array; normal: Float32Array; uv: Float32Array; indeks: Uint32Array;
  kemik: Uint16Array; agirlik: Float32Array; // köşe başına 4
}

/** En ayrıntılı seviyeyi (LOD 0) okur ve yüz başına ayrı doku koordinatlarını tek köşe listesine çevirir. */
export function deriOku(b: Buffer): Deri {
  const r = new Okuyucu(b);
  r.str();
  const ad = r.str();
  const fc = r.i32(), vc = r.i32(), uvc = r.i32();
  if (fc < 0 || vc < 0 || uvc < 0 || vc > 65536 || fc > 200000) throw new Error('deri başlığı geçersiz');
  const kon = new Float32Array(vc * 3), nor = new Float32Array(vc * 3);
  for (let i = 0; i < vc; i++) { kon[i * 3] = r.f32(); kon[i * 3 + 1] = r.f32(); kon[i * 3 + 2] = r.f32(); nor[i * 3] = r.f32(); nor[i * 3 + 1] = r.f32(); nor[i * 3 + 2] = r.f32(); }
  // Sıra: köşeler, yüz (köşe) indeksleri, doku koordinatları, yüz doku indeksleri
  const yuz = new Uint16Array(fc * 3); for (let i = 0; i < yuz.length; i++) yuz[i] = r.u16();
  const uvs = new Float32Array(uvc * 2);
  for (let i = 0; i < uvs.length; i++) uvs[i] = r.f32();
  const yuzUv = new Uint16Array(uvc > 0 ? fc * 3 : 0); for (let i = 0; i < yuzUv.length; i++) yuzUv[i] = r.u16();
  // Deri ağırlıkları: bağlanma pozundaki konum + etkileyen kemikler
  const baglanma = new Float32Array(vc * 3);
  const vk = new Uint16Array(vc * 4), va = new Float32Array(vc * 4);
  for (let i = 0; i < vc; i++) {
    baglanma[i * 3] = r.f32(); baglanma[i * 3 + 1] = r.f32(); baglanma[i * 3 + 2] = r.f32();
    const n = r.i32();
    r.atla(8); // dosyaya yazılmış bellek adresleri
    if (n < 0 || n > 64) throw new Error(`köşe ${i}: kemik sayısı geçersiz ${n}`);
    const kem: number[] = []; for (let k = 0; k < n; k++) kem.push(r.i32());
    const agr: number[] = n > 1 ? Array.from({ length: n }, () => r.f32()) : [1];
    // En etkili 4 kemiği al ve normalize et
    const sira = kem.map((k, j) => [k, agr[j] ?? 0] as const).sort((a, c) => c[1] - a[1]).slice(0, 4);
    const top = sira.reduce((s, x) => s + x[1], 0) || 1;
    sira.forEach(([k, w], j) => { vk[i * 4 + j] = k; va[i * 4 + j] = w / top; });
  }
  // Benzersiz (köşe, uv) çiftleri
  const harita = new Map<number, number>();
  const kk: number[] = [], nn: number[] = [], uu: number[] = [], kb: number[] = [], ka: number[] = [];
  const indeks = new Uint32Array(fc * 3);
  for (let i = 0; i < fc * 3; i++) {
    const v = yuz[i], t = yuzUv.length ? yuzUv[i] : 0;
    const anahtar = v * 65536 + t;
    let j = harita.get(anahtar);
    if (j === undefined) {
      j = kk.length / 3; harita.set(anahtar, j);
      kk.push(baglanma[v * 3], baglanma[v * 3 + 1], baglanma[v * 3 + 2]);
      nn.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
      uu.push(uvc ? uvs[t * 2] : 0, uvc ? uvs[t * 2 + 1] : 0);
      for (let q = 0; q < 4; q++) { kb.push(vk[v * 4 + q]); ka.push(va[v * 4 + q]); }
    }
    indeks[i] = j;
  }
  return { ad, konum: new Float32Array(kk), normal: new Float32Array(nn), uv: new Float32Array(uu), indeks, kemik: new Uint16Array(kb), agirlik: new Float32Array(ka) };
}

// ---------------- .n3cpart ----------------
export interface Parca { ad: string; doku: string; deri: string }
export function parcaOku(b: Buffer): Parca {
  const r = new Okuyucu(b);
  const ad = r.str();
  r.i32();
  r.atla(92); // malzeme
  return { ad, doku: r.str(), deri: r.str() };
}

// ---------------- .n3anim ----------------
export interface Animasyon { ad: string; bas: number; son: number; hiz: number; vurus: number }
const DES_ANAHTARI = Uint8Array.from([0xfe, 0xa8, 0x01, 0x97, 0x75, 0x73, 0x97, 0x76]);

/** Her kayıt: [imza 16][uzunluk 4 (BE)][DES (IP/FP'siz) şifreli veri]. XOR katmanı yok. */
export function animOku(b: Buffer): Animasyon[] {
  const n = b.readInt32LE(0);
  let o = 4;
  const liste: Animasyon[] = [];
  for (let i = 0; i < n; i++) {
    const uz = b.readInt32LE(o); o += 4;
    const kayit = b.subarray(o, o + uz); o += uz;
    const boy = kayit.readUInt32BE(16);
    const d = Uint8Array.from(kayit.subarray(20)); desCoz(d, DES_ANAHTARI);
    const v = Buffer.from(d.subarray(0, boy));
    const f = (k: number) => v.readFloatLE(2 + 4 * k);
    // ad: sondaki uzunluk önekli metin
    let ad = '';
    for (let q = v.length - 1; q >= 4; q--) {
      const L = v.readInt32LE(q - 4 + 0);
      if (L > 0 && L === v.length - q && /^[\x20-\x7e]+$/.test(v.toString('latin1', q, v.length))) { ad = v.toString('latin1', q, v.length); break; }
    }
    liste.push({ ad: ad || `anim${i}`, bas: f(1), son: f(2), hiz: f(3), vurus: f(10) || f(6) });
  }
  return liste;
}
