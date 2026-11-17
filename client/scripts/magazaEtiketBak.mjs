import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0))); await s.waitForTimeout(1800);
console.log(JSON.stringify(await s.evaluate(() => { const m = window.ke.arayuz().magazaYeni.p.el; const r0 = m.getBoundingClientRect(); const ol = r0.width / 362; const res = []; m.querySelectorAll('.ui-t4').forEach((e) => { const k = e.getBoundingClientRect(); const y0 = (k.top - r0.top) / ol, y1 = (k.bottom - r0.top) / ol; if (y1 > 290 && y0 < 345 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).backgroundImage !== 'none') res.push([Math.round((k.left - r0.left) / ol), Math.round(y0), Math.round(k.width / ol), Math.round(k.height / ol), e.dataset.id || '', e.style.backgroundImage.slice(-22), e.style.opacity]); }); return res; })));
await t.close();
