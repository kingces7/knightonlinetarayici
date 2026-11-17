// .fxb (N3FXBundle) okuyucusu — OpenKO 1299 istemci kaynağından birebir (Client/N3Base: N3FXBundle.cpp, N3FXPartBase.cpp,
// N3FXPartParticles.cpp, N3FXPartBillBoard.cpp, N3FXPartBottomBoard.cpp, N3FXPartMesh.cpp). Tahmin yok: her alan kaynaktaki ReadFile sırasıyla okunur.
// Dosya tüketimi tam olmalı (okunan bayt = dosya boyu); bunu fxb.test.ts bütün .fxb dosyalarında doğrular.
//
// Düzen (hepsi little-endian; bool = 1 bayt, BOOL = 4 bayt):
//   Bundle: i32 sürüm, f32 ömür (en çok 10), f32 hız, bool boyutaBağlı,
//           sürüm 0 → 8 yuva, sürüm ≥ 1 → 16 yuva: { i32 tür (0 yok, 1 parçacık, 2 tahta/billboard, 3 mesh, 4 zemin tahtası); tür ≠ 0 ise f32 başlangıçZamanı + parça },
//           sürüm ≥ 2 → bool statik.
//   Parça tabanı: u8 sürüm, u8 tabanSürüm, f32 ömür (en çok 10), u8 tür, 3×vec3 (hız, ivme, dönüşHızı), bool yerde, vec3 konum, i32 dokuAdedi, f32 dokuFps,
//           260 bayt doku adı; tabanSürüm < 2: BOOL alfa, u32 kaynakKarışım, u32 hedefKarışım, f32 solmaÇıkış, f32 solmaGiriş;
//           tabanSürüm ≥ 2: u32 kaynakKarışım, u32 hedefKarışım, f32 solmaÇıkış, f32 solmaGiriş, u32 çizimBayrakları.
//   Doku kareleri: "<dokuAdı>" + 4 haneli sıra (0000…) + ".dxt".
export type Vec3 = [number, number, number];

export const PARCA_TURU = { PARCACIK: 1, TAHTA: 2, MESH: 3, ZEMIN_TAHTASI: 4 } as const;
export const CIZIM = { ALFA: 0x1, CIFT_YUZ: 0x4, ISIK_YOK: 0x40, Z_YAZMA_YOK: 0x100, Z_TAMPON_YOK: 0x400 } as const;

export interface FxParcaTaban {
  /** Taban sürümü ≥ 4: yüksek kalite (HDR) doku adı. */
  hdrDokuAdi: string;
  bicim2062: boolean;
  tur: number; baslangic: number; surum: number; tabanSurum: number; omur: number;
  hiz: Vec3; ivme: Vec3; donusHizi: Vec3; yerde: boolean; konum: Vec3;
  dokuAdedi: number; dokuFps: number; dokuAdi: string;
  kaynakKarisim: number; hedefKarisim: number; solmaCikis: number; solmaGiris: number; cizimBayraklari: number; alfa: boolean;
}
export interface FxParcacik extends FxParcaTaban {
  tur: 1;
  adet: number; boyut: [number, number]; parcacikOmru: [number, number]; olusumMin: Vec3; olusumMaks: Vec3;
  olusumAraligi: number; olusumAdedi: number;
  /** 0 normal, 1 yayılma (açı), 2 toplanma (nokta). */
  yayilimTuru: number; yayilimAcisi?: number; toplanmaNoktasi?: Vec3;
  yon: Vec3; parcacikHizi: number; parcacikIvmesi: number; parcacikDonusHizi: number; yercekimi: number;
  renkAnahtarlari: number[] | null; animasyonluMesh: { fps: number; dosya: string } | null;
  dokuDonusHizi: number; olcekHizX: number; olcekHizY: number;
}
export interface FxTahta extends FxParcaTaban {
  tur: 2; adet: number; boyutX: number; boyutY: number; dokuDongu: boolean; yaricap: number;
  sadeceYDonus: boolean; olcekHizX: number; olcekHizY: number; olcekIvmeX: number; olcekIvmeY: number; matris: number[] | null;
}
export interface FxMesh extends FxParcaTaban {
  tur: 3; sekilDosyasi: string; dokuYonu: number; u: number; v: number; olcekHizi: Vec3; dokuDongu: boolean; olcekIvmesi: Vec3 | null; meshFps: number | null; birimOlcek: Vec3 | null;
}
export interface FxZeminTahtasi extends FxParcaTaban {
  tur: 4; boyutX: number; boyutZ: number; olcekHizX: number; olcekHizZ: number; dokuDongu: boolean; aralik: number;
}
export type FxParca = FxParcacik | FxTahta | FxMesh | FxZeminTahtasi;

export interface FxBundle {
  surum: number; omur: number; hiz: number; boyutaBagli: boolean; statik: boolean;
  parcalar: FxParca[];
}

class Okuyucu {
  konum = 0;
  private b: Buffer;
  constructor(b: Buffer) { this.b = b; }
  atla(n: number): void { this.al(n); }
  get kalan(): number { return this.b.length - this.konum; }
  private al(n: number): number { if (this.konum + n > this.b.length) throw new Error(`dosya sonu aşıldı (konum ${this.konum}, istenen ${n})`); const k = this.konum; this.konum += n; return k; }
  u8(): number { return this.b.readUInt8(this.al(1)); }
  bool(): boolean { return this.u8() !== 0; }
  i32(): number { return this.b.readInt32LE(this.al(4)); }
  u32(): number { return this.b.readUInt32LE(this.al(4)); }
  f32(): number { return this.b.readFloatLE(this.al(4)); }
  vec3(): Vec3 { return [this.f32(), this.f32(), this.f32()]; }
  /** Sabit uzunluklu (NUL'le biten) metin tamponu. */
  metin(n: number): string { const k = this.al(n); let e = k; while (e < k + n && this.b[e] !== 0) e++; return this.b.subarray(k, e).toString('latin1'); }
}

function tabanOku(o: Okuyucu, tur: number, baslangic: number): FxParcaTaban {
  const surum = o.u8(), tabanSurum = o.u8();
  const bicim2062 = tabanSurum >= 3; // DENEYSEL: taban sürümü ≥ 3 olan dosyalar kaynaktaki N3FORMAT_VER_2062 düzenini taşır
  if (bicim2062) { o.i32(); o.i32(); }
  const omur = Math.min(o.f32(), 10);
  const turBayt = o.u8();
  const hiz = o.vec3(), ivme = o.vec3(), donusHizi = o.vec3();
  const yerde = o.bool(), konum = o.vec3();
  const dokuAdedi = o.i32(), dokuFps = o.f32(), dokuAdi = o.metin(260);
  let hdrDokuAdi = '', alfa = false, kaynakKarisim: number, hedefKarisim: number, solmaCikis: number, solmaGiris: number, cizimBayraklari = 0;
  if (tabanSurum < 2) { alfa = o.i32() !== 0; kaynakKarisim = o.u32(); hedefKarisim = o.u32(); solmaCikis = o.f32(); solmaGiris = o.f32(); cizimBayraklari = alfa ? CIZIM.ALFA : 0; }
  else { kaynakKarisim = o.u32(); hedefKarisim = o.u32(); solmaCikis = o.f32(); solmaGiris = o.f32(); cizimBayraklari = o.u32(); alfa = (cizimBayraklari & CIZIM.ALFA) !== 0; if (tabanSurum >= 4) hdrDokuAdi = o.metin(260); }
  if (turBayt !== tur) throw new Error(`parça türü uyuşmuyor: bundle ${tur}, parça ${turBayt}`);
  return { hdrDokuAdi, bicim2062, tur, baslangic, surum, tabanSurum, omur, hiz, ivme, donusHizi, yerde, konum, dokuAdedi, dokuFps, dokuAdi, kaynakKarisim, hedefKarisim, solmaCikis, solmaGiris, cizimBayraklari, alfa };
}

/**
 * KAYNAKTA OLMAYAN alanlar: elimizdeki dosyalar OpenKO 1299 kaynağından yeni sürümlerle yazılmış (parça sürümü ≤ 5 yerine 10'a kadar). Kaynaktaki alanlar aynen okunur;
 * yeni sürümlerin parça SONUNA eklediği baytlar sayılır ve atlanır. Boyutlar bir parçanın başlangıcından sonraki parçanın başlangıcına kadar olan mesafeden ölçüldü
 * (araclar/oyun/fxb-ekstra.ts; her satır yüzlerce örnekte aynı değeri verdi). İçerikleri bilinmiyor; ilk bakışta sıfır/varsayılan görünüyorlar.
 */
const EKSTRA: Record<string, number> = {
  '1/9/3': 23, '1/9/4': 23, '1/10/4': 28,
  '2/8/3': 15, '2/8/4': 15,
  '3/8/3': 3, '3/8/4': 3, '3/9/4': 263,
  '4/2/3': 1, '4/3/4': 2,
};
function ekstraBayt(tur: number, surum: number, tabanSurum: number): number {
  const tablo = EKSTRA[`${tur}/${surum}/${tabanSurum}`];
  if (tablo !== undefined) return tablo;
  return Math.max(0, surum - (tur === PARCA_TURU.ZEMIN_TAHTASI ? 1 : 5)); // sürüm 6-7 (ve 8 olmayan durumlar): sürüm başına 1 bayt
}

function parcaOku(o: Okuyucu, tur: number, baslangic: number): FxParca {
  const t = tabanOku(o, tur, baslangic);
  const p = parcaIc(o, tur, t);
  o.atla(ekstraBayt(tur, t.surum, t.tabanSurum));
  return p;
}
function parcaIc(o: Okuyucu, tur: number, t: FxParcaTaban): FxParca {
  if (tur === PARCA_TURU.PARCACIK) {
    if (t.surum < 3) throw new Error('parçacık parçası sürüm < 3 (kaynak da reddeder)');
    const adet = o.i32();
    const boyut: [number, number] = t.surum < 4 ? (() => { const s = o.f32(); return [s, s] as [number, number]; })() : [o.f32(), o.f32()];
    const parcacikOmru: [number, number] = [o.f32(), o.f32()];
    const olusumMin = o.vec3(), olusumMaks = o.vec3();
    const olusumAraligi = o.f32(), olusumAdedi = o.i32();
    const yayilimTuru = o.u32();
    let yayilimAcisi: number | undefined, toplanmaNoktasi: Vec3 | undefined;
    if (yayilimTuru === 1) yayilimAcisi = o.f32(); else if (yayilimTuru === 2) toplanmaNoktasi = o.vec3();
    const yon = o.vec3(), parcacikHizi = o.f32(), parcacikIvmesi = o.f32(), parcacikDonusHizi = o.f32(), yercekimi = o.f32();
    let renkAnahtarlari: number[] | null = null;
    if (o.bool()) { const n = o.i32(); if (n < 0 || n > 100) throw new Error(`renk anahtarı sayısı ${n}`); renkAnahtarlari = Array.from({ length: n }, () => o.u32()); }
    let animasyonluMesh: { fps: number; dosya: string } | null = null;
    if (o.bool()) animasyonluMesh = { fps: o.f32(), dosya: o.metin(260) };
    let dokuDonusHizi = 0, olcekHizX = 0, olcekHizY = 0;
    if (t.surum >= 5) { dokuDonusHizi = o.f32(); olcekHizX = o.f32(); olcekHizY = o.f32(); }
    return { ...t, tur: 1, adet, boyut, parcacikOmru, olusumMin, olusumMaks, olusumAraligi, olusumAdedi, yayilimTuru, yayilimAcisi, toplanmaNoktasi, yon, parcacikHizi, parcacikIvmesi, parcacikDonusHizi, yercekimi, renkAnahtarlari, animasyonluMesh, dokuDonusHizi, olcekHizX, olcekHizY };
  }
  if (tur === PARCA_TURU.TAHTA) {
    const adet = o.i32(), boyutX = o.f32(), boyutY = o.f32(), dokuDongu = o.bool(), yaricap = o.f32();
    const sadeceYDonus = t.surum >= 3 ? o.bool() : false;
    let olcekHizX = 0, olcekHizY = 0, olcekIvmeX = 0, olcekIvmeY = 0;
    if (t.surum >= 4) { olcekHizX = o.f32(); olcekHizY = o.f32(); olcekIvmeX = o.f32(); olcekIvmeY = o.f32(); }
    let matris: number[] | null = null;
    if (t.surum >= 5) matris = Array.from({ length: 16 }, () => o.f32());
    return { ...t, tur: 2, adet, boyutX, boyutY, dokuDongu, yaricap, sadeceYDonus, olcekHizX, olcekHizY, olcekIvmeX, olcekIvmeY, matris };
  }
  if (tur === PARCA_TURU.MESH) {
    const sekilDosyasi = o.metin(260), dokuYonu = o.u8(), u = o.f32(), v = o.f32(), olcekHizi = o.vec3();
    const dokuDongu = t.surum >= 2 ? o.bool() : false;
    const olcekIvmesi = t.surum >= 3 ? o.vec3() : null;
    const meshFps = t.surum >= 4 ? o.f32() : null;
    const birimOlcek = t.surum >= 5 ? o.vec3() : null;
    return { ...t, tur: 3, sekilDosyasi, dokuYonu, u, v, olcekHizi, dokuDongu, olcekIvmesi, meshFps, birimOlcek };
  }
  const boyutX = o.f32(), boyutZ = o.f32(), olcekHizX = o.f32(), olcekHizZ = o.f32(), dokuDongu = o.bool();
  const aralik = t.surum >= 1 ? o.f32() : 0;
  return { ...t, tur: 4, boyutX, boyutZ, olcekHizX, olcekHizZ, dokuDongu, aralik };
}

/** `.fxb` baytlarını çözer. Hata durumunda istisna fırlatır; tam tüketilmediyse `kalan` döner. */
export function fxbOku(b: Buffer): { bundle: FxBundle; kalan: number } {
  const o = new Okuyucu(b);
  const surum = o.i32(), omur = Math.min(o.f32(), 10), hiz = o.f32(), boyutaBagli = o.bool();
  const parcalar: FxParca[] = [];
  const yuva = surum >= 1 ? 16 : 8;
  for (let i = 0; i < yuva; i++) {
    const tur = o.i32();
    if (tur === 0) continue;
    if (tur < 1 || tur > 4) throw new Error(`bilinmeyen parça türü ${tur} (yuva ${i})`);
    parcalar.push(parcaOku(o, tur, o.f32()));
  }
  const statik = surum >= 2 ? o.bool() : false;

  return { bundle: { surum, omur, hiz, boyutaBagli, statik, parcalar }, kalan: o.kalan };
}

/** Doku kare dosyası yolları: "<dokuAdı>0000.dxt" … */
export function dokuKareleri(p: FxParcaTaban): string[] {
  return Array.from({ length: Math.max(0, p.dokuAdedi) }, (_, i) => `${p.dokuAdi}${String(i).padStart(4, '0')}.dxt`);
}

/** Çözümleme aracı: `konum`'dan başlayan tek bir parçayı EK BAYT KURALI OLMADAN okur; tüketilen bayt sayısını ve parça sürümlerini döndürür. */
export function parcaHamBoyu(b: Buffer, konum: number, tur: number): { boyut: number; surum: number; tabanSurum: number } {
  const o = new Okuyucu(b); o.atla(konum);
  const t = tabanOku(o, tur, 0);
  parcaIc(o, tur, t);
  return { boyut: o.konum - konum, surum: t.surum, tabanSurum: t.tabanSurum };
}
