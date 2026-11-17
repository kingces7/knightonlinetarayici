import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0))); await s.waitForTimeout(1800);
console.log(JSON.stringify(await s.evaluate(() => { const out = []; for (const [x, y] of [[996, 390], [1000, 352], [1100, 420]]) document.elementsFromPoint(x, y).forEach((e) => { const bi = getComputedStyle(e).backgroundImage; if (bi !== 'none') out.push([x, y, e.className.split(' ').pop(), e.dataset.id || '', e.style.left, e.style.top, e.style.width, e.style.height, e.style.opacity, bi.slice(-26)]); }); return out; })));
await t.close();
