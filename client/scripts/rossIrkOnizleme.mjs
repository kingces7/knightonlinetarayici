// Geliştirme aracı (ross): oyuncu modelini farklı ırklara çevirip envanter önizlemesinin uyduğunu doğrular. Edge CDP 9333.
// Kullanım: node scripts/rossIrkOnizleme.mjs <klasor>
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.keyboard.press('KeyI'); await s.waitForTimeout(1500);
const r = {};
for (const [ad, no] of [['karus_erkek_12', 7001], ['elmorad_kadin_13', 7013], ['barbar_11', 7011], ['baslangic_12', 7012]]) {
  await s.evaluate(async (no) => { await window.ke.oyuncu.modelDegistir(no); }, no);
  await s.waitForTimeout(2500);
  r[ad] = await s.evaluate(() => ({ oyuncu: window.ke.oyuncu.modelNo, onizleme: window.ke.arayuz().onizleme?.modelNo }));
  const b = await s.evaluate(() => { const e = window.ke.arayuz().pencereler.envanter.bul('area_char')[0].getBoundingClientRect(); return [e.left, e.top, e.width, e.height]; });
  await s.screenshot({ path: `${klasor}/irk_${ad}.png`, clip: { x: b[0], y: b[1], width: Math.min(b[2], 200), height: Math.min(b[3], 270) } });
}
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
