// Arazi karolarını yukarıdan çizer ve komşu karoların dikişlerini ölçer (bozuk görünen karoları bulmak için).
//   node harita/karo-denetim.ts <harita> pencere <tx0> <tz0> <genislik> <yukseklik> [--hip=O|C|E] [--px=24] [--cikti=ad.png]
//   node harita/karo-denetim.ts <harita> olc   [--hip=O|C|E]        -> bütün haritanın dikiş istatistiği, en kötü karo grupları
// Hipotezler (karo yön kodu → karonun (a,b) noktasından doku (u,v) dönüşümü; a = +x, b = +z, v aşağı doğru artar):
//   O = orijinal N3Terrain tablosu (köşe UV'leri birebir; araclar/harita/eslesme... docs/formatlar/model.md), C = client shader'ının şimdiki hali, E = eski tablo.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { pngKodla } from '../ortak/png.ts';

export type Don = (yon: number, a: number, b: number) => [number, number];

/** Orijinal N3Terrain.cpp `m_fTileDirU/V[8][4]` (sütunlar [LT, RT, LB, RB]). */
export const YU = [[0, 1, 0, 1], [0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 1, 0], [0, 0, 1, 1], [0, 1, 0, 1], [1, 1, 0, 0]];
export const YV = [[0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 1, 1], [0, 1, 0, 1], [1, 1, 0, 0], [1, 0, 1, 0]];
/** Orijinal tablo: A=(x,z)=[2], B=(x,z+1)=[0], C=(x+1,z+1)=[1], D=(x+1,z)=[3]; dörtgen üzerinde doğrusal. */
export const hipO: Don = (d, a, b) => {
  const uA = YU[d & 7][2], vA = YV[d & 7][2], uB = YU[d & 7][0], vB = YV[d & 7][0], uD = YU[d & 7][3], vD = YV[d & 7][3];
  return [uA + (uD - uA) * a + (uB - uA) * b, vA + (vD - vA) * a + (vB - vA) * b];
};
/** Client shader'ının (yonUv) şimdiki hali: yön numarası = dönüşüm numarası. */
export const hipC: Don = (yon, a0, b) => {
  const t = yon & 7; const a = t & 4 ? 1 - a0 : a0; const r = t & 3;
  const uv: [number, number] = r === 1 ? [b, 1 - a] : r === 2 ? [1 - a, 1 - b] : r === 3 ? [1 - b, a] : [a, b];
  return [uv[0], 1 - uv[1]];
};
/** Eski client tablosu (yonUvEski). */
export const hipE: Don = (yon, a, b) => {
  const f: [number, number][] = [[a, b], [b, 1 - a], [1 - a, 1 - b], [1 - b, a], [1 - a, b], [a, 1 - b], [b, a], [1 - b, 1 - a]];
  const [u, v] = f[yon & 7]; return [u, 1 - v];
};
/** Verilen 8 dönüşüm numarasından (bit2 ayna, bit0-1 döndürme) bir hipotez kurar. */
export function hipDonusum(M: number[]): Don {
  return (yon, a0, b) => hipC(M[yon & 7], a0, b);
}
export const HIPOTEZ: Record<string, Don> = { O: hipO, C: hipC, E: hipE };

export interface Harita {
  ad: string; n: number; k: number; karoSayisi: number; P: number;
  doku1: Uint16Array; doku2: Uint16Array; yon1: Uint8Array; yon2: Uint8Array; yukseklik: Float32Array; karolar: Uint8Array;
}
export function haritaYukle(ad: string): Harita {
  const klasor = path.join(CIKTI_DIZINI, 'web', 'harita', ad);
  const bilgi = JSON.parse(fs.readFileSync(path.join(klasor, 'arazi.json'), 'utf8')) as { boyut: number; karoSayisi: number; atlas: { karoPx: number } };
  const bin = fs.readFileSync(path.join(klasor, 'arazi.bin'));
  const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const n = bilgi.boyut, nn = n * n;
  return {
    ad, n, k: n - 1, karoSayisi: bilgi.karoSayisi, P: bilgi.atlas.karoPx,
    yukseklik: new Float32Array(ab, 0, nn), doku1: new Uint16Array(ab, nn * 4, nn), doku2: new Uint16Array(ab, nn * 6, nn),
    yon1: new Uint8Array(ab, nn * 8, nn), yon2: new Uint8Array(ab, nn * 9, nn), karolar: new Uint8Array(fs.readFileSync(path.join(klasor, 'karolar.bin'))),
  };
}

/** Karonun (a,b) noktasındaki renk (en yakın texel; doku1 + doku2 ADD, 255'e kırpılı). Geçersiz doku1 → null. */
export function karoRengi(h: Harita, tx: number, tz: number, hip: Don, a: number, b: number, o: Uint8Array | number[]): boolean {
  const i = tx * h.n + tz, P = h.P;
  if (h.doku1[i] >= h.karoSayisi) return false;
  const ornek = (doku: number, yon: number, ekle: boolean) => {
    const [u, v] = hip(yon, a, b);
    const x = Math.min(P - 1, Math.max(0, Math.floor(u * P))), y = Math.min(P - 1, Math.max(0, Math.floor(v * P)));
    const p = (doku * P * P + y * P + x) * 4;
    for (let c = 0; c < 3; c++) o[c] = ekle ? Math.min(255, o[c] + h.karolar[p + c]) : h.karolar[p + c];
  };
  ornek(h.doku1[i], h.yon1[i] & 7, false);
  if (h.doku2[i] < h.karoSayisi) ornek(h.doku2[i], h.yon2[i] & 7, true);
  return true;
}

export function pencereCiz(h: Harita, hip: Don, tx0: number, tz0: number, W: number, H: number, S: number): Buffer {
  const gen = W * S, yuk = H * S, rgba = new Uint8Array(gen * yuk * 4), o = [0, 0, 0];
  for (let Y = 0; Y < yuk; Y++) for (let X = 0; X < gen; X++) {
    const tx = tx0 + Math.floor(X / S), tz = tz0 + (H - 1 - Math.floor(Y / S));
    const a = ((X % S) + 0.5) / S, b = 1 - ((Y % S) + 0.5) / S;
    const p = (Y * gen + X) * 4;
    if (tx < 0 || tz < 0 || tx >= h.k || tz >= h.k || !karoRengi(h, tx, tz, hip, a, b, o)) { rgba[p] = 255; rgba[p + 1] = 0; rgba[p + 2] = 255; rgba[p + 3] = 255; continue; }
    rgba[p] = o[0]; rgba[p + 1] = o[1]; rgba[p + 2] = o[2]; rgba[p + 3] = 255;
  }
  return pngKodla(gen, yuk, rgba);
}

/** İki komşu karonun ortak kenarındaki ortalama renk farkı (0-255, kanal başına). tur 0: B = (x+1, z); tur 1: B = (x, z+1). */
export function dikisMaliyeti(h: Harita, A: [number, number], tur: 0 | 1, hip: Don, N = 8): number {
  const ca = [0, 0, 0], cb = [0, 0, 0]; let s = 0;
  const eps = 0.5 / h.P;
  for (let j = 0; j < N; j++) {
    const e = (j + 0.5) / N;
    const okA = tur === 0 ? karoRengi(h, A[0], A[1], hip, 1 - eps, e, ca) : karoRengi(h, A[0], A[1], hip, e, 1 - eps, ca);
    const okB = tur === 0 ? karoRengi(h, A[0] + 1, A[1], hip, eps, e, cb) : karoRengi(h, A[0], A[1] + 1, hip, e, eps, cb);
    if (!okA || !okB) return -1;
    s += (Math.abs(ca[0] - cb[0]) + Math.abs(ca[1] - cb[1]) + Math.abs(ca[2] - cb[2])) / 3;
  }
  return s / N;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('karo-denetim.ts')) {
  const arg = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const bayrak = (ad: string, vars: string) => process.argv.find((x) => x.startsWith(`--${ad}=`))?.split('=')[1] ?? vars;
  const ad = arg[0], komut = arg[1];
  if (!ad || !komut) { console.log('Kullanım: node harita/karo-denetim.ts <harita> pencere <tx0> <tz0> <w> <h> | olc'); process.exit(1); }
  const h = haritaYukle(ad);
  const hip = HIPOTEZ[bayrak('hip', 'C')];
  if (komut === 'pencere') {
    const [tx0, tz0, W, H] = arg.slice(2, 6).map(Number);
    const S = Number(bayrak('px', '24'));
    const dosya = path.join(CIKTI_DIZINI, 'onizleme', bayrak('cikti', `${ad}_${bayrak('hip', 'C')}_${tx0}_${tz0}.png`));
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    fs.writeFileSync(dosya, pencereCiz(h, hip, tx0, tz0, W, H, S));
    console.log(dosya);
  } else if (komut === 'olc') {
    for (const [ad2, f] of Object.entries(HIPOTEZ)) {
      let say = 0, top = 0, kotu = 0;
      for (let x = 0; x < h.k - 1; x += 1) for (let z = 0; z < h.k - 1; z += 1) {
        if ((x * 31 + z * 17) % 7) continue; // örnekle
        for (const tur of [0, 1] as const) { const m = dikisMaliyeti(h, [x, z], tur, f); if (m < 0) continue; say++; top += m; if (m > 40) kotu++; }
      }
      console.log(`${ad} hipotez ${ad2}: ${say} dikiş, ortalama fark ${(top / say).toFixed(2)}, kötü (>40) ${kotu} (%${((kotu / say) * 100).toFixed(2)})`);
    }
  }
}
