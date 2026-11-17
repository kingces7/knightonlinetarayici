import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.keyboard.press('KeyI'); await s.waitForTimeout(1500);
const r = await s.evaluate(() => { const p = window.ke.arayuz().pencereler.envanter; const b = p.el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
console.log(r);
await s.screenshot({ path: process.argv[2], clip: { x: r[0], y: r[1] + r[3] * 0.55, width: r[2], height: r[3] * 0.45 } });
await t.close();
