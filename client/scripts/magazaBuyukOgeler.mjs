import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0))); await s.waitForTimeout(1800);
console.log(JSON.stringify(await s.evaluate(() => { const m = window.ke.arayuz().magazaYeni.p.el; const r = []; m.querySelectorAll('*').forEach((e) => { const w = parseFloat(e.style.width), h = parseFloat(e.style.height); if (w >= 200 && h >= 30 && getComputedStyle(e).backgroundImage !== 'none') r.push([e.className.split(' ').pop(), e.dataset.id || '', Math.round(parseFloat(e.style.left)), Math.round(parseFloat(e.style.top)), w, h, e.style.backgroundImage.slice(-22)]); }); return r; })));
await t.close();
