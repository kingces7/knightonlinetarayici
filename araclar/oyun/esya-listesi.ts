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

// Nadirlik (rarity) sıralaması: sunucu kaynağındaki ItemClass (ItemUpgradeSystem.cpp: 0/1 low class, 2/7 middle class, 3 high class, 4/5 unique (yüksekten yeniden doğuşa / rebirth), 8 aksesuar, 21/22/33/34/35 özel seri).
// Yalnız silah/zırh/kalkan/takı için; iksir, kâğıt, kutu gibi (sarf) eşyalar "nadirliksiz" listededir.
const NADIRLIK: { dosya: string; ad: string; kodlar: number[] }[] = [
  { dosya: '1-low-class', ad: 'Low class', kodlar: [0, 1] },
  { dosya: '2-middle-class', ad: 'Middle class', kodlar: [2, 7] },
  { dosya: '3-high-class', ad: 'High class', kodlar: [3] },
  { dosya: '4-unique-class', ad: 'Unique class', kodlar: [4, 5] },
  { dosya: '5-aksesuar-sinifi', ad: 'Aksesuar sınıfı (class 8)', kodlar: [8] },
  { dosya: '6-ozel-seri', ad: 'Özel seri (class 21, 22, 33, 34, 35)', kodlar: [21, 22, 33, 34, 35] },
];
const donanim = (e: { tur: string; tip?: number }) => e.tur === 'silah' || e.tur === 'zirh' || e.tur === 'kalkan' || [91, 92, 93, 94].includes(e.tip ?? 0); // 91-94: küpe/kolye/yüzük/kemer
const nKlasor = path.join(DEPO_KOKU, 'docs', 'esya-nadirlik'); fs.mkdirSync(nKlasor, { recursive: true });
let nReadme = '# Eşyalar — nadirliğe göre (low → middle → high → unique)\n\n`node araclar/oyun/esya-listesi.ts` ile üretilir. Nadirlik = sunucu `ItemClass` değeri (kaynak: `ItemUpgradeSystem.cpp`). Her dosya sınıf (Warrior/Rogue/Mage/Priest) ve eşya numarasına göre sıralıdır.\n\n| Dosya | Nadirlik | Eşya |\n|---|---|---|\n';
const hepsi: string[] = [csv(['nadirlik', 'esya_no', 'ad', 'tur', 'sinif_kodu', 'irk', 'gereken_seviye', 'fiyat'])];
for (const g of NADIRLIK) {
  const l = (t as unknown as { no: number; ad: string; tur: string; tip: number; sinif: number; irk: number; gerekSeviye: number; fiyat: number; sinifDerece: number }[]).filter((e) => g.kodlar.includes(e.sinifDerece) && donanim(e)).sort((a, b) => a.sinif - b.sinif || a.no - b.no);
  fs.writeFileSync(path.join(nKlasor, `${g.dosya}.csv`), [baslik, ...l.map((e) => csv([e.no, e.ad, e.tur, e.sinif, e.irk, e.gerekSeviye, e.fiyat, '']))].join('\n') + '\n');
  for (const e of l) hepsi.push(csv([g.ad, e.no, e.ad, e.tur, e.sinif, e.irk, e.gerekSeviye, e.fiyat]));
  nReadme += `| ${g.dosya}.csv | ${g.ad} | ${l.length} |\n`;
}
const digerler = (t as unknown as { no: number; ad: string; tur: string; tip: number; sinif: number; irk: number; gerekSeviye: number; fiyat: number; sinifDerece: number }[]).filter((e) => !donanim(e) || ![0, 1, 2, 7, 3, 4, 5, 8, 21, 22, 33, 34, 35].includes(e.sinifDerece));
fs.writeFileSync(path.join(nKlasor, '7-nadirliksiz-sarf-diger.csv'), [baslik, ...digerler.sort((a, b) => a.no - b.no).map((e) => csv([e.no, e.ad, e.tur, e.sinif, e.irk, e.gerekSeviye, e.fiyat, '']))].join('\n') + '\n');
nReadme += `| 7-nadirliksiz-sarf-diger.csv | Nadirlik yok (iksir, kâğıt, kutu, diğer) | ${digerler.length} |\n`;
fs.writeFileSync(path.join(nKlasor, 'tum-donanim-nadirlige-gore.csv'), hepsi.join('\n') + '\n');
fs.writeFileSync(path.join(nKlasor, 'README.md'), nReadme);
console.log('docs/esya-nadirlik/ yazıldı');
