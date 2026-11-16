import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
for (const [ad, x, z] of [['kanal', 410, 380], ['nehir', 150, 300], ['kiyi', 40, 250]]) {
  await s.evaluate(([x, z]) => { const o = window.ke.oyuncu; o.konum.set(x, z); o.yuksek = null; }, [x, z]);
  await s.waitForTimeout(1500);
  await s.screenshot({ path: `${process.argv[2]}/su_${ad}.png` });
}
console.log(JSON.stringify({ hatalar }));
await t.close();
