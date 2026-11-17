// Oyuncu ırk modelleri (çıplak taban): UPC_DefaultLooks.tbl'deki her ırk için iskelet + animasyon + çıplak parçalar (gövde, bacak, yüz, eller, ayaklar, saç).
// Çıplak gövde/bacak/eller/ayaklar/saç ayrı düğümlerdir (`parca_<yuva>_ciplak`); istemci eşya giyince bu düğümü gizler ve eşyanın parçasını (giyim/<ırk>/<kaynak>.glb) aynı iskelete bağlar.
//   npm run irk            -> donusturulmus/web/karakter/<7000+ırk>.glb (7001–7004, 7011–7013) ve karakterler.json girdileri
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { karakterGlb } from './karakterGlb.ts';

/** Tablo sütunları: 0 ırk, 1 ad, 2 iskelet, 3 animasyon, 4 gövde, 5 bacak, 6 yüz, 7 eller, 8 ayaklar, 9 saç. */
export const IRKLAR = [1, 2, 3, 4, 11, 12, 13];
const YUVALAR: (string | null)[] = ['govde', 'bacak', null, 'el', 'ayak', 'bas'];

function main(): number {
  const od = new OyunDosyalari();
  const satirlar = tbldenOku(od.oku('Data/UPC_DefaultLooks.tbl'), 'windows-1252').satirlar;
  const hedef = path.join(CIKTI_DIZINI, 'web', 'karakter'); fs.mkdirSync(hedef, { recursive: true });
  const dizinYolu = path.join(hedef, 'karakterler.json');
  const dizin: Record<string, unknown> = fs.existsSync(dizinYolu) ? JSON.parse(fs.readFileSync(dizinYolu, 'utf8')) : {};
  for (const irk of IRKLAR) {
    const s = satirlar.find((x) => Number(x[0]) === irk); if (!s) { console.log(`! ırk ${irk} tabloda yok`); continue; }
    // Yüz ve saç dosyaları numaralıdır (upc_el_rm_face01, upc_el_rm_hair00): tablodaki ad yoksa numaralı ilk çeşit alınır.
    const parcalar = [4, 5, 6, 7, 8, 9].map((i) => { const p = String(s[i]); if (od.var(p) || !p) return p; return p.replace(/_(face|hair).n3cpart$/i, (_, k: string) => `_${k}${k.toLowerCase() === 'face' ? '01' : '00'}.n3cpart`); });
    const etiketler = YUVALAR.map((y) => (y ? `${y}_ciplak` : null));
    const { glb, rapor } = karakterGlb(od, { ad: `irk${irk}`, iskelet: String(s[2]), animasyon: String(s[3]), parcalar, etiketler });
    fs.writeFileSync(path.join(hedef, `${7000 + irk}.glb`), glb);
    dizin[String(7000 + irk)] = { ad: String(s[1]), dosya: `${7000 + irk}.glb`, animasyonlar: rapor.animBilgi };
    console.log(`${7000 + irk} ${s[1]}: ${rapor.kemik} kemik, ${rapor.parca} sabit parça, ${rapor.animasyonlar.length} animasyon, ${(rapor.boyut / 1024).toFixed(0)} KB`);
  }
  fs.writeFileSync(dizinYolu, JSON.stringify(dizin, null, 2));
  od.kapat();
  return 0;
}
try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
