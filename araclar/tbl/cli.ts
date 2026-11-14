// Tablo aracı. Kullanım (araclar/ klasöründe):
//   npm run tbl-coz                       -> oyundaki tüm .tbl dosyalarını JSON'a çevirir
//   npm run tbl-coz -- Data/Zones.tbl     -> sadece verilen tabloları çevirir
//   npm run tbl-yaz -- <dosya.json> ...   -> düzenlenmiş JSON'ları yeniden .tbl yapar
//   npm run tbl-dogrula                   -> her tabloyu çöz + geri yaz, orijinaliyle bayt bayt karşılaştır
// Seçenekler: --cikti <klasör>, --kod <windows-1254|windows-1252|...>
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, OYUN_DIZINI, oyunDisindaOlmali } from '../ortak/yollar.ts';
import { jsonaCevir, jsondanOku, tbldenOku, tblyeYaz, tekrarEdenIdler } from './tablo.ts';
import type { KodSayfasi } from './kodlama.ts';

const VARSAYILAN_JSON = path.join(CIKTI_DIZINI, 'tablolar');
const VARSAYILAN_TBL = path.join(CIKTI_DIZINI, 'tablolar-tbl');

function secenekleriAyir(argv: string[]) {
  const dosyalar: string[] = [];
  let cikti: string | undefined;
  let kod: KodSayfasi = 'windows-1254';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cikti') cikti = argv[++i];
    else if (argv[i] === '--kod') kod = argv[++i] as KodSayfasi;
    else dosyalar.push(argv[i]);
  }
  return { dosyalar, cikti, kod };
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

function coz(argv: string[]): number {
  const { dosyalar, cikti = VARSAYILAN_JSON, kod } = secenekleriAyir(argv);
  oyunDisindaOlmali(cikti);
  const liste = dosyalar.length ? dosyalar.map(goreliYol) : tumTablolar();
  let tamam = 0;
  const hatalar: string[] = [];
  for (const goreli of liste) {
    const kaynak = path.join(OYUN_DIZINI, goreli);
    try {
      const veri = fs.readFileSync(kaynak);
      if (veri.length === 0) { hatalar.push(`${goreli}: boş dosya, atlandı`); continue; }
      const tablo = tbldenOku(veri, kod);
      const hedef = path.join(cikti, goreli.replace(/\.tbl$/i, '.json'));
      fs.mkdirSync(path.dirname(hedef), { recursive: true });
      fs.writeFileSync(hedef, jsonaCevir(tablo, goreli.split(path.sep).join('/'), kod), 'utf8');
      tamam++;
    } catch (e) {
      hatalar.push(`${goreli}: ${(e as Error).message}`);
    }
  }
  console.log(`${tamam}/${liste.length} tablo JSON'a çevrildi -> ${cikti}`);
  for (const h of hatalar) console.log('  ! ' + h);
  return hatalar.some((h) => !h.includes('boş dosya')) ? 1 : 0;
}

function yaz(argv: string[]): number {
  const { dosyalar, cikti = VARSAYILAN_TBL } = secenekleriAyir(argv);
  oyunDisindaOlmali(cikti);
  if (!dosyalar.length) { console.log('Kullanım: npm run tbl-yaz -- <dosya.json> [...] [--cikti klasör]'); return 1; }
  let hata = 0;
  for (const j of dosyalar) {
    try {
      const { tablo, ks, kaynak } = jsondanOku(fs.readFileSync(j, 'utf8'));
      const tekrar = tekrarEdenIdler(tablo);
      if (tekrar.length) console.log(`  uyarı: ${j}: tekrar eden ID'ler (oyun sadece ilkini kullanır): ${tekrar.slice(0, 10).join(', ')}`);
      const hedef = path.join(cikti, kaynak ?? path.basename(j).replace(/\.json$/i, '.tbl'));
      oyunDisindaOlmali(hedef);
      fs.mkdirSync(path.dirname(hedef), { recursive: true });
      fs.writeFileSync(hedef, tblyeYaz(tablo, ks));
      console.log(`  ${j} -> ${hedef}`);
    } catch (e) {
      console.log(`  ! ${j}: ${(e as Error).message}`);
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
      const json = jsonaCevir(tbldenOku(orijinal, kod), goreli, kod);
      const { tablo, ks } = jsondanOku(json);
      const yeniden = tblyeYaz(tablo, ks);
      if (Buffer.from(yeniden).equals(orijinal)) ayni++;
      else sorunlar.push(`${goreli}: geri yazılan dosya orijinalden farklı`);
    } catch (e) {
      sorunlar.push(`${goreli}: ${(e as Error).message}`);
    }
  }
  console.log(`${ayni}/${liste.length} tablo çöz → JSON → geri yaz sonrası orijinaliyle birebir aynı.`);
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
