// Geliştirme aracı: buff şeridi sürükleme. Yalnız kotest (Sprint benzeri bir buff'ı elle ekler).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(() => { const o = window.ke.oyuncu; o.buflar.push({ no: 108010, ad: 'Sprint', bitis: performance.now() / 1000 + 60, hiz: 0, ac: 0, sure: 60 }, { no: 108020, ad: 'Swift', bitis: performance.now() / 1000 + 40, hiz: 0, ac: 0, sure: 60 }); });
await s.waitForTimeout(1500);
const tutac = await s.evaluate(() => { const e = [...document.querySelectorAll('div')].find((x) => x.title === 'Drag to move'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
console.log('tutaç', JSON.stringify(tutac));
await s.screenshot({ path: 'E:/tmp/ss/buff_once.png', clip: { x: 0, y: 60, width: 400, height: 200 } });
await s.mouse.move(tutac.x, tutac.y); await s.mouse.down(); await s.mouse.move(tutac.x + 400, tutac.y + 200, { steps: 8 }); await s.mouse.up();
await s.waitForTimeout(500);
console.log('sonra', JSON.stringify(await s.evaluate(() => { const e = [...document.querySelectorAll('div')].find((x) => x.title === 'Drag to move'); const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), kayit: localStorage.getItem('ke.buffKonum') }; })));
await s.screenshot({ path: 'E:/tmp/ss/buff_sonra.png' });
await t.close();
