// Geliştirme aracı (ross): Character Report sekme düğmelerinin stilini yazar. Edge CDP 9333.
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.keyboard.press('KeyU'); await s.waitForTimeout(900);
console.log(JSON.stringify(await s.evaluate(() => [...window.ke.arayuz().pencereler.durum.el.querySelectorAll('[data-sekme]')].map((e) => ({ k: e.dataset.sekme, pos: e.style.backgroundPosition, size: e.style.backgroundSize, w: e.offsetWidth, h: e.offsetHeight, ust: e.style.top, sol: e.style.left })))));
await s.close(); await t.close();
