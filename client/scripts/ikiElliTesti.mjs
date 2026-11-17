// Geliştirme aracı (yerel mod): sağ elde silah (+sol elde kalkan) varken iki elli silah giyilir; öbür el çantaya alınır. Kullanım: node scripts/ikiElliTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { const o = window.ke.oyuncu; const b = { ...(o.ekipman[6] ?? o.envanter.find(Boolean)), sayilabilir: false }; o.envanter.fill(null); o.ekipman[6] = { ...b, yuva: 0, ad: 'Sword 1H' }; o.ekipman[8] = { ...b, yuva: 2, ad: 'Shield' }; o.envanter[3] = { ...b, yuva: 3, ad: 'Great Axe 2H' }; o.envanter[4] = { ...b, yuva: 4, ad: 'Bow 2H' }; });
const durum = () => s.evaluate(() => ({ sag: window.ke.oyuncu.ekipman[6]?.ad ?? null, sol: window.ke.oyuncu.ekipman[8]?.ad ?? null, canta: window.ke.oyuncu.envanter.map((e, i) => e ? `${i}:${e.ad}` : null).filter(Boolean) }));
await s.keyboard.press('KeyI'); await s.waitForTimeout(800);
const sag = (i) => s.evaluate((i) => { const el = window.ke.arayuz().canta()[i]; const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); el.dispatchEvent(ev); }, i);
await sag(3); await s.waitForTimeout(300); console.log('2H balta (sağ tık):', JSON.stringify(await durum()));
await sag((await durum()).canta.find((x) => x.includes('Bow')).split(':')[0] * 1); await s.waitForTimeout(300); console.log('2H yay (sağ tık):', JSON.stringify(await durum()));
console.log('hatalar', h); await t.close();
