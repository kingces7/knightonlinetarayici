import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.arayuz().depoAc()); await s.waitForTimeout(1500);
console.log(await s.evaluate(() => { const p = window.ke.arayuz().pencereler.depo.el; const r = p.getBoundingClientRect(); return JSON.stringify({ l: r.left, t: r.top, r: r.right, cls: p.className }); }));
await s.screenshot({ path: 'E:/tmp/depo.png' });
await t.close();
