// Canavar ganimet kuralları: sunucudan alınan ham veri (ganimet-ham.json: araclar/sunucu/ganimet-disa-aktar.ps1) + düşebilecek eşyaların bilgisi ve simgeleri.
//   npm run ganimet   -> donusturulmus/web/oyun/ganimet.json  { canavar, gruplar, esyalar: { <no>: {...} } }  ve  web/esya/ikon/<simge>.png
// Eşya sütunları (Item_Org_us.tbl): 0 no, 2 ad, 3 açıklama, 7 simge, 10 tür, 12 yuva, 15 hasar, 16 vuruş gecikmesi, 20 alış fiyatı, 22 savunma.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';
import { simgeYolu } from './esyalar.ts';

const SILAH = new Set([11, 21, 22, 31, 32, 41, 42, 51, 52, 61, 62, 70, 71, 110, 140, 181]);
const ZIRH = new Set([60, 210, 220, 230, 240]);

interface Ham { canavar: Record<string, { para: number; ogeler: { no: number; yuzde: number }[] }>; gruplar: Record<string, number[]> }

export function ganimetYaz(): { esya: number; eksik: number } {
  const od = new OyunDosyalari();
  const klasor = path.join(CIKTI_DIZINI, 'web', 'oyun');
  const ham = JSON.parse(fs.readFileSync(path.join(klasor, 'ganimet-ham.json'), 'utf8')) as Ham;
  const tablo = tbldenOku(od.oku('Data/Item_Org_us.tbl'), 'windows-1252').satirlar;
  const ikonKlasor = path.join(CIKTI_DIZINI, 'web', 'esya', 'ikon');
  fs.mkdirSync(ikonKlasor, { recursive: true });
  const numaralar = new Set<number>();
  for (const c of Object.values(ham.canavar)) for (const o of c.ogeler) if (o.no >= 100000000) numaralar.add(o.no);
  for (const g of Object.values(ham.gruplar)) for (const n of g) numaralar.add(n);
  const esyalar: Record<string, unknown> = {};
  let eksik = 0;
  for (const no of numaralar) {
    const s = tablo.find((x) => Number(x[0]) === no) ?? tablo.find((x) => Number(x[0]) === no - (no % 1000));
    if (!s) { eksik++; continue; }
    const simge = Number(s[7]), tur = Number(s[10]);
    let simgeAd = '';
    const yol = simgeYolu(simge);
    if (od.var(yol)) {
      try { const d = dxtOku(od.oku(yol)); fs.writeFileSync(path.join(ikonKlasor, `${simge}.png`), pngKodla(d.genislik, d.yukseklik, rgbayaCevir(d))); simgeAd = `ikon/${simge}.png`; } catch { /* simge çözülemedi */ }
    }
    esyalar[String(no)] = {
      no, ad: String(s[2]), aciklama: String(s[3]).replace(/\|\s*/g, ' '), simge: simgeAd,
      tur: SILAH.has(tur) ? 'silah' : ZIRH.has(tur) ? 'zirh' : 'sarf', tip: tur, yuva: Number(s[12]),
      hasar: Number(s[15]), gecikme: Number(s[16]), savunma: Number(s[22]), fiyat: Number(s[20]),
    };
  }
  fs.writeFileSync(path.join(klasor, 'ganimet.json'), JSON.stringify({ canavar: ham.canavar, gruplar: ham.gruplar, esyalar }));
  od.kapat();
  return { esya: Object.keys(esyalar).length, eksik };
}

if (process.argv[1]?.endsWith('ganimet.ts')) { try { const r = ganimetYaz(); console.log(`${r.esya} ganimet eşyası (${r.eksik} tabloda yok)`); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
