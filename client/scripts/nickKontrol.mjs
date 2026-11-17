import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.oyuncu?.model, null, { timeout: 120000 }); await s.waitForTimeout(3000);
for (const u of [14, 6, 3]) {
  await s.evaluate((u) => { window.ke.kamera.uzaklik = u; }, u); await s.waitForTimeout(1200);
  const r = await s.evaluate(() => {
    const o = window.ke.oyuncu, k = window.ke.kamera.kamera; k.updateMatrixWorld();
    let bas = null; o.model.kok.traverse((x) => { if (!bas && x.isBone && /head/i.test(x.name)) bas = x; });
    const proj = (v) => { const p = v.clone().project(k); return [Math.round((p.x * 0.5 + 0.5) * innerWidth), Math.round((-p.y * 0.5 + 0.5) * innerHeight)]; };
    const hv = o.grup.position.clone(); if (bas) bas.getWorldPosition(hv);
    const et = document.querySelector('.etiket.oyuncu'); const b = et.getBoundingClientRect();
    return { grupAyak: proj(o.grup.position), bas: proj(hv), etiketMerkez: [Math.round(b.left + b.width / 2), Math.round(b.top)] };
  });
  console.log(u, JSON.stringify(r));
}
await s.screenshot({ path: 'E:/tmp/nick3.png', clip: { x: 440, y: 150, width: 400, height: 400 } });
await t.close();
