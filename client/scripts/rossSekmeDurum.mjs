// Geliştirme aracı (ross): Quest penceresindeki sekme düğmelerinin hangi durum resmini gösterdiğini yazar. Edge CDP 9333.
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(async () => { await window.ke.arayuz().genel.ac('re_el_page_quest'); });
await s.waitForTimeout(600);
console.log(JSON.stringify(await s.evaluate(() => {
  const p = window.ke.arayuz().genel.pencere('re_el_page_quest');
  return ['btn_state', 'btn_title', 'btn_clan', 'btn_friends'].map((id) => { const b = p.bul(id)[0]; return { id, durumlar: [...b.querySelectorAll('.ui-durum')].map((d) => [d.style.display, d.style.backgroundPosition]) }; });
}), null, 1));
await s.close(); await t.close();
