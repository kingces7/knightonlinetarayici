// Geliştirme aracı (yerel mod): bankaya/bankadan Noah aktarırken miktar sorulur. Kullanım: node scripts/depoNoahTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.altin = 5000; window.ke.arayuz().depoAc(); }); await s.waitForTimeout(1500);
const bak = () => s.evaluate(() => ({ altin: window.ke.oyuncu.altin, banka: window.ke.oyuncu.depoAltin }));
const tikla = async (id) => { const p = await s.evaluate((id) => { const e = [...window.ke.arayuz().pencereler.depo.bul(id)].find((x) => x.offsetParent) ?? window.ke.arayuz().pencereler.depo.bul(id)[0]; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id); await s.mouse.click(p[0], p[1]); await s.waitForTimeout(300); };
await tikla('btn_gold'); console.log('tıklayınca Noah değişmemeli (kutu açıldı)', await bak(), 'kutu', await s.evaluate(() => !!window.ke.arayuz().pencereler.depo.el.querySelector('input')));
await s.screenshot({ path: 'E:/tmp/noah.png', clip: { x: 880, y: 0, width: 400, height: 520 } });
await s.keyboard.press('Control+A'); await s.keyboard.type('1200'); await s.keyboard.press('Enter'); await s.waitForTimeout(300); console.log('1200 yatırınca', await bak());
await tikla('btn_gold_warehouse'); await s.keyboard.press('Control+A'); await s.keyboard.type('500'); await s.keyboard.press('Enter'); await s.waitForTimeout(300); console.log('500 çekince', await bak());
console.log('hatalar', h); await t.close();
