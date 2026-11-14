// Paket arşivi aracı (araclar/ klasöründe):
//   npm run paket-coz -- Item           -> KnightEmpire/Item/item.hdr+src içeriğini donusturulmus/paketler/Item/ altına açar
//   npm run paket-yaz -- <klasör> <hedef_klasör> <ad>  -> klasörü <ad>.hdr + <ad>.src olarak paketler
//   npm run paket-dogrula               -> her arşivi okur, girdilerin .src sınırları içinde olduğunu kontrol eder
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, OYUN_DIZINI, oyunDisindaOlmali } from '../ortak/yollar.ts';
import { PAKETLI_KLASORLER } from '../ortak/oyunDosyalari.ts';
import { PaketArsivi, hdrOku, klasoruPaketle } from './paket.ts';

function arsivYollari(klasor: string): [string, string] {
  const d = path.join(OYUN_DIZINI, klasor);
  const bul = (uz: string) => {
    const f = fs.readdirSync(d).find((x) => x.toLowerCase() === `${klasor.toLowerCase()}.${uz}`);
    if (!f) throw new Error(`${klasor}/${klasor}.${uz} bulunamadı`);
    return path.join(d, f);
  };
  return [bul('hdr'), bul('src')];
}

function coz(argv: string[]): number {
  const klasorler = argv.length ? argv : PAKETLI_KLASORLER;
  for (const k of klasorler) {
    const hedef = path.join(CIKTI_DIZINI, 'paketler', k);
    oyunDisindaOlmali(hedef);
    const a = new PaketArsivi(...arsivYollari(k));
    for (const g of a.girdiler) {
      const yol = path.join(hedef, ...g.ad.split('\\'));
      fs.mkdirSync(path.dirname(yol), { recursive: true });
      fs.writeFileSync(yol, a.oku(g.ad));
    }
    a.kapat();
    console.log(`${k}: ${a.girdiler.length} dosya -> ${hedef}`);
  }
  return 0;
}

function yaz(argv: string[]): number {
  const [klasor, hedefKlasor, ad] = argv;
  if (!klasor || !hedefKlasor || !ad) { console.log('Kullanım: npm run paket-yaz -- <klasör> <hedef_klasör> <ad>'); return 1; }
  oyunDisindaOlmali(hedefKlasor);
  fs.mkdirSync(hedefKlasor, { recursive: true });
  const n = klasoruPaketle(klasor, path.join(hedefKlasor, `${ad}.hdr`), path.join(hedefKlasor, `${ad}.src`));
  console.log(`${n} dosya paketlendi -> ${path.join(hedefKlasor, ad)}.hdr/.src`);
  return 0;
}

function dogrula(): number {
  let hata = 0;
  for (const k of PAKETLI_KLASORLER) {
    const [hdr, src] = arsivYollari(k);
    const g = hdrOku(fs.readFileSync(hdr));
    const boy = fs.statSync(src).size;
    const tasan = g.filter((x) => x.ofset + x.uzunluk > boy);
    console.log(`${k}: ${g.length} dosya, .src ${boy} bayt${tasan.length ? `, ${tasan.length} girdi taşıyor!` : ', sorun yok'}`);
    hata += tasan.length;
  }
  return hata ? 1 : 0;
}

const [komut, ...geri] = process.argv.slice(2);
const komutlar: Record<string, (a: string[]) => number> = { coz, yaz, dogrula };
if (!komut || !komutlar[komut]) { console.log('Komutlar: coz | yaz | dogrula'); process.exit(1); }
try { process.exit(komutlar[komut](geri)); } catch (e) { console.log('HATA: ' + (e as Error).message); process.exit(1); }
