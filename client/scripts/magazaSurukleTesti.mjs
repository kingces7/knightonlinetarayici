// Geliştirme aracı (yerel mod): Potion merchant'tan potu envantere SÜRÜKLEYİP kaç tane sorusu, tekerlekle sayfa. Kullanım: node scripts/magazaSurukleTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.altin = 50000; window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis === 253000)); }); await s.waitForTimeout(1800);
const orta = (g, i) => s.evaluate(([g, i]) => { const e = window.ke.arayuz().magazaYeni[g][i]; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.bottom - 4]; }, [g, i]); // yuvanın ALT kenarından tut
const env = () => s.evaluate(() => window.ke.oyuncu.envanter.map((e, i) => e ? `${i}:${e.ad} x${e.adet ?? 1}` : null).filter(Boolean));
const a = await orta('magaza', 0), c = await orta('canta', 4);
await s.mouse.move(a[0], a[1]); await s.mouse.down(); await s.mouse.move(c[0], c[1], { steps: 12 }); await s.mouse.up(); await s.waitForTimeout(400);
console.log('sürükleyince adet kutusu açıldı mı', await s.evaluate(() => !!window.ke.arayuz().magazaYeni.p.el.querySelector('input')));
await s.keyboard.press('Control+A'); await s.keyboard.type('25'); await s.keyboard.press('Enter'); await s.waitForTimeout(400);
console.log('25 adet alındı', await env());
await s.mouse.move(1100, 300); await s.mouse.wheel(0, 100); await s.waitForTimeout(200); console.log('tekerlek → sayfa', await s.evaluate(() => window.ke.arayuz().magazaYeni.sayfa + 1));
console.log('hatalar', h); await t.close();
