// Geliştirme aracı (ross): terfi etmiş sınıfla skill penceresini açıp görüntü alır (ağaç puanı satırları). Edge CDP 9333.
import { chromium } from 'playwright-core';
const [klasor = '.', sinif = '205'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = t.contexts()[0]; const s = await ctx.newPage();
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate((n) => { window.ke.oyuncu.sinif = Number(n); window.ke.arayuz().sinifAyarla(Number(n)); }, sinif);
await s.keyboard.press('KeyK'); await s.waitForTimeout(1000);
const c = await ctx.newCDPSession(s);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 2, mobile: false });
await s.waitForTimeout(900);
const b = await s.evaluate(() => { const e = window.ke.arayuz().pencereler.beceri.el.getBoundingClientRect(); return [e.left, e.top]; });
await s.screenshot({ path: `${klasor}/sk_${sinif}.png`, clip: { x: b[0], y: b[1] - 5, width: 380, height: 300 } });
await s.close(); await t.close();
