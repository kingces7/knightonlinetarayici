// Geliştirme aracı: silah türüne göre animasyon seçimi, S ile geri yürüme, canavar darbe/ölüm çeşitleri.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const ad = () => s.evaluate(() => { const m = window.ke.oyuncu.model; const k = m.aktif?.getClip?.().name; return k; });
const r = {};
r.silah = await s.evaluate(() => ({ ad: window.ke.oyuncu.ekipman[6]?.ad, tip: window.ke.oyuncu.ekipman[6]?.tip }));
await s.waitForTimeout(500); r.bekle = await ad();
await s.keyboard.down('KeyW'); await s.waitForTimeout(500); r.W = await ad(); await s.keyboard.up('KeyW');
await s.keyboard.down('KeyS'); await s.waitForTimeout(500); r.S = await ad(); await s.keyboard.up('KeyS');
await s.waitForTimeout(400);
await s.keyboard.press('KeyZ'); await s.keyboard.press('KeyR'); await s.waitForTimeout(2500); r.saldiri = await ad();
// silahı çıkar → yumruk animasyonu
await s.evaluate(() => { window.ke.oyuncu.ekipman[6] = null; window.ke.oyuncu.hedef = null; window.ke.oyuncu.saldiriyor = false; });
await s.waitForTimeout(800); r.silahsizBekle = await ad();
r.hatalar = hatalar;
console.log(JSON.stringify(r, null, 1));
await t.close();
