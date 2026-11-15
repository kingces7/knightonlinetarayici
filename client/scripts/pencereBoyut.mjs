// Geliştirme aracı: sohbet/bilgi pencerelerini köşeden büyütür, kenardan taşır, kilitler.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2000);
const kutu = (ad) => s.evaluate((a) => { const e = [...document.querySelectorAll('.ui-pencere')].find((x) => x.querySelector(`[data-id="${a}"]`)); const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }, ad);
const surukle = async (x, y, dx, dy) => { await s.mouse.move(x, y); await s.mouse.down(); await s.mouse.move(x + dx, y + dy, { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(150); };
const c0 = await kutu('text0'); const b0 = await kutu('text_message');
await surukle(c0[0] + c0[2] - 5, c0[1] + 5, 160, -150);       // sohbet: sağ üst köşe
const c1 = await kutu('text0');
await surukle(b0[0] + 5, b0[1] + 5, -120, -140);               // bilgi: sol üst köşe
const b1 = await kutu('text_message');
await surukle(c1[0] + 200, c1[1] + 3, 40, -60);                // sohbet: üst kenardan taşı
const c2 = await kutu('text0');
await s.screenshot({ path: `${klasor}/boyut1.png` });
// kilitle: sohbetin sağ alt topu
const top = await s.evaluate(() => { const e = [...document.querySelectorAll('.ui-pencere')].find((x) => x.querySelector('[data-id="text0"]')); const t = [...e.children].find((c) => c.title?.startsWith('Unlocked')); const r = t.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await s.mouse.click(...top); await s.waitForTimeout(200);
await surukle(c2[0] + 200, c2[1] + 3, 100, 100);
const c3 = await kutu('text0');
console.log(JSON.stringify({ sohbet_once: c0, sohbet_buyudu: c1, sohbet_tasindi: c2, sohbet_kilitliyken: c3, bilgi_once: b0, bilgi_sonra: b1, hatalar }));
await t.close();
