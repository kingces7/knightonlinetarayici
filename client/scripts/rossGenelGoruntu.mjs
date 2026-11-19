// Geliştirme aracı (ross): genel pencereleri (ad listesi) açıp görüntüsünü alır. Edge CDP 9333.
// Kullanım: node scripts/rossGenelGoruntu.mjs <klasor> <pencere1,pencere2,...>
import { chromium } from 'playwright-core';
const [klasor = '.', adlar = 're_el_page_quest'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
for (const ad of adlar.split(',')) {
  await s.evaluate(async (ad) => { const a = window.ke.arayuz(); a.genel.hepsiniKapat?.(); await a.genel.ac(ad); }, ad);
  await s.waitForTimeout(700); await s.screenshot({ path: `${klasor}/g_${ad}.png`, clip: { x: 0, y: 0, width: 800, height: 700 } });
}
console.log(JSON.stringify({ hatalar }));
await s.close(); await t.close();
