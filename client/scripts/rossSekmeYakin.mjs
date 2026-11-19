// Geliştirme aracı (ross): Character Report penceresinin sekme şeridini 3 kat büyütüp kaydeder. Edge CDP 9333.
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = t.contexts()[0]; const s = await ctx.newPage();
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const genel = process.argv[3]; if (genel) await s.evaluate(async (ad) => { await window.ke.arayuz().genel.ac(ad); }, genel); else await s.keyboard.press('KeyU'); await s.waitForTimeout(900);
const kutu = await s.evaluate((ad) => { const p = ad ? window.ke.arayuz().genel.pencere(ad) : window.ke.arayuz().pencereler.durum; const b = p.el.getBoundingClientRect(); return [b.left, b.top]; }, genel);
const c = await ctx.newCDPSession(s);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 3, mobile: false });
await s.waitForTimeout(900);
if (process.argv[4] === 'kapat') await s.evaluate(() => { for (const e of document.querySelectorAll('[data-sekme]')) e.innerHTML = ''; });
await s.screenshot({ path: process.argv[2], clip: { x: Math.max(0, kutu[0]), y: kutu[1] + 30, width: 300, height: 70 } });
await s.close(); await t.close();
