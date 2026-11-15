// Geliştirme aracı: ana arayüzü açık pencerelerle çeker (denetim için).
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1600, height: 900 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.screenshot({ path: `${klasor}/ui_a.png` });
await s.keyboard.press('KeyI'); await s.keyboard.press('KeyU'); await s.waitForTimeout(900);
await s.screenshot({ path: `${klasor}/ui_b.png` });
console.log(JSON.stringify({ hatalar }));
await t.close();
