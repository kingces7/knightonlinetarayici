// Geliştirme aracı: kovalamayı bırakan canavar doğduğu yere döner mi?
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const r = await s.evaluate(async () => {
  const c = window.ke.canavarlar.find((x) => !x.olu);
  c.konum.set(c.dogum.x + 40, c.dogum.y); c.kizgin = false;
  const bas = c.konum.distanceTo(c.dogum);
  await new Promise((q) => setTimeout(q, 6000));
  return { basMesafe: +bas.toFixed(1), sonMesafe: +c.konum.distanceTo(c.dogum).toFixed(1), alan: c.yerlesim?.alan };
});
console.log(JSON.stringify({ r, hatalar }));
await t.close();
