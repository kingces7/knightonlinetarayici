import { chromium } from 'playwright-core';
const [klasor] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
for (const q of ['&saat=12&isik=2', '&saat=12&isik=3']) {
  const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
  await s.goto('http://localhost:5173/?giris=0' + q); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(5000);
  await s.screenshot({ path: `${klasor}/i${q.replace(/\W/g, '')}.png` }); await s.close();
}
await t.close();
