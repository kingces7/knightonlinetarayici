// Eşya numaralarına bakmak için düz liste: docs/esya-listesi.csv (VS Code + "Edit CSV" ile açılır). Kaynak: donusturulmus/web/esya/tum.json (Item_Org_us.tbl + sunucuya özel eşyalar).
//   node araclar/oyun/esya-listesi.ts      (önce: npm run tum-esyalar)
// Sütunlar: esya_no (sunucu/drop/mağazada kullanılan numara), ad, tur, irk, sinif, gereken_seviye, fiyat, aciklama. Yükseltmeli (+N) halleri aynı numaranın son 3 hanesiyle ayrılır.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, DEPO_KOKU } from '../ortak/yollar.ts';

type E = { no: number; ad: string; aciklama: string; tur: string; irk: number; sinif: number; gerekSeviye: number; fiyat: number };
const t = JSON.parse(fs.readFileSync(path.join(CIKTI_DIZINI, 'web', 'esya', 'tum.json'), 'utf8')) as E[];
const csv = (r: (string | number)[]) => r.map((x) => { const s = String(x); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',');
const satirlar = [csv(['esya_no', 'ad', 'tur', 'irk', 'sinif', 'gereken_seviye', 'fiyat', 'aciklama']), ...t.sort((a, b) => a.no - b.no).map((e) => csv([e.no, e.ad, e.tur, e.irk, e.sinif, e.gerekSeviye, e.fiyat, e.aciklama]))];
fs.writeFileSync(path.join(DEPO_KOKU, 'docs', 'esya-listesi.csv'), satirlar.join('\n') + '\n');
console.log(`docs/esya-listesi.csv: ${t.length} eşya`);
// Kopyalamak için sade metin: "numara  ad" (Ctrl+F ile aranır, satır seçip kopyalanır).
fs.writeFileSync(path.join(DEPO_KOKU, 'docs', 'esya-idleri.txt'), t.map((e) => `${e.no}  ${e.ad}`).join('\n') + '\n');
console.log('docs/esya-idleri.txt yazıldı');
