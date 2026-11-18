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

// Sınıfa göre ayrılmış listeler: docs/esya-siniflar/<sınıf>.csv (sınıf kodu = eşya tablosu "Class": 1/5/6 Warrior, 2/7/8 Rogue, 3/9/10 Mage, 4/11/12 Priest, 0 herkes, diğerleri özel setler)
const SINIFLAR: Record<string, { ad: string; kodlar: number[] }> = {
  herkes: { ad: 'Herkes (sınıf şartı yok: iksir, kağıt, takı, ortak eşyalar)', kodlar: [0] },
  savasci: { ad: 'Warrior', kodlar: [1, 5, 6] },
  rogue: { ad: 'Rogue', kodlar: [2, 7, 8] },
  buyucu: { ad: 'Mage', kodlar: [3, 9, 10] },
  rahip: { ad: 'Priest', kodlar: [4, 11, 12] },
  ozel: { ad: 'Özel setler (sınıf kodu 13, 15, 21, 25, 255: Kurian/Porutu setleri, yaylar, yüzük/kolye serileri)', kodlar: [13, 15, 21, 25, 255] },
};
const klasor = path.join(DEPO_KOKU, 'docs', 'esya-siniflar'); fs.mkdirSync(klasor, { recursive: true });
const baslik = csv(['esya_no', 'ad', 'tur', 'sinif_kodu', 'irk', 'gereken_seviye', 'fiyat', 'aciklama']);
let readme = '# Eşyalar — sınıfa göre\n\n`node araclar/oyun/esya-listesi.ts` ile üretilir (kaynak: `docs/esya-listesi.csv`). `sinif_kodu` eşya tablosundaki "Class" değeridir.\n\n| Dosya | Sınıf | Eşya |\n|---|---|---|\n';
for (const [dosya, s] of Object.entries(SINIFLAR)) {
  const l = t.filter((e) => s.kodlar.includes(e.sinif as number)).sort((a, b) => String((a as { tur: string }).tur).localeCompare(String((b as { tur: string }).tur)) || a.no - b.no);
  fs.writeFileSync(path.join(klasor, `${dosya}.csv`), [baslik, ...l.map((e) => csv([e.no, e.ad, e.tur, e.sinif, e.irk, e.gerekSeviye, e.fiyat, e.aciklama]))].join('\n') + '\n');
  readme += `| ${dosya}.csv | ${s.ad} | ${l.length} |\n`;
}
fs.writeFileSync(path.join(klasor, 'README.md'), readme);
console.log('docs/esya-siniflar/ yazıldı');
