// Geliştirme aracı: oyuncu modelinde verilen animasyonları sırayla oynatıp ekran görüntüsü alır.
import { chromium } from 'playwright-core';
const [url, klasor, ...adlar] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 900, height: 600 } });
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(2500);
await s.evaluate(() => { const o = window.ke; o.kamera.uzaklik = 4; o.kamera.egim = 0.15; });
for (const [i, ad] of adlar.entries()) {
  await s.evaluate((ad) => { window.ke.oyuncu.model.oynat(ad, true, 0); }, ad);
  await s.waitForTimeout(900);
  await s.screenshot({ path: `${klasor}/a${i}_${ad}.png`, clip: { x: 250, y: 80, width: 400, height: 440 } });
}
console.log('bitti');
await t.close();
