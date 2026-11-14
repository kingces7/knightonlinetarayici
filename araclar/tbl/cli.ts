// Tablo aracı. Kullanım (araclar/ klasöründe):
//   npm run tbl-coz                       -> oyundaki tüm .tbl dosyalarını CSV + .meta.json yapar
//   npm run tbl-coz -- Data/Zones.tbl     -> sadece verilen tabloları çevirir
//   npm run tbl-coz -- --json             -> CSV yerine tek parça JSON üretir
//   npm run tbl-yaz -- <dosya.csv|dosya.json> ...  -> düzenlenmiş tabloları yeniden .tbl yapar
//   npm run tbl-dogrula                   -> her tabloyu çöz + (JSON ve CSV üzerinden) geri yaz, orijinaliyle karşılaştır
// Seçenekler: --cikti <klasör>, --kod <windows-1252|windows-1254|...> (varsayılan: dosya adına göre)
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, OYUN_DIZINI, oyunDisindaOlmali } from '../ortak/yollar.ts';
import { jsonaCevir, jsondanOku, metaOlustur, tbldenOku, tblyeYaz, tekrarEdenIdler, type Tablo } from './tablo.ts';
import { csvdenTablo, csvyeCevir, type MetaJson } from './csv.ts';
import { varsayilanKodSayfasi, type KodSayfasi } from './kodlama.ts';

const VARSAYILAN_CIKTI = path.join(CIKTI_DIZINI, 'tablolar');
const VARSAYILAN_TBL = path.join(CIKTI_DIZINI, 'tablolar-tbl');

function secenekleriAyir(argv: string[]) {
  const dosyalar: string[] = [];
  let cikti: string | undefined;
  let kod: KodSayfasi | undefined;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cikti') cikti = argv[++i];
    else if (argv[i] === '--kod') kod = argv[++i] as KodSayfasi;
    else if (argv[i] === '--json') json = true;
    else dosyalar.push(argv[i]);
  }
  return { dosyalar, cikti, kod, json };
}

function tumTablolar(): string[] {
  const sonuc: string[] = [];
  const gez = (d: string) => {
    for (const g of fs.readdirSync(d, { withFileTypes: true })) {
      const tam = path.join(d, g.name);
      if (g.isDirectory()) gez(tam);
      else if (g.name.toLowerCase().endsWith('.tbl')) sonuc.push(path.relative(OYUN_DIZINI, tam));
    }
  };
  gez(OYUN_DIZINI);
  return sonuc.sort();
}

const goreliYol = (p: string) => (path.isAbsolute(p) ? path.relative(OYUN_DIZINI, p) : p);
const ileriEgik = (p: string) => p.split(path.sep).join('/');

function coz(argv: string[]): number {
  const { dosyalar, cikti = VARSAYILAN_CIKTI, kod, json } = secenekleriAyir(argv);
  oyunDisindaOlmali(cikti);
  const liste = dosyalar.length ? dosyalar.map(goreliYol) : tumTablolar();
  let tamam = 0;
  const hatalar: string[] = [];
  for (const goreli of liste) {
    try {
      const veri = fs.readFileSync(path.join(OYUN_DIZINI, goreli));
      if (veri.length === 0) { hatalar.push(`${goreli}: boş dosya, atlandı`); continue; }
      const ks = kod ?? varsayilanKodSayfasi(goreli);
      const tablo = tbldenOku(veri, ks);
      const temel = path.join(cikti, goreli.replace(/\.tbl$/i, ''));
      fs.mkdirSync(path.dirname(temel), { recursive: true });
      if (json) {
        fs.writeFileSync(temel + '.json', jsonaCevir(tablo, ileriEgik(goreli), ks), 'utf8');
      } else {
        fs.writeFileSync(temel + '.csv', csvyeCevir(tablo), 'utf8');
        fs.writeFileSync(temel + '.meta.json', JSON.stringify(metaOlustur(tablo, ileriEgik(goreli), ks), null, 2) + '\n', 'utf8');
      }
      tamam++;
    } catch (e) {
      hatalar.push(`${goreli}: ${(e as Error).message}`);
    }
  }
  console.log(`${tamam}/${liste.length} tablo ${json ? 'JSON' : 'CSV'}'ye çevrildi -> ${cikti}`);
  for (const h of hatalar) console.log('  ! ' + h);
  return hatalar.some((h) => !h.includes('boş dosya')) ? 1 : 0;
}

/** .csv (yanındaki .meta.json ile) ya da .json dosyasından tabloyu okur. */
function duzenlenmisTabloyuOku(dosya: string): { tablo: Tablo; ks: KodSayfasi; kaynak: string } {
  if (/\.csv$/i.test(dosya)) {
    const metaYolu = dosya.replace(/\.csv$/i, '.meta.json');
    if (!fs.existsSync(metaYolu)) throw new Error(`${path.basename(metaYolu)} bulunamadı (CSV'nin yanında olmalı)`);
    const meta = JSON.parse(fs.readFileSync(metaYolu, 'utf8')) as MetaJson;
    return { ...csvdenTablo(fs.readFileSync(dosya, 'utf8'), meta), kaynak: meta.kaynak };
  }
  return jsondanOku(fs.readFileSync(dosya, 'utf8'));
}

function yaz(argv: string[]): number {
  const { dosyalar, cikti = VARSAYILAN_TBL } = secenekleriAyir(argv);
  oyunDisindaOlmali(cikti);
  if (!dosyalar.length) { console.log('Kullanım: npm run tbl-yaz -- <tablo.csv|tablo.json> [...] [--cikti klasör]'); return 1; }
  let hata = 0;
  for (const d of dosyalar) {
    try {
      const { tablo, ks, kaynak } = duzenlenmisTabloyuOku(d);
      const tekrar = tekrarEdenIdler(tablo);
      if (tekrar.length) console.log(`  uyarı: ${d}: tekrar eden ID'ler (oyun sadece ilkini kullanır): ${tekrar.slice(0, 10).join(', ')}`);
      const hedef = path.join(cikti, kaynak ?? path.basename(d).replace(/\.(csv|json)$/i, '.tbl'));
      oyunDisindaOlmali(hedef);
      fs.mkdirSync(path.dirname(hedef), { recursive: true });
      fs.writeFileSync(hedef, tblyeYaz(tablo, ks));
      console.log(`  ${d} -> ${hedef}`);
    } catch (e) {
      console.log(`  ! ${d}: ${(e as Error).message}`);
      hata++;
    }
  }
  return hata ? 1 : 0;
}

function dogrula(argv: string[]): number {
  const { dosyalar, kod } = secenekleriAyir(argv);
  const liste = dosyalar.length ? dosyalar.map(goreliYol) : tumTablolar();
  let ayni = 0;
  const sorunlar: string[] = [];
  for (const goreli of liste) {
    const orijinal = fs.readFileSync(path.join(OYUN_DIZINI, goreli));
    if (orijinal.length === 0) { sorunlar.push(`${goreli}: boş dosya`); continue; }
    try {
      const ks = kod ?? varsayilanKodSayfasi(goreli);
      const tablo = tbldenOku(orijinal, ks);
      const j = jsondanOku(jsonaCevir(tablo, goreli, ks));
      const meta = JSON.parse(JSON.stringify(metaOlustur(tablo, goreli, ks))) as MetaJson;
      const c = csvdenTablo(csvyeCevir(tablo), meta);
      const jsonAyni = Buffer.from(tblyeYaz(j.tablo, j.ks)).equals(orijinal);
      const csvAyni = Buffer.from(tblyeYaz(c.tablo, c.ks)).equals(orijinal);
      if (jsonAyni && csvAyni) ayni++;
      else sorunlar.push(`${goreli}: geri yazılan dosya orijinalden farklı (JSON: ${jsonAyni ? 'aynı' : 'FARKLI'}, CSV: ${csvAyni ? 'aynı' : 'FARKLI'})`);
    } catch (e) {
      sorunlar.push(`${goreli}: ${(e as Error).message}`);
    }
  }
  console.log(`${ayni}/${liste.length} tablo çöz → JSON/CSV → geri yaz sonrası orijinaliyle birebir aynı.`);
  for (const s of sorunlar) console.log('  ! ' + s);
  return sorunlar.some((s) => !s.endsWith('boş dosya')) ? 1 : 0;
}

const [komut, ...geri] = process.argv.slice(2);
const komutlar: Record<string, (a: string[]) => number> = { coz, yaz, dogrula };
if (!komut || !komutlar[komut]) {
  console.log('Komutlar: coz | yaz | dogrula   (ör. node tbl/cli.ts coz)');
  process.exit(1);
}
try {
  process.exit(komutlar[komut](geri));
} catch (e) {
  console.log('HATA: ' + (e as Error).message);
  process.exit(1);
}
