import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0))); await s.waitForTimeout(2000);
console.log(await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_buy],[data-id=btn_tab_item_sell]')].map((e) => e.outerHTML.slice(0, 900)).join('\n---\n')));
await t.close();
