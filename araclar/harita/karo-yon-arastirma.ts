// Arazi karolarının YÖN kodu (0-7) gerçekte hangi dönüşüm/aynalamaya karşılık geliyor? Veriden çıkarım (doğrulama aracı):
// Her karo iki katman çizer: renk = doku1 + doku2 (orijinal D3DTOP_ADD). Doğru yön eşlemesinde komşu karoların ortak kenarında renkler süreklilik göstermelidir.
// 8 yön kodu için 8 olası dönüşüm (4 döndürme × ayna) denenir; toplam kenar süreksizliği en küçük olan eşleme seçilir.
// Tüm karolara aynı dönüşüm uygulanınca dikiş sürekliliği değişmez; bu yüzden yön 0 "kimlik" sayılır ve öbür yönler ona göre ölçülür.
// Yalnızca geçiş karoları (doku2 olan) ve komşuları değerlendirilir: yön kodu yalnız onlarda 0'dan farklı çıkıyor.
//   node araclar/harita/karo-yon-arastirma.ts 14th_oldmoradon
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';

const ad = process.argv[2] ?? '14th_oldmoradon';
const klasor = path.join(CIKTI_DIZINI, 'web', 'harita', ad);
const bilgi = JSON.parse(fs.readFileSync(path.join(klasor, 'arazi.json'), 'utf8')) as { boyut: number; karoSayisi: number };
const bin = fs.readFileSync(path.join(klasor, 'arazi.bin'));
const karolar = fs.readFileSync(path.join(klasor, 'karolar.bin'));
const n = bilgi.boyut, nn = n * n, k = n - 1, P = 128;
const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const doku1 = new Uint16Array(ab, nn * 4, nn), doku2 = new Uint16Array(ab, nn * 6, nn), yon1 = new Uint8Array(ab, nn * 8, nn), yon2 = new Uint8Array(ab, nn * 9, nn);
const idx = (x: number, z: number) => x * n + z;

/** Dönüşüm t: bit 2 = a'yı aynala, bit 0-1 = döndürme (0:(a,b) 1:(b,1-a) 2:(1-a,1-b) 3:(1-b,a)). */
function don(t: number, a: number, b: number): [number, number] {
  if (t & 4) a = 1 - a;
  switch (t & 3) { case 1: return [b, 1 - a]; case 2: return [1 - a, 1 - b]; case 3: return [1 - b, a]; default: return [a, b]; }
}
function piksel(doku: number, u: number, v: number, o: Float64Array): void {
  const x = Math.min(P - 1, Math.max(0, Math.round(u * (P - 1)))), y = Math.min(P - 1, Math.max(0, Math.round(v * (P - 1))));
  const p = doku * P * P * 4 + (y * P + x) * 4; o[0] += karolar[p]; o[1] += karolar[p + 1]; o[2] += karolar[p + 2];
}
const gecerli1 = (i: number) => doku1[i] < bilgi.karoSayisi, gecerli2 = (i: number) => doku2[i] < bilgi.karoSayisi;
const renk = new Float64Array(3);
/** Karonun (a,b) noktasındaki birleşik renk (doku1 + doku2, 255'e kırpılı). */
function karoRenk(i: number, M: number[], a: number, b: number): [number, number, number] {
  renk.fill(0);
  if (gecerli1(i)) { const [u, v] = don(M[yon1[i] & 7], a, b); piksel(doku1[i], u, v, renk); }
  if (gecerli2(i)) { const [u, v] = don(M[yon2[i] & 7], a, b); piksel(doku2[i], u, v, renk); }
  return [Math.min(255, renk[0]), Math.min(255, renk[1]), Math.min(255, renk[2])];
}
// Değerlendirilecek komşu çiftler: en az biri geçiş karosu (doku2 var) olan, ikisi de geçerli dokulu
const ciftler: [number, number, 0 | 1][] = [];
for (let x = 0; x < k; x++) for (let z = 0; z < k; z++) {
  const i = idx(x, z);
  if (!gecerli1(i)) continue;
  if (x + 1 < k && gecerli1(idx(x + 1, z)) && (gecerli2(i) || gecerli2(idx(x + 1, z)))) ciftler.push([i, idx(x + 1, z), 0]);
  if (z + 1 < k && gecerli1(idx(x, z + 1)) && (gecerli2(i) || gecerli2(idx(x, z + 1)))) ciftler.push([i, idx(x, z + 1), 1]);
}
// Çok büyük haritalarda hız için çiftlerin bir kısmı örneklenir
const MAKS = 60000; const adim = Math.max(1, Math.floor(ciftler.length / MAKS)); const secili = ciftler.filter((_, j) => j % adim === 0);
const ORNEK = 8;
const maliyet = (M: number[]): number => {
  let s = 0;
  for (const [A, B, tur] of secili) for (let j = 0; j < ORNEK; j++) {
    const e = (j + 0.5) / ORNEK;
    const ca = tur === 0 ? karoRenk(A, M, 1, e) : karoRenk(A, M, e, 1), cb = tur === 0 ? karoRenk(B, M, 0, e) : karoRenk(B, M, e, 0);
    s += Math.abs(ca[0] - cb[0]) + Math.abs(ca[1] - cb[1]) + Math.abs(ca[2] - cb[2]);
  }
  return s;
};
const yonSayisi = (d: number): number => { let c = 0; for (let x = 0; x < k; x++) for (let z = 0; z < k; z++) { const i = idx(x, z); if (gecerli1(i) && (yon1[i] & 7) === d) c++; } return c; };
const yon2Sayisi = (d: number): number => { let c = 0; for (let x = 0; x < k; x++) for (let z = 0; z < k; z++) { const i = idx(x, z); if (gecerli2(i) && (yon2[i] & 7) === d) c++; } return c; };
console.log(`${ad}: ${ciftler.length} geçiş komşu çifti (${secili.length} örneklendi)`);
console.log('yon1 karo sayıları:', Array.from({ length: 8 }, (_, d) => yonSayisi(d)).join(' '), '| yon2:', Array.from({ length: 8 }, (_, d) => yon2Sayisi(d)).join(' '));

const KOSE: [number, number][] = [[0, 0], [0, 1], [1, 1], [1, 0]];
function normalle(M: number[]): number[] { // yön 0 kimlik olacak biçimde (ortak dönüşüm çıkarılır)
  const g = [...Array(8).keys()].find((c) => KOSE.every(([a, b]) => { const [u, v] = don(M[0], a, b), [x, y] = don(c, u, v); return Math.abs(x - a) < 1e-9 && Math.abs(y - b) < 1e-9; })) ?? 0;
  return M.map((t) => [...Array(8).keys()].find((c) => KOSE.every(([a, b]) => { const [u, v] = don(t, a, b), [x, y] = don(g, u, v), [p, q] = don(c, a, b); return Math.abs(x - p) < 1e-9 && Math.abs(y - q) < 1e-9; })) ?? -1);
}
// Orijinal client tablosu (N3Terrain.cpp m_fTileDirU/V) → dönüşüm (D3D'de v ters)
const YU = [[0, 1, 0, 1], [0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 1, 0], [0, 0, 1, 1], [0, 1, 0, 1], [1, 1, 0, 0]];
const YV = [[0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 1, 1], [0, 1, 0, 1], [1, 1, 0, 0], [1, 0, 1, 0]];
const idxK = (a: number, b: number) => (a === 0 && b === 0 ? 2 : a === 0 && b === 1 ? 0 : a === 1 && b === 1 ? 1 : 3);
const ham = Array.from({ length: 8 }, (_, d) => [...Array(8).keys()].find((t) => KOSE.every(([a, b]) => { const [u, v] = don(t, a, b); return Math.abs(u - YU[d][idxK(a, b)]) + Math.abs(v - (1 - YV[d][idxK(a, b)])) < 1e-9; })) ?? -1);
const orijinal = ham.every((t) => t >= 0) ? normalle(ham) : null;
// Eski client tablosu (yonUvEski): (a,b) → d=1:(b,1-a) 2:(1-a,1-b) 3:(1-b,a) 4:(1-a,b) 5:(a,1-b) 6:(b,a) 7:(1-b,1-a)
const eskiF: ((a: number, b: number) => [number, number])[] = [(a, b) => [a, b], (a, b) => [b, 1 - a], (a, b) => [1 - a, 1 - b], (a, b) => [1 - b, a], (a, b) => [1 - a, b], (a, b) => [a, 1 - b], (a, b) => [b, a], (a, b) => [1 - b, 1 - a]];
const eski = eskiF.map((f) => [...Array(8).keys()].find((t) => KOSE.every(([a, b]) => { const [u, v] = don(t, a, b), [p, q] = f(a, b); return Math.abs(u - p) + Math.abs(v - q) < 1e-9; })) ?? -1);

console.log('kimlik (hepsi 0)      :', maliyet([0, 0, 0, 0, 0, 0, 0, 0]).toFixed(0));
if (orijinal) console.log('orijinal tablo        :', maliyet(orijinal).toFixed(0), JSON.stringify(orijinal));
if (eski.every((t) => t >= 0)) console.log('eski tablo (normalli) :', maliyet(normalle(eski)).toFixed(0), JSON.stringify(normalle(eski)));
console.log('dönüşüm=yön indeksi [0..7]:', maliyet([0, 1, 2, 3, 4, 5, 6, 7]).toFixed(0), '(orijinal tablonun doğru eşlenmiş hali: rotasyon yönü D3D v-ters için çevrilmiş)');
if (process.env.SADECE) process.exit(0);
let enIyi: number[] = orijinal ? [...orijinal] : [0, 0, 0, 0, 0, 0, 0, 0], enIyiM = maliyet(enIyi);
const dene = (bas: number[]) => {
  const M = [...bas]; M[0] = 0; let m = maliyet(M), iyilesti = true;
  while (iyilesti) { iyilesti = false; for (let d = 1; d < 8; d++) for (let t = 0; t < 8; t++) { if (t === M[d]) continue; const e = M[d]; M[d] = t; const m2 = maliyet(M); if (m2 < m - 1e-9) { m = m2; iyilesti = true; } else M[d] = e; } }
  if (m < enIyiM) { enIyiM = m; enIyi = [...M]; }
};
if (orijinal) dene(orijinal);
for (let r = 0; r < 4; r++) dene([0, ...Array.from({ length: 7 }, () => Math.floor(Math.random() * 8))]);
console.log('veriden en iyi eşleme :', enIyiM.toFixed(0), JSON.stringify(enIyi), '(dönüşüm: bit2=ayna, bit0-1=döndürme; yön 0 = kimlik)');
