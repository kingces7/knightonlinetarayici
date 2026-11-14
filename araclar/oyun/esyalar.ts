// Tek oyunculu mod için ganimet listesi: Item_Org_us.tbl'den düşük seviye silah/zırhları ve simgelerini çıkarır.
//   npm run esyalar   -> donusturulmus/web/esya/esyalar.json + ikon/<simge>.png
// Eşya adları ve açıklamaları oyunun İngilizce tablosundan aynen alınır.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';

const SILAH = new Set([11, 21, 22, 31, 32, 41, 42, 51, 52, 61, 62, 70, 71, 110]);
const ZIRH = new Set([210, 220, 230, 240]);

export function simgeYolu(simge: number): string {
  const s = String(simge).padStart(8, '0');
  return `UI/itemicon_${s[0]}_${s.slice(1, 5)}_${s.slice(5, 7)}_${s[7]}.dxt`;
}

function main(): number {
  const od = new OyunDosyalari();
  const satirlar = tbldenOku(od.oku('Data/Item_Org_us.tbl'), 'windows-1252').satirlar;
  const hedef = path.join(CIKTI_DIZINI, 'web', 'esya');
  fs.mkdirSync(path.join(hedef, 'ikon'), { recursive: true });
  const secilen: Record<string, unknown>[] = [];
  const gorulenAd = new Set<string>();
  for (const s of satirlar) {
    const [no, , ad, aciklama] = s as [number, number, string, string];
    const simge = Number(s[7]), tur = Number(s[10]), hasar = Number(s[15]), fiyat = Number(s[20]), savunma = Number(s[22]);
    const silah = SILAH.has(tur), zirh = ZIRH.has(tur);
    if (!(silah || zirh) || !/^[\x20-\x7e]+$/.test(ad) || gorulenAd.has(ad)) continue;
    if (fiyat <= 0 || fiyat > 60000) continue;
    const yol = simgeYolu(simge);
    if (!od.var(yol)) continue;
    try {
      const d = dxtOku(od.oku(yol));
      fs.writeFileSync(path.join(hedef, 'ikon', `${simge}.png`), pngKodla(d.genislik, d.yukseklik, rgbayaCevir(d)));
    } catch { continue; }
    gorulenAd.add(ad);
    secilen.push({ no, ad, aciklama: aciklama.replace(/\|\s*/g, ' '), simge: `ikon/${simge}.png`, tur: silah ? 'silah' : 'zirh', hasar, savunma, fiyat });
    if (secilen.length >= 120) break;
  }
  fs.writeFileSync(path.join(hedef, 'esyalar.json'), JSON.stringify(secilen, null, 1));
  console.log(`${secilen.length} eşya -> ${hedef}`);
  od.kapat();
  return 0;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('esyalar.ts')) {
  try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
}
