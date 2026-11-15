// Geliştirme aracı: R ile saldırı başlar, S ile durur; skill çubuğu görünümünü kaydeder.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.keyboard.press('KeyZ'); await s.keyboard.press('KeyR'); await s.waitForTimeout(400);
const once = await s.evaluate(() => window.ke.oyuncu.saldiriyor);
await s.keyboard.down('KeyS'); await s.waitForTimeout(150); await s.keyboard.up('KeyS'); await s.waitForTimeout(400);
const sonra = await s.evaluate(() => ({ s: window.ke.oyuncu.saldiriyor, hedef: !!window.ke.oyuncu.hedef }));
await s.screenshot({ path: `${klasor}/cubuk_son.png`, clip: { x: 0, y: 150, width: 200, height: 420 } });
console.log(JSON.stringify({ once, sonra, hatalar }));
await t.close();
