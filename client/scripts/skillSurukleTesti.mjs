// Geliştirme aracı (yerel mod): skill penceresinden çubuğa, çubukta yer değiştirme, çubuktan dışarı sürükleme (gerçek fare). Kullanım: node scripts/skillSurukleTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
s.on('console', (m) => { if (/BIRAK/.test(m.text())) console.log(m.text()); }); await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.seviye = 10; }); await s.keyboard.press('KeyK'); await s.waitForTimeout(800);
const bar = () => s.evaluate(() => window.ke.arayuz().cubukBeceri.slice(0, 8).join(','));
const nokta = (tur, i) => s.evaluate(([tur, i]) => { const a = window.ke.arayuz(); const el = tur === 'b' ? a.pencereler.beceri.alan(String(i)) : a.cubukYuvalari().find((x) => a.cubukSira(x) === i && x.getBoundingClientRect().width > 0); const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, [tur, i]);
const sur = async (a, b) => { const [x1, y1] = a, [x2, y2] = b; await s.mouse.move(x1, y1); await s.mouse.down(); await s.mouse.move(x2, y2, { steps: 12 }); await s.mouse.up(); await s.waitForTimeout(300); };
console.log('başta   ', await bar(), await s.evaluate(() => [window.ke.arayuz().beceriler.length, window.ke.arayuz().sinifBecerileri.length, window.ke.arayuz().cubukSinif]));
await sur(await nokta('b', 2), await nokta('c', 6)); console.log('pencere→çubuk 7. yuva', await bar());
await sur(await nokta('c', 6), await nokta('c', 4)); console.log('çubukta 7→5 yer değiştir', await bar());
await sur(await nokta('c', 4), [640, 300]); console.log('çubuktan dışarı = kaldır', await bar());
console.log('hatalar', h); await t.close();
