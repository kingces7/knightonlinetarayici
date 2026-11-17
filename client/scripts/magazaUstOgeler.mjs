import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0))); await s.waitForTimeout(1800);
console.log(JSON.stringify(await s.evaluate(() => { const m = window.ke.arayuz().magazaYeni.p.el; const r = []; m.querySelectorAll('*').forEach((e) => { const t = parseFloat(e.style.top); if (t < 100 && getComputedStyle(e).backgroundImage !== 'none') r.push([e.dataset.id || '', e.className.split(' ').pop(), Math.round(parseFloat(e.style.left)), Math.round(t), Math.round(parseFloat(e.style.width)), Math.round(parseFloat(e.style.height))]); }); return r; })));
await t.close();
