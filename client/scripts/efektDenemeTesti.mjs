// Geliştirme aracı: DENEYSEL toz efektini (.fxb tahmini) oyuncunun önünde tetikler, bir süre sonra kendiliğinden
// söndüğünü doğrular ve ekran görüntüsü alır. Gerçek bir skill'e bağlı değildir (bkz. docs/formatlar/fxb.md "Deneme").
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1000, height: 700 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(() => { window.ke.kamera.uzaklik = 5; window.ke.kamera.egim = 0.45; }); // yakından bakalım
await s.evaluate(() => window.ke.efektDene());
const hemenSonra = await s.evaluate(() => window.ke.efektSayisi());
await s.screenshot({ path: `${klasor}/efekt_canli.png` }); // ~birkaç yüz ms: hâlâ görünür olmalı
await s.waitForTimeout(1500); // ömür (~1 sn) geçsin
const birSureSonra = await s.evaluate(() => window.ke.efektSayisi());
await s.screenshot({ path: `${klasor}/efekt_sonmus.png` }); // sönmüş olmalı
console.log(JSON.stringify({ hatalar, hemenSonra, birSureSonra }));
await t.close();
