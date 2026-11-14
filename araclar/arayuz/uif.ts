// N3 arayüz (UIF) dosyası okuyucusu. Kaynak: Anti-cheat "Pearl Guard" içindeki N3BASE/N3UI*.cpp (Load fonksiyonları).
// Ayrıntı: docs/formatlar/uif.md
import { Okuyucu } from '../model/n3.ts';
import { lilithOtomatikCoz } from './lilith.ts';

export const UI_TUR = { base: 0, button: 1, static: 2, progress: 3, image: 4, scrollbar: 5, string: 6, trackbar: 7, edit: 8, area: 9, tooltip: 10, icon: 11, iconManager: 12, iconSlot: 13, list: 14 } as const;
export type Kutu = [number, number, number, number]; // sol, üst, sağ, alt

export interface UiDugum {
  tur: number;
  ad: string;
  id: string;
  kutu: Kutu;
  tasi: Kutu;
  stil: number;
  ayrik: number; // "reserved": buton durumu (0 normal, 1 basılı, 2 üstünde, 3 pasif), ilerleme çubuğu (0 arka, 1 ön) vb.
  ipucu: string;
  cocuklar: UiDugum[];
  // Image
  doku?: string; uv?: Kutu; animKare?: number;
  // Button
  tikla?: Kutu;
  // String / List
  yazi?: { font: string; boy: number; bayrak: number; renk: number; metin: string };
  // Area
  alanTuru?: number;
}

// Çocuk sayısı: sürüm 1264+ için 2×int16, öncesi int32 — küçük sayılarda baytlar aynı. String sonunda ek int YOK (bu dosyalar eski sürüm).
const SURUM_1264 = true;

function kutuOku(r: Okuyucu): Kutu { return [r.i32(), r.i32(), r.i32(), r.i32()]; }
function metinOku(r: Okuyucu): string {
  const n = r.i32();
  if (n < 0 || n > 4096 || r.o + n > r.b.length) throw new Error(`UIF: geçersiz metin uzunluğu ${n} (ofset ${r.o - 4})`);
  const s = r.b.toString('latin1', r.o, r.o + n); r.o += n; return s;
}

function dugumOku(r: Okuyucu, tur: number): UiDugum {
  try { return dugumOku2(r, tur); } catch (e) { throw new Error(`${(e as Error).message} <tür ${tur}`); }
}

function dugumOku2(r: Okuyucu, tur: number): UiDugum {
  const d: UiDugum = { tur, ad: '', id: '', kutu: [0, 0, 0, 0], tasi: [0, 0, 0, 0], stil: 0, ayrik: 0, ipucu: '', cocuklar: [] };
  d.ad = metinOku(r);
  let sayi: number, ek = 0;
  if (SURUM_1264) { sayi = r.b.readInt16LE(r.o); ek = r.b.readInt16LE(r.o + 2); r.o += 4; } else sayi = r.i32();
  if (sayi < 0 || sayi > 5000) throw new Error(`UIF: çocuk sayısı ${sayi}`);
  for (let i = 0; i < sayi; i++) { const t = r.i32(); d.cocuklar.push(dugumOku(r, cocukTuru(t, r.o - 4))); }
  d.id = metinOku(r);
  d.kutu = kutuOku(r); d.tasi = kutuOku(r);
  d.stil = r.u32(); d.ayrik = r.u32();
  d.ipucu = metinOku(r); metinOku(r); metinOku(r); // ipucu, açılış sesi, kapanış sesi
  if (ek) r.o += ek; // çocuk sayısının yanındaki ikinci int16: bu kadar bayt tür-özel alanlardan önce gelir (zeros)
  switch (tur) {
    case UI_TUR.image:
      d.doku = metinOku(r); d.uv = [r.f32(), r.f32(), r.f32(), r.f32()]; d.animKare = r.f32(); break;
    case UI_TUR.button:
      d.tikla = kutuOku(r); metinOku(r); metinOku(r); break;
    case UI_TUR.static: metinOku(r); break;
    case UI_TUR.edit: metinOku(r); metinOku(r); break; // Static sesi + yazma sesi
    case UI_TUR.string: {
      const font = metinOku(r); const boy = r.u32(), bayrak = r.u32(); const renk = r.u32(); const metin = metinOku(r);
      if (ek) r.i32(); // sürüm 1264+ dosyalarda yazının sonunda ek int
      d.yazi = { font, boy, bayrak, renk, metin }; break;
    }
    case UI_TUR.list: {
      const font = metinOku(r); const boy = r.u32(), renk = r.u32(), kalin = r.u32(), italik = r.u32();
      d.yazi = { font, boy, bayrak: (kalin ? 1 : 0) | (italik ? 2 : 0), renk, metin: '' }; break;
    }
    case UI_TUR.area: d.alanTuru = r.i32(); break;
    default: break; // base, progress, scrollbar, trackbar: ek alan yok
  }
  return d;
}

function cocukTuru(t: number, ofset = -1): number {
  if (t < 0 || t > 14) throw new Error(`UIF: bilinmeyen arayüz türü ${t} (ofset ${ofset})`);
  return t;
}

/** Çözülmüş (düz) UIF verisinden kök düğümü okur. Dosyanın tamamı tüketilmelidir. */
export function uifOku(veri: Buffer): UiDugum {
  const r = new Okuyucu(veri);
  const kok = dugumOku(r, UI_TUR.base);
  if (r.o !== veri.length) throw new Error(`UIF: ${veri.length - r.o} bayt artık var (ofset ${r.o})`);
  return kok;
}

/** `.lilith` dosyasını çözüp okur. */
export function lilithOku(dosya: Buffer): UiDugum { return uifOku(lilithOtomatikCoz(dosya)); }
