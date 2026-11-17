// Geliştirme aracı (yerel mod): bankaya sağ tık, sürükleyerek bırakma, banka içinde taşıma, geri alma. Kullanım: node scripts/depoSurukleTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(async () => { const tum = await (await fetch('/esya/tum.json')).json(); const o = window.ke.oyuncu; o.envanter[0] = { ...tum.find((x) => x.ad === 'Short Blade'), sunucuNo: 120110000 }; o.envanter[1] = { ...tum.find((x) => x.ad === 'Spear'), sunucuNo: 150210000 }; window.ke.arayuz().depoAc(); });
await s.waitForTimeout(1500);
const depo = () => s.evaluate(() => window.ke.oyuncu.depo.map((e, i) => e ? `${i}:${e.ad}` : null).filter(Boolean));
const canta = () => s.evaluate(() => window.ke.oyuncu.envanter.map((e, i) => e ? `${i}:${e.ad}` : null).filter(Boolean));
const yer = (yer, i) => s.evaluate(([y, i]) => { const a = window.ke.arayuz(); const el = (y === 'depo' ? a.depoUst() : a.depoAlt())[i]; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [yer, i]);
const surukle = async (a, b) => { await s.mouse.move(a[0], a[1]); await s.mouse.down(); await s.mouse.move(b[0], b[1], { steps: 10 }); await s.mouse.up(); await s.waitForTimeout(300); };
let p = await yer('canta', 0); await s.mouse.click(p[0], p[1], { button: 'right' }); await s.waitForTimeout(300); console.log('sağ tık (çanta→banka)', 'banka', await depo(), 'çanta', await canta());
await surukle(await yer('canta', 1), await yer('depo', 7)); console.log('sürükle çanta→banka yuva 7', 'banka', await depo(), 'çanta', await canta());
await surukle(await yer('depo', 7), await yer('depo', 12)); console.log('banka içi 7→12', 'banka', await depo());
await surukle(await yer('depo', 12), await yer('canta', 5)); console.log('sürükle banka→çanta yuva 5', 'banka', await depo(), 'çanta', await canta());
p = await yer('depo', 0); await s.mouse.click(p[0], p[1], { button: 'right' }); await s.waitForTimeout(300); console.log('sağ tık (banka→çanta)', 'banka', await depo(), 'çanta', await canta());
console.log('hatalar', h); await t.close();
