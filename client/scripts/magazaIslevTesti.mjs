// Geliştirme aracı: yerel modda mağaza penceresi — çift tıkla alma, sürükleyerek alma, sepet, sat. Kullanım: node scripts/magazaIslevTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = 'E:/tmp'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.altin = 50000; window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0)); }); await s.waitForTimeout(1800);
const orta = (grup, i) => s.evaluate(([g, i]) => { const e = window.ke.arayuz().magazaYeni[g][i]; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [grup, i]);
const env = () => s.evaluate(() => window.ke.oyuncu.envanter.filter(Boolean).map((e) => e.ad));
let a = await orta('magaza', 0); await s.mouse.dblclick(a[0], a[1]); await s.waitForTimeout(500); console.log('çift tık sonrası', await env());
a = await orta('magaza', 1); let c = await orta('canta', 5); await s.mouse.move(a[0], a[1]); await s.mouse.down(); await s.mouse.move(c[0], c[1], { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(500); console.log('sürükleyerek al sonrası', await env());
a = await orta('magaza', 2); c = await orta('sepet', 0); await s.mouse.move(a[0], a[1]); await s.mouse.down(); await s.mouse.move(c[0], c[1], { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(500);
await s.screenshot({ path: `${klasor}/islem.png` });
await s.evaluate(() => window.ke.arayuz().magazaYeni.sepetiYolla(false)); await s.waitForTimeout(500); console.log('sepet alışı sonrası', await env());
c = await orta('canta', 0); await s.mouse.click(c[0], c[1], { button: 'right' }); await s.waitForTimeout(500); console.log('sağ tıkla satış sonrası', await env(), 'altın', await s.evaluate(() => window.ke.oyuncu.altin));
console.log('hatalar', h); await t.close();
