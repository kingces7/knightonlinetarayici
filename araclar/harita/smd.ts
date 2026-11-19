// Server harita dosyası (.smd). Kaynak: Server/shared/SMDFile.cpp + N3BASE/N3ShapeMgr.cpp.
//   int32 N, float birim, float yukseklik[N*N]                       (sıra x*N+z)
//   float genislik, float uzunluk, int32 yuzSayisi, float3 koseler[yuzSayisi*3]   (çarpışma üçgenleri)
//   hücreler: z=0.., x=0.. (her biri 16 m): uint32 var; varsa
//       int32 sekilSayisi, uint16 sekil[sekilSayisi],
//       4×4 alt hücre (z dış döngü, x iç): int32 uceSayisi, uint32 koseIndeksi[uceSayisi*3]
//   int32 nesneOlaySayisi, her biri 24 bayt {int32 sahip, int16 indeks, int16 tur, int16 npc, int16 durum, float x,y,z}
//   int16 karoOlay[N*N]     (0 = yürünebilir; >=2 = olay/kapı; diğerleri engel)
//   int32 dogusSayisi, her biri 20 bayt {float x,y,z, alanZ, alanX}   (nokta numarası = sıra)
//   int32 kapiSayisi, her biri 320 bayt (_WARP_INFO, hizalamasız: id@0 ad@2 duyuru@34 ücret@292 bölge@296 x,y,z,r@300 millet@316)
export interface SmdDogus { x: number; y: number; z: number; alanZ: number; alanX: number; nokta: number }
export interface SmdKapi { id: number; ad: string; duyuru: string; bolge: number; x: number; y: number; z: number; r: number; millet: number; ucret: number }
export interface Smd {
  boyut: number; birim: number;
  yukseklik: Float32Array;
  /**
   * Çarpışma üçgenleri: 9 float (3 köşe × xyz) × yuz sayısı. Sunucu koordinatı (x, y yukarı, z).
   * Bozuk üçgenler de burada kalır (`hucreler` üçgen sırasına göre indeksler); dışa aktarırken `saglamYuzler` kullan.
   */
  yuzler: Float32Array;
  /** Bozuk üçgen sayısı (köşe değeri sonlu değil ya da |değer| > YUZ_ESIK). */
  bozukYuz: number;
  /** Hücre (16 m) başına alt hücre (4 m) başına üçgen indeksleri. Anahtar: hücre sırası → 16 alt hücre. */
  hucreler: Map<number, Uint32Array[]>;
  nesneOlaylari: { sahip: number; indeks: number; tur: number; npc: number; durum: number; x: number; y: number; z: number }[];
  karoOlay: Int16Array;
  dogus: SmdDogus[];
  kapilar: SmdKapi[];
}

const CELL = 16;
const WARP_BOYU = 320; // hizalamasız _WARP_INFO
/** Haritalar en çok 4097×4 ≈ 16 km; bundan büyük ya da sonlu olmayan köşe değeri bozuk veridir (freezone_a ailesinde 1586 üçgen). */
export const YUZ_ESIK = 1e5;

/** `yuzler` içindeki i. üçgen bozuk mu (köşe değerlerinden biri NaN/sonsuz ya da |değer| > YUZ_ESIK)? */
export function bozukYuzMu(yuzler: Float32Array, i: number): boolean {
  for (let k = i * 9; k < i * 9 + 9; k++) { const v = yuzler[k]; if (!Number.isFinite(v) || Math.abs(v) > YUZ_ESIK) return true; }
  return false;
}

/** Bozuk üçgenleri atar; dışa aktarım (carpisma.bin) için. Dönen dizi `hucreler` indeksleriyle uyumlu DEĞİLDİR. */
export function saglamYuzler(yuzler: Float32Array): { yuzler: Float32Array; atlanan: number } {
  const n = yuzler.length / 9;
  const sag = new Float32Array(yuzler.length);
  let yaz = 0;
  for (let i = 0; i < n; i++) { if (bozukYuzMu(yuzler, i)) continue; sag.set(yuzler.subarray(i * 9, i * 9 + 9), yaz); yaz += 9; }
  return { yuzler: sag.slice(0, yaz), atlanan: n - yaz / 9 };
}

export function smdOku(b: Buffer): Smd {
  let o = 0;
  const i32 = () => { const v = b.readInt32LE(o); o += 4; return v; };
  const f32 = () => { const v = b.readFloatLE(o); o += 4; return v; };
  const boyut = i32(), birim = f32();
  if (boyut < 2 || boyut > 4097) throw new Error(`Geçersiz harita boyu ${boyut}`);
  const yukseklik = new Float32Array(boyut * boyut);
  for (let i = 0; i < yukseklik.length; i++) yukseklik[i] = f32();
  const genislik = f32(), uzunluk = f32();
  const yuzSayisi = i32();
  if (yuzSayisi < 0 || o + yuzSayisi * 36 > b.length) throw new Error('Çarpışma yüzleri okunamadı');
  const yuzler = new Float32Array(yuzSayisi * 9);
  for (let i = 0; i < yuzler.length; i++) yuzler[i] = f32();
  let bozukYuz = 0;
  for (let i = 0; i < yuzSayisi; i++) if (bozukYuzMu(yuzler, i)) bozukYuz++;
  const hucreler = new Map<number, Uint32Array[]>();
  const hx = Math.ceil(genislik / CELL);
  let z = 0;
  for (let fz = 0; fz < uzunluk; fz += CELL, z++) {
    let x = 0;
    for (let fx = 0; fx < genislik; fx += CELL, x++) {
      if (!b.readUInt32LE(o)) { o += 4; continue; }
      o += 4;
      const sekil = i32();
      o += sekil * 2;
      const alt: Uint32Array[] = [];
      for (let zz = 0; zz < 4; zz++) for (let xx = 0; xx < 4; xx++) {
        const n = i32();
        if (n < 0 || o + n * 12 > b.length) throw new Error('Alt hücre okunamadı');
        const ind = new Uint32Array(n * 3);
        for (let k = 0; k < n * 3; k++) { ind[k] = b.readUInt32LE(o); o += 4; }
        alt[xx * 4 + zz] = ind; // [x][z] düzeni (SubCells[x][z])
      }
      hucreler.set(x + z * hx, alt);
    }
  }
  const nesneSayisi = i32();
  const nesneOlaylari = [];
  for (let i = 0; i < nesneSayisi; i++) {
    nesneOlaylari.push({
      sahip: b.readInt32LE(o), indeks: b.readInt16LE(o + 4), tur: b.readInt16LE(o + 6), npc: b.readInt16LE(o + 8),
      durum: b.readInt16LE(o + 10), x: b.readFloatLE(o + 12), y: b.readFloatLE(o + 16), z: b.readFloatLE(o + 20),
    });
    o += 24;
  }
  const karoOlay = new Int16Array(boyut * boyut);
  for (let i = 0; i < karoOlay.length; i++) { karoOlay[i] = b.readInt16LE(o); o += 2; }
  const dogus: SmdDogus[] = [];
  const kapilar: SmdKapi[] = [];
  if (o + 4 <= b.length) {
    const n = i32();
    for (let i = 0; i < n && o + 20 <= b.length; i++) {
      dogus.push({ x: b.readFloatLE(o), y: b.readFloatLE(o + 4), z: b.readFloatLE(o + 8), alanZ: b.readFloatLE(o + 12), alanX: b.readFloatLE(o + 16), nokta: i });
      o += 20;
    }
  }
  if (o + 4 <= b.length) {
    const n = i32();
    // Eski dosyalarda adlar Korece (CP949/EUC-KR) kodlu.
    const korece = new TextDecoder('euc-kr');
    const cs = (a: number, c: number) => { const m = b.subarray(a, a + c); const e = m.indexOf(0); return korece.decode(e < 0 ? m : m.subarray(0, e)); };
    for (let i = 0; i < n && o + WARP_BOYU <= b.length; i++) {
      kapilar.push({
        id: b.readInt16LE(o), ad: cs(o + 2, 32), duyuru: cs(o + 34, 256), ucret: b.readUInt32LE(o + 292),
        bolge: b.readInt16LE(o + 296), x: b.readFloatLE(o + 300), y: b.readFloatLE(o + 304), z: b.readFloatLE(o + 308),
        r: b.readFloatLE(o + 312), millet: b.readInt16LE(o + 316),
      });
      o += WARP_BOYU;
    }
  }
  return { boyut, birim, yukseklik, yuzler, bozukYuz, hucreler, nesneOlaylari, karoOlay, dogus, kapilar };
}
