// Geliştirme aracı: giyili ve çıplak karakteri envanter önizlemesinde karşılaştırır.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/', klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.keyboard.press('KeyI'); await s.waitForTimeout(1200);
await s.screenshot({ path: `${klasor}/giyili.png`, clip: { x: 960, y: 110, width: 200, height: 280 } });
await s.evaluate(() => { const o = window.ke.oyuncu; for (const y of [1, 4, 10, 12, 13]) { const e = o.ekipman[y]; if (e) { o.ekipman[y] = null; } } });
await s.waitForTimeout(800);
await s.screenshot({ path: `${klasor}/ciplak.png`, clip: { x: 960, y: 110, width: 200, height: 280 } });
console.log(JSON.stringify({ hatalar }));
await t.close();
