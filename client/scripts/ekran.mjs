// Geliştirme aracı: oyunu görünmez Edge'de açıp ekran görüntüsü alır.
// Kullanım: node scripts/ekran.mjs [url] [cikti.png] [bekleme_ms] [js_komutu]
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/', cikti = 'ekran.png', bekle = '8000', komut = ''] = process.argv.slice(2);
const tarayici = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11', '--enable-unsafe-swiftshader'] });
const sayfa = await tarayici.newPage({ viewport: { width: 1280, height: 720 } });
const kayit = [];
sayfa.on('console', (m) => kayit.push(`[${m.type()}] ${m.text()}`));
sayfa.on('pageerror', (e) => kayit.push(`[HATA] ${e.message}`));
await sayfa.goto(url);
await sayfa.waitForTimeout(Number(bekle));
if (komut) { await sayfa.evaluate(komut); await sayfa.waitForTimeout(1500); }
await sayfa.screenshot({ path: cikti });
console.log(kayit.slice(0, 30).join('\n'));
await tarayici.close();
