import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const r = {};
await s.evaluate(() => { const c = window.ke.arayuz().cubuk.el; c.style.left = '10px'; c.style.top = '150px'; }); // çubuğu haritanın yerine koy
const cubuk = () => s.evaluate(() => { const c = window.ke.arayuz().cubuk.el; return [c.style.left, c.style.top]; });
r.once = await cubuk();
await s.keyboard.press('KeyM'); await s.waitForTimeout(1500);
r.acikken = await cubuk();
r.harita = await s.evaluate(() => { const b = window.ke.arayuz().genel.pencere('re_minimap').el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right)]; });
await s.evaluate(() => { window.ke.arayuz().genel.pencere('re_minimap').bul('Btn_ZoomIn')[0].click(); window.ke.arayuz().genel.pencere('re_minimap').bul('Btn_ZoomIn')[0].click(); });
await s.waitForTimeout(600); await s.screenshot({ path: process.argv[2], clip: { x: 0, y: 60, width: 420, height: 380 } });
await s.keyboard.press('KeyM'); await s.waitForTimeout(500); r.kapaliyken = await cubuk();
console.log(JSON.stringify({ h, r })); await s.close(); await t.close();
