// Geliştirme aracı (ross): verilen UIF pencerelerini ham olarak (genel.ac) açıp görüntü alır. Edge CDP 9333.
// Kullanım: node scripts/rossHamPencere.mjs <klasor> ad1,ad2,...
import { chromium } from 'playwright-core';
const [klasor = '.', adlar = ''] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
for (const ad of adlar.split(',')) {
  const ok = await s.evaluate(async (ad) => { const a = window.ke.arayuz(); a.genel.hepsiniKapat(); return await a.genel.ac(ad); }, ad);
  await s.waitForTimeout(800); await s.screenshot({ path: `${klasor}/h_${ad}.png` }); console.log(ad, ok);
}
await s.close(); await t.close();
