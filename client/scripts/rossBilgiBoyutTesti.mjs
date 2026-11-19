// Geliştirme aracı (ross): bilgi ve sohbet pencerelerini köşeden büyütüp görüntü alır. Edge CDP 9333.
// Kullanım: node scripts/rossBilgiBoyutTesti.mjs <klasor> [genislik] [yukseklik]
import { chromium } from 'playwright-core';
const [klasor = '.', w = '1280', h = '720'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.evaluate(() => { try { localStorage.removeItem('ke_pencere_bilgi'); localStorage.removeItem('ke_pencere_sohbet'); } catch { /* */ } });
await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => {
  const a = window.ke.arayuz();
  for (let i = 0; i < 30; i++) a.bilgiMesaji(`You hit Raptor for ${100 + i} damage.`, i % 2 ? 'hasar' : 'odul');
  for (let i = 0; i < 20; i++) a.sohbetYaz(`[Normal] Test${i}: hello there`);
});
const kutu = async (ad) => { const r = await s.evaluate((ad) => { const b = window.ke.arayuz()[ad].el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, ad); return { x: Math.max(0, r[0] - 10), y: Math.max(0, r[1] - 10), width: r[2] + 20, height: r[3] + 20 }; };
await s.screenshot({ path: `${klasor}/r0.png` });
// bilgi penceresini sol üst köşeden büyüt
const k = await kutu('bilgi'); const x0 = k.x + 10 + 4, y0 = k.y + 10 + 4;
await s.mouse.move(x0, y0); await s.mouse.down(); await s.mouse.move(x0 - 120, y0 - 100, { steps: 8 }); await s.mouse.up();
await s.waitForTimeout(300);
await s.screenshot({ path: `${klasor}/r1_bilgi.png`, clip: await kutu('bilgi') });
// sohbet penceresini sağ üst köşeden büyüt
const c = await s.evaluate(() => { const b = window.ke.arayuz().sohbet.el.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width }; }); const x1 = c.x + c.width - 4, y1 = c.y + 4;
await s.mouse.move(x1, y1); await s.mouse.down(); await s.mouse.move(x1 + 150, y1 - 80, { steps: 8 }); await s.mouse.up();
await s.waitForTimeout(300);
await s.screenshot({ path: `${klasor}/r2_sohbet.png`, clip: await kutu('sohbet') });
console.log(JSON.stringify({ hatalar }));
await s.close(); await t.close();
