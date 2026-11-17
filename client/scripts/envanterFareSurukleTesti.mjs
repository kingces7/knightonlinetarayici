// Geliştirme aracı (yerel mod): envanterde SOL tuşla gerçek fare sürüklemesi — çanta→çanta, tek elli silah→sol el (kalkan yuvası), ekipman→çanta, çöp. Kullanım: node scripts/envanterFareSurukleTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { const o = window.ke.oyuncu; const sw = { ...(o.ekipman[6] ?? o.envanter.find(Boolean)), yuva: 0, ad: 'Test Sword', sayilabilir: false }; o.envanter.fill(null); o.ekipman[8] = null; o.ekipman[6] = { ...sw, ad: 'Right Sword' }; o.envanter[5] = sw; o.envanter[6] = { ...sw, ad: 'Test Sword 2' }; });
await s.keyboard.press('KeyI'); await s.waitForTimeout(900);
const nokta = (id) => s.evaluate((id) => { const a = window.ke.arayuz(); const el = id[0] === 'c' ? a.canta()[+id.slice(1)] : a.ekipman(+id.slice(1)); const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, id);
const sur = async (a, b) => { const [x1, y1] = await nokta(a), [x2, y2] = await nokta(b); await s.mouse.move(x1, y1); await s.mouse.down(); await s.mouse.move(x2, y2, { steps: 12 }); await s.mouse.up(); await s.waitForTimeout(300); };
const durum = () => s.evaluate(() => ({ canta: window.ke.oyuncu.envanter.map((e, i) => e ? `${i}:${e.ad}` : null).filter(Boolean), sol: window.ke.oyuncu.ekipman[8]?.ad ?? null, sag: window.ke.oyuncu.ekipman[6]?.ad ?? null }));
await sur('c5', 'c20'); console.log('1) çanta→çanta (5→20)', JSON.stringify(await durum()));
await sur('c20', 'e8'); console.log('2) tek elli silah→sol el (kalkan yuvası)', JSON.stringify(await durum()));
await sur('e8', 'c9'); console.log('3) sol elden çantaya (9)', JSON.stringify(await durum()));
await sur('c6', 'e14'); await s.waitForTimeout(300);
console.log('4) çöpe bırak → onay penceresi', await s.evaluate(() => [...document.querySelectorAll('.ui-yazi')].some((y) => /destroy/i.test(y.textContent ?? '') && y.offsetParent !== null)));
console.log('hatalar', h); await t.close();
