import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 720 } });
s.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 300)));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p, undefined, 'KEAdmin'), [process.env.KO_HESAP, process.env.KO_SIFRE]); await s.waitForTimeout(2500);
console.log(await s.evaluate(() => ({ gm: window.ke.oyuncu.gm, ekipman: window.ke.oyuncu.ekipman.map((e, i) => e ? i + ':' + e.ad : null).filter(Boolean) })));
await t.close();
