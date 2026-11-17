// Geliştirme aracı: yerel modda mağaza — sağ tıkla 111 adet al, envanter yığınına sağ tıkla 20 adet sat (kalan 91). Kullanım: node scripts/magazaIslevTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = 'E:/tmp'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.altin = 50000; window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis === 255000)); }); await s.waitForTimeout(1800);
const orta = (grup, i) => s.evaluate(([g, i]) => { const e = window.ke.arayuz().magazaYeni[g][i]; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [grup, i]);
const env = () => s.evaluate(() => window.ke.oyuncu.envanter.filter(Boolean).map((e) => `${e.ad} x${e.adet ?? 1}`));
let a = await orta('magaza', 0); await s.mouse.click(a[0], a[1], { button: 'right' }); await s.waitForTimeout(300);
await s.screenshot({ path: `${klasor}/soru.png`, clip: { x: 880, y: 0, width: 400, height: 520 } });
await s.keyboard.press('Control+A'); await s.keyboard.type('111'); await s.keyboard.press('Enter'); await s.waitForTimeout(400); console.log('alış sonrası', await env());
await s.evaluate(() => { window.ke.oyuncu.envanter[0].fiyat = 60; }); const c = await orta('canta', 0); await s.mouse.click(c[0], c[1], { button: 'right' }); await s.waitForTimeout(300);
await s.screenshot({ path: `${klasor}/satis.png`, clip: { x: 880, y: 0, width: 400, height: 520 } });
console.log('sağ tıktan sonra envanter (henüz satılmamış olmalı)', await env());
await s.keyboard.press('Control+A'); await s.keyboard.type('20'); await s.keyboard.press('Enter'); await s.waitForTimeout(400); console.log('20 adet satış sonrası', await env());
console.log('hatalar', h); await t.close();
