// Geliştirme aracı: yerel modda mağaza penceresi — sağ tık + adet sorusu, sürükleyerek alma, sağ tıkla satma. Kullanım: node scripts/magazaIslevTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = 'E:/tmp'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.altin = 50000; window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0)); }); await s.waitForTimeout(1800);
const orta = (grup, i) => s.evaluate(([g, i]) => { const e = window.ke.arayuz().magazaYeni[g][i]; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [grup, i]);
const env = () => s.evaluate(() => window.ke.oyuncu.envanter.filter(Boolean).map((e) => e.ad));
let a = await orta('magaza', 0); await s.mouse.click(a[0], a[1], { button: 'right' }); await s.waitForTimeout(300);
await s.screenshot({ path: `${klasor}/soru.png` });
await s.keyboard.press('Control+A'); await s.keyboard.type('3'); await s.keyboard.press('Enter'); await s.waitForTimeout(500); console.log('sağ tık + 3 adet sonrası', await env());
a = await orta('magaza', 1); const c = await orta('canta', 9); await s.mouse.move(a[0], a[1]); await s.mouse.down(); await s.mouse.move(c[0], c[1], { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(400);
await s.keyboard.press('Enter'); await s.waitForTimeout(500); console.log('sürükle + Enter (1 adet) sonrası', await env());
await s.screenshot({ path: `${klasor}/magaza.png` });
const sat = await orta('canta', 0); await s.mouse.click(sat[0], sat[1], { button: 'right' }); await s.waitForTimeout(500); console.log('sağ tıkla satış sonrası', await env());
console.log('hatalar', h); await t.close();
