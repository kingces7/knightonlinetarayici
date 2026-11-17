// NPC diyalog metinlerini web için dışa aktarır.
//   npm run diyalog  -> donusturulmus/web/oyun/diyalog.json   { talk: {metinNo: "metin"}, menu: {metinNo: "düğme yazısı"} }
// Kaynak: Data/Quest_Talk_us.tbl (diyalog gövdesi/başlığı) ve Data/Quest_Menu_us.tbl (düğme yazıları). Sunucu Lua betiği `SelectMsg(...)` bu numaraları yollar.
// Not: tablolar önce `npm run tablolar` ile CSV'ye dökülmüş olmalı (donusturulmus/tablolar/Data).
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';

/** Tırnaklı alanları (iç içe virgül/çift tırnak) destekleyen basit CSV ayrıştırıcı. */
function csvOku(metin: string): string[][] {
  const satirlar: string[][] = []; let alan = '', satir: string[] = [], tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) { if (c === '"') { if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; } else alan += c; }
    else if (c === '"') tirnak = true;
    else if (c === ',') { satir.push(alan); alan = ''; }
    else if (c === '\n') { satir.push(alan.replace(/\r$/, '')); satirlar.push(satir); satir = []; alan = ''; }
    else alan += c;
  }
  if (alan || satir.length) { satir.push(alan.replace(/\r$/, '')); satirlar.push(satir); }
  return satirlar;
}

function tablo(dosya: string): Record<string, string> {
  const yol = path.join(CIKTI_DIZINI, 'tablolar', 'Data', dosya);
  const cikti: Record<string, string> = {};
  for (const [no, yazi] of csvOku(fs.readFileSync(yol, 'utf8')).slice(1)) if (/^\d+$/.test(no ?? '')) cikti[no] = yazi ?? '';
  return cikti;
}

const talk = tablo('Quest_Talk_us.csv'), menu = tablo('Quest_Menu_us.csv');
/**
 * Görev yardımcısı (Quest_Helper_us = sunucu QUEST_HELPER): NPC sid → satırlar. Her satır:
 * [satır no, seviye, deneyim, sınıf grubu (5 = hepsi), ulus (3 = ikisi), görev no, görev durumu, tetik olayı, menü metni no]. Görev no 0 ve durumu 255 olan satırlar atılır.
 */
const yardimci: Record<string, number[][]> = {};
for (const s of csvOku(fs.readFileSync(path.join(CIKTI_DIZINI, 'tablolar', 'Data', 'Quest_Helper_us.csv'), 'utf8')).slice(1)) {
  const n = s.slice(0, 20).map((x, i) => (i === 16 ? 0 : Number(x))); if (!(n[0] > 0) || !n[9] || !n[10] || n[11] === 255) continue;
  (yardimci[n[9]] ??= []).push([n[0], n[2], n[3], n[5], n[6], n[10], n[11], n[12], n[17]]);
}
const hedef = path.join(CIKTI_DIZINI, 'web', 'oyun'); fs.mkdirSync(hedef, { recursive: true });
fs.writeFileSync(path.join(hedef, 'diyalog.json'), JSON.stringify({ talk, menu, yardimci }));
console.log(`diyalog.json: ${Object.keys(talk).length} diyalog metni, ${Object.keys(menu).length} düğme yazısı, ${Object.keys(yardimci).length} görev NPC'si`);
