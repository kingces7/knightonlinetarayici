// Geliştirme aracı (ross): bilgi penceresinin alt sekme şeridini 4 kat büyütüp kaydeder. Edge CDP 9333.
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = t.contexts()[0]; const s = await ctx.newPage();
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const c = await ctx.newCDPSession(s);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 4, mobile: false });
await s.waitForTimeout(800);
const r = await s.evaluate(() => { const b = window.ke.arayuz().bilgi.el.getBoundingClientRect(); return [b.right, b.bottom]; });
await s.screenshot({ path: process.argv[2], clip: { x: r[0] - 330, y: r[1] - 30, width: 330, height: 30 } });
await s.close(); await t.close();
