import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 960, height: 540 } });
await s.goto('http://localhost:5173/');
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.evaluate(() => {
  const o = window.ke; const p = o.oyuncu.konum;
  o.oyuncu.yuruHedef = p.clone().add({ x: 30, y: 0 }); // +x yönüne yürü
  o.kamera.aci = -Math.PI / 2; o.kamera.egim = 0.25; o.kamera.uzaklik = 5; // kamera oyuncunun -x tarafında (arkasında)
});
await s.waitForTimeout(1500);
await s.screenshot({ path: '../donusturulmus/onizleme/yon.png' });
await t.close();
