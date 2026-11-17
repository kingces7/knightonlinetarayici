import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0)); }); await s.waitForTimeout(1800);
console.log(await s.evaluate(() => { const m = window.ke.arayuz().magazaYeni; return m ? JSON.stringify(['magaza', 'canta', 'sepetAl', 'sepetSat'].map((g) => [g, Object.keys(m[g]).length])) : 'null'; }));
await t.close();
