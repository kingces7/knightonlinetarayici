// Geliştirme aracı: yerel modda başa kask takar, yakın çekimde ekran görüntüsü alır. Kullanım: node scripts/kaskTesti.mjs <klasör> <eşya no,...>
import { chromium } from 'playwright-core';
const [klasor = '.', liste = '203003000'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 900, height: 700 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.oyuncu?.model, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.kamera.uzaklik = 3.2; window.ke.kamera.aci = Math.PI * 0.25; });
const tum = await (await fetch('http://localhost:5173/esya/tum.json')).json();
for (const no of liste.split(',').map(Number)) {
  const e = tum.find((x) => x.no === no);
  await s.evaluate((e) => { window.ke.oyuncu.ekipman[1] = e ? { ...e, sunucuNo: e.no } : null; }, e);
  await s.waitForTimeout(2500);
  await s.screenshot({ path: `${klasor}/kask_${no}.png` });
}
console.log('hatalar', h);
await t.close();
