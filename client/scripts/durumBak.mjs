// Geliştirme aracı: durum (U) penceresini açıp ekran görüntüsü alır.
import { chromium } from 'playwright-core';
const [klasor = '.', ek = ''] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2000);
await s.keyboard.press('KeyU'); await s.waitForTimeout(800);
if (ek) await s.evaluate(ek);
await s.waitForTimeout(500);
await s.screenshot({ path: `${klasor}/durum.png`, clip: { x: 0, y: 0, width: 520, height: 768 } });
console.log(JSON.stringify({ hatalar }));
await t.close();
