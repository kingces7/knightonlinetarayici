// Oyun dokusunu (.dxt) glTF için PNG'ye çevirir ve saydamlık türünü belirler.
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { dxtOku, rgbayaCevir, type Doku } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';

export interface PngDoku { png: Buffer; alfa: 'OPAQUE' | 'MASK' | 'BLEND'; sifreli: boolean }

/** Sürüm 7 (şifreli) dokular dxtOku içinde otomatik çözülür; `sifreli` alanı geriye uyumluluk için duruyor. */
export function dokuPng(od: OyunDosyalari, yol: string, enFazla = 512): PngDoku | null {
  if (!yol || !od.var(yol)) return null;
  let d: Doku;
  try { d = dxtOku(od.oku(yol)); } catch { return null; }
  let rgba = rgbayaCevir(d);
  let g = d.genislik, y = d.yukseklik;
  while (g > enFazla || y > enFazla) { rgba = yariyaIndir(rgba, g, y); g >>= 1; y >>= 1; }
  let saydam = 0, yari = 0;
  for (let i = 3; i < rgba.length; i += 4) { if (rgba[i] < 128) saydam++; if (rgba[i] > 8 && rgba[i] < 247) yari++; }
  const alfa = yari > rgba.length / 4 / 20 ? 'BLEND' : saydam > 0 ? 'MASK' : 'OPAQUE';
  return { png: pngKodla(g, y, rgba), alfa, sifreli: false };
}

function yariyaIndir(rgba: Uint8Array, g: number, y: number): Uint8Array {
  const ng = g >> 1, ny = y >> 1, c = new Uint8Array(ng * ny * 4);
  for (let j = 0; j < ny; j++) for (let i = 0; i < ng; i++) for (let k = 0; k < 4; k++) {
    const t = (a: number, b: number) => rgba[((j * 2 + b) * g + i * 2 + a) * 4 + k];
    c[(j * ng + i) * 4 + k] = (t(0, 0) + t(1, 0) + t(0, 1) + t(1, 1)) >> 2;
  }
  return c;
}
