// Eşyaya göre giyinme: zırh eşyalarının (kask hariç gövde/bacak/eller/ayaklar) görünümü ırka göre ayrı .glb (iskelet + tek deri parçası).
// Dosya adı kuralı (orijinal client GameBase.cpp MakeResrcFileNameForUPC): Item\A_BBBB_CC_D.n3cpart, A = kaynak/10^7, BBBB = (kaynak/1000 % 10000) + ırk numarası, CC = kaynak/10 % 100, D = kaynak % 10.
// Kaynak numarası eşya tablosunun (Item_Org_us.tbl) 7. sütunudur. Çıktı: donusturulmus/web/giyim/<ırk>/<kaynak>.glb ve giyim/dizin.json ({ "<ırk>": [kaynak…] }).
//   npm run giyim -- [en çok seviye=40] [ırklar=11,12,13]      (ör. npm run giyim -- 60 1,2,3,4,11,12,13)
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { karakterGlb } from './karakterGlb.ts';

export const ZIRH_TURLERI = new Set([210, 220, 230, 240]);
/** Orijinal dosya adı kuralı. */
export function giyimYolu(kaynak: number, irk: number): string {
  const p = (n: number, h: number) => String(n).padStart(h, '0');
  return `Item/${Math.floor(kaynak / 10000000)}_${p(((Math.floor(kaynak / 1000)) % 10000) + irk, 4)}_${p(Math.floor(kaynak / 10) % 100, 2)}_${kaynak % 10}.n3cpart`;
}

function main(argv: string[]): number {
  const enCok = Number(argv[0] ?? 40), irklar = (argv[1] ?? '11,12,13').split(',').map(Number);
  const od = new OyunDosyalari();
  const looks = tbldenOku(od.oku('Data/UPC_DefaultLooks.tbl'), 'windows-1252').satirlar;
  const esyalar = tbldenOku(od.oku('Data/Item_Org_us.tbl'), 'windows-1252').satirlar;
  const kaynaklar = new Set<number>();
  for (const s of esyalar) { const tur = Number(s[10]), k = Number(s[6]); if (ZIRH_TURLERI.has(tur) && k > 0 && Number(s[26] ?? 0) <= enCok) kaynaklar.add(k); }
  console.log(`${kaynaklar.size} farklı zırh kaynağı (seviye ≤ ${enCok}), ırklar: ${irklar.join(', ')}`);
  const hedef = path.join(CIKTI_DIZINI, 'web', 'giyim'); fs.mkdirSync(hedef, { recursive: true });
  const dizinYolu = path.join(hedef, 'dizin.json');
  const dizin: Record<string, number[]> = fs.existsSync(dizinYolu) ? JSON.parse(fs.readFileSync(dizinYolu, 'utf8')) : {};
  for (const irk of irklar) {
    const s = looks.find((x) => Number(x[0]) === irk); if (!s) { console.log(`! ırk ${irk} tabloda yok`); continue; }
    fs.mkdirSync(path.join(hedef, String(irk)), { recursive: true });
    const var_ = new Set(dizin[String(irk)] ?? []); let yeni = 0, yok = 0, hata = 0;
    for (const k of kaynaklar) {
      const dosya = path.join(hedef, String(irk), `${k}.glb`);
      if (var_.has(k) && fs.existsSync(dosya)) continue;
      const yol = giyimYolu(k, irk);
      if (!od.var(yol)) { yok++; continue; }
      try {
        const { glb } = karakterGlb(od, { ad: `giyim${k}`, iskelet: String(s[2]), animasyon: '', parcalar: [yol] });
        fs.writeFileSync(dosya, glb); var_.add(k); yeni++;
      } catch (e) { hata++; console.log(`  uyarı ${irk}/${k}: ${(e as Error).message}`); }
    }
    dizin[String(irk)] = [...var_].sort((a, b) => a - b);
    console.log(`ırk ${irk}: ${yeni} yeni, ${var_.size} toplam, ${yok} dosyası olmayan, ${hata} hata`);
  }
  fs.writeFileSync(dizinYolu, JSON.stringify(dizin));
  od.kapat();
  return 0;
}
try { process.exit(main(process.argv.slice(2))); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
