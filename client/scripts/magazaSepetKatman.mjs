import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0))); await s.waitForTimeout(1800);
console.log(JSON.stringify(await s.evaluate(() => { const m = window.ke.arayuz().magazaYeni; const e = m.sepet[3]; const r = e.getBoundingClientRect(); const out = []; document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).forEach((x) => { if (getComputedStyle(x).backgroundImage !== 'none') out.push([x.className.split(' ').pop(), x.dataset.id || '', x.style.width, x.style.height, x.style.opacity, x.style.backgroundImage.slice(-24)]); }); return out; })));
await t.close();
