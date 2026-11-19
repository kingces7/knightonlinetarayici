import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const r = {};
for (const ad of ['re_seed_helper', 're_el_dailyoverallrank', 'co_show_icon', 're_target_framebar']) {
  r[ad] = await s.evaluate(async (ad) => { const a = window.ke.arayuz(); const ok = await a.genel.ac(ad); const p = a.genel.pencere(ad); return ok && p ? [...p.el.querySelectorAll('span')].filter((e) => /[^\x00-\x7f]/.test(e.textContent)).length : 'acilmadi'; }, ad);
}
console.log(JSON.stringify(r)); await s.close(); await t.close();
