// NPC mağazaları: satış gruplarındaki (gruplar.json: araclar/sunucu/magaza-disa-aktar.ps1) eşyaların bilgisini ve simgelerini dışa aktarır.
//   npm run magaza   -> donusturulmus/web/magaza/magaza.json  { gruplar, esyalar: { <no>: {...} } }  ve  web/esya/ikon/<simge>.png
// Eşya sütunları (Item_Org_us.tbl): 0 no, 2 ad, 3 açıklama, 7 simge, 10 tür, 12 yuva, 15 hasar, 16 vuruş gecikmesi, 20 alış fiyatı, 22 savunma.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';
import { simgeYolu } from './esyalar.ts';
const SIMGE_DUZELTME = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'simge-duzeltme.json'), 'utf8')) as Record<string, number>; // yanlış client simgeleri

const SILAH = new Set([11, 21, 22, 31, 32, 41, 42, 51, 52, 61, 62, 70, 71, 110, 140, 181]);
const ZIRH = new Set([60, 210, 220, 230, 240]); // 60 = kalkan

function main(): number {
  const od = new OyunDosyalari();
  const klasor = path.join(CIKTI_DIZINI, 'web', 'magaza');
  const gruplar = JSON.parse(fs.readFileSync(path.join(klasor, 'gruplar.json'), 'utf8').replace(/^﻿/, '')) as Record<string, number[][]>;
  const tablo = tbldenOku(od.oku('Data/Item_Org_us.tbl'), 'windows-1252').satirlar;
  const ikonKlasor = path.join(CIKTI_DIZINI, 'web', 'esya', 'ikon');
  fs.mkdirSync(ikonKlasor, { recursive: true });
  const esyalar: Record<string, unknown> = {};
  let eksik = 0;
  const tumYolu = path.join(CIKTI_DIZINI, 'web', 'esya', 'tum.json');
  const tum = new Map<number, { no: number; ad: string; aciklama: string; simge: string; tur: string; tip: number; yuva: number; hasar: number; gecikme: number; savunma: number; fiyat: number; sayilabilir: boolean }>(fs.existsSync(tumYolu) ? (JSON.parse(fs.readFileSync(tumYolu, 'utf8')) as { no: number }[]).map((e) => [e.no, e as never] as const) : []);
  for (const no of new Set(Object.values(gruplar).flat(2).filter(Boolean))) {
    const s = tablo.find((x) => Number(x[0]) === no) ?? tablo.find((x) => Number(x[0]) === no - (no % 1000));
    if (!s) { // Item_Org_us.tbl'de yok (sunucuya özel): tum-esyalar çıktısındaki kayıt kullanılır
      const t = tum.get(no);
      if (!t) { eksik++; continue; }
      esyalar[String(no)] = { no, ad: t.ad, aciklama: t.aciklama, simge: t.simge, tur: t.tur, tip: t.tip, yuva: t.yuva, hasar: t.hasar, gecikme: t.gecikme, savunma: t.savunma, fiyat: t.fiyat, sayilabilir: t.sayilabilir };
      continue;
    }
    const simge = SIMGE_DUZELTME[String(no)] ?? Number(s[7]), tur = Number(s[10]);
    let simgeAd = '';
    const yol = simgeYolu(simge);
    if (od.var(yol)) {
      try {
        const d = dxtOku(od.oku(yol));
        fs.writeFileSync(path.join(ikonKlasor, `${simge}.png`), pngKodla(d.genislik, d.yukseklik, rgbayaCevir(d)));
        simgeAd = `ikon/${simge}.png`;
      } catch { /* simge çözülemedi */ }
    }
    esyalar[String(no)] = {
      no, ad: String(s[2]), aciklama: String(s[3]).replace(/\|\s*/g, ' '), simge: simgeAd,
      tur: SILAH.has(tur) ? 'silah' : ZIRH.has(tur) ? 'zirh' : 'sarf', tip: tur, yuva: Number(s[12]),
      hasar: Number(s[15]), gecikme: Number(s[16]), savunma: Number(s[22]), fiyat: Number(s[20]), sayilabilir: Number(s[23]) > 0,
    };
  }
  fs.writeFileSync(path.join(klasor, 'magaza.json'), JSON.stringify({ gruplar, esyalar }));
  od.kapat();
  console.log(`${Object.keys(esyalar).length} mağaza eşyası (${eksik} tabloda yok), ${Object.keys(gruplar).length} grup -> ${klasor}`);
  return 0;
}

if (process.argv[1]?.endsWith('magaza.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
