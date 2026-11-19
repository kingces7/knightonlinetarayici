// Geliştirme aracı (ross): envanter penceresinin alt kısmını 3 kat büyütüp kaydeder (Coin alanı). Edge CDP 9333.
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = t.contexts()[0]; const s = await ctx.newPage();
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.keyboard.press('KeyI'); await s.waitForTimeout(900);
const c = await ctx.newCDPSession(s);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 3, mobile: false });
await s.waitForTimeout(900);
if (process.argv[3] === 'taş') await s.evaluate(() => { const p = window.ke.arayuz().pencereler.envanter; p.goster('btn_gold', true); for (const e of p.bul('text_gold')[0].parentElement.children) if (e.style.backgroundImage.includes('noah')) e.style.display = 'none'; });
const k = await s.evaluate(() => { const p = window.ke.arayuz().pencereler.envanter; const b = p.el.getBoundingClientRect(); const e = p.bul('text_gold')[0].getBoundingClientRect(); return { x: b.left, y: e.top - 12, w: b.width, o: p.olcek }; });
await s.screenshot({ path: process.argv[2], clip: { x: k.x + k.w - 180, y: k.y - 8, width: 170, height: 50 } });
console.log(JSON.stringify(k));
await s.close(); await t.close();
