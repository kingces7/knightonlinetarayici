// Tüm client .gtd haritalarını sunucu .smd dosyalarıyla karşılaştırır (yükseklik benzerliği).
//   npm run harita-eslesme             -> her .gtd için varsayılan .smd (tablo ya da <ad>.smd) ve sonuç
//   npm run harita-eslesme -- --en-iyi -> ayrıca aynı boyuttaki bütün .smd'ler arasında en iyi aday
//   npm run harita-eslesme -- --eksik  -> client Zones.csv'nin gösterdiği ama KnightEmpire/ içinde olmayan harita dosyaları
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, OYUN_DIZINI, SUNUCU_HARITA_DIZINI } from '../ortak/yollar.ts';
import { gtdOku } from './arazi.ts';
import { smdOku } from './smd.ts';
import { ESLESME_ESIGI, SUNUCU_HARITASI, eslesmeGuvenilir, yukseklikEslesmesi } from './eslesme.ts';

const enIyi = process.argv.includes('--en-iyi');
const zonesDizin = path.join(OYUN_DIZINI, 'Zones');

if (process.argv.includes('--eksik')) {
  // Zones.csv: ilk sütun = bölge no × 10 (18, 21-25, 63 için ayrıca ×100 satırları da var); yol sütunları .gtd/.tct/.tlt/... ile biter.
  const csv = path.join(CIKTI_DIZINI, 'tablolar', 'Data', 'Zones.csv');
  if (!fs.existsSync(csv)) { console.log(`Zones.csv yok: ${csv} (önce tbl-coz)`); process.exit(1); }
  const dosyalar = new Map<string, string>(); // küçük harf göreli yol -> gerçek
  const gez = (d: string, onek: string) => { for (const g of fs.readdirSync(d, { withFileTypes: true })) { if (g.isDirectory()) gez(path.join(d, g.name), `${onek}${g.name}/`); else dosyalar.set(`${onek}${g.name}`.toLowerCase(), g.name); } };
  for (const k of ['Zones', 'Misc']) if (fs.existsSync(path.join(OYUN_DIZINI, k))) gez(path.join(OYUN_DIZINI, k), `${k}/`);
  const UZANTI = /\.(gtd|tct|tlt|opd|opdext|glo|gev|ens|flag|lilith)$/i;
  let toplam = 0, eksikYol = 0; const bolgeler: string[] = [];
  for (const satir of fs.readFileSync(csv, 'utf-8').split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = satir.split(',').map((s) => s.replace(/"/g, '').trim());
    const no = +c[0]; if (!no) continue;
    const yollar = c.filter((s) => UZANTI.test(s) && s.includes('\\'));
    toplam += yollar.length;
    const yok = yollar.filter((y) => !dosyalar.has(y.replace(/\\/g, '/').toLowerCase()));
    eksikYol += yok.length;
    if (yok.length) bolgeler.push(`bölge anahtarı ${String(no).padStart(4)} (${c[2]}): ${yok.length}/${yollar.length} dosya yok: ${yok.map((y) => path.basename(y.replace(/\\/g, '/'))).join(', ')}`);
  }
  console.log(`Zones.csv: ${toplam} harita dosyası yolu, ${eksikYol} eksik, ${bolgeler.length} satırda`);
  for (const b of bolgeler) console.log('  ' + b);
  process.exit(0);
}

const smdDosyalari = fs.readdirSync(SUNUCU_HARITA_DIZINI).filter((f) => f.toLowerCase().endsWith('.smd'));
const onbellek = new Map<string, ReturnType<typeof smdOku>>();
const smdAl = (ad: string) => { let s = onbellek.get(ad); if (!s) { s = smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, ad))); onbellek.set(ad, s); } return s; };
const yuzde = (x: number) => `%${(x * 100).toFixed(1)}`.padStart(7);

let tamam = 0, uyusmaz = 0, okunamadi = 0;
for (const f of fs.readdirSync(zonesDizin).filter((x) => x.toLowerCase().endsWith('.gtd')).sort((a, b) => a.localeCompare(b, 'en'))) {
  const ad = f.replace(/\.gtd$/i, '').toLowerCase();
  let g;
  try { g = gtdOku(fs.readFileSync(path.join(zonesDizin, f))); } catch (e) { okunamadi++; console.log(`${f.padEnd(34)} OKUNAMADI (${(e as Error).message})`); continue; }
  const varsayilan = smdDosyalari.find((s) => s.toLowerCase() === (SUNUCU_HARITASI[ad] ?? `${ad}.smd`).toLowerCase());
  let satir = `${f.padEnd(34)} N=${String(g.boyut).padEnd(4)}`;
  if (varsayilan) {
    const e = yukseklikEslesmesi(g, smdAl(varsayilan));
    const ok = eslesmeGuvenilir(e);
    if (ok) tamam++; else uyusmaz++;
    satir += ` ${varsayilan.padEnd(28)} ${e.boyutAyni ? `${yuzde(e.oran)} (${e.yon})` : `N=${e.smdBoyut} boyut farklı`.padEnd(17)}  ${ok ? 'TAMAM' : 'UYUŞMAZ'}`;
  } else { uyusmaz++; satir += ` ${'(varsayılan .smd yok)'.padEnd(28)}`; }
  console.log(satir);
  if (enIyi) {
    const adaylar = smdDosyalari.map((s) => ({ s, e: yukseklikEslesmesi(g, smdAl(s)) })).filter((x) => x.e.boyutAyni).sort((a, b) => b.e.oran - a.e.oran);
    const iyi = adaylar.filter((x) => x.e.oran >= ESLESME_ESIGI).slice(0, 4);
    console.log(`    en iyi adaylar: ${iyi.length ? iyi.map((x) => `${x.s} ${yuzde(x.e.oran)}`).join(' | ') : `(aynı boyutta eşik üstü yok; en yüksek ${adaylar[0] ? `${adaylar[0].s} ${yuzde(adaylar[0].e.oran)}` : '-'})`}`);
  }
}
console.log(`\nTAMAM ${tamam}, UYUŞMAZ ${uyusmaz}, okunamadı ${okunamadi} (eşik %${ESLESME_ESIGI * 100})`);
