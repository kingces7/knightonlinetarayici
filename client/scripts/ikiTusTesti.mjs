// Geliştirme aracı: sol tuş basılıyken sağ tuşla kamera dönüşü; ileri yürüme; kamera eğimi.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
const d = () => s.evaluate(() => ({ x: window.ke.oyuncu.konum.x, y: window.ke.oyuncu.konum.y, aci: window.ke.kamera.aci, egim: window.ke.kamera.egim * 57.3 }));
const a = await d();
await s.mouse.move(683, 300); await s.mouse.down();
await s.mouse.move(700, 280, { steps: 3 }); await s.waitForTimeout(300);
const b = await d();
await s.mouse.down({ button: 'right' });
for (let i = 0; i < 12; i++) { await s.mouse.move(700 + i * 12, 280, { steps: 1 }); await s.waitForTimeout(60); }
await s.waitForTimeout(500); const c = await d();
await s.mouse.up({ button: 'right' }); await s.mouse.up();
console.log(JSON.stringify({ solYol: +Math.hypot(b.x - a.x, b.y - a.y).toFixed(2), ikiTusYol: +Math.hypot(c.x - b.x, c.y - b.y).toFixed(2), kameraDonus: +(c.aci - b.aci).toFixed(3), egimDerece: +a.egim.toFixed(1), hatalar }));
await s.screenshot({ path: process.argv[2] + '/kamera23.png' });
await t.close();
