// Geliştirme aracı: yerel modda sağ/sol ele eşya takar, yakın çekim görüntü alır. Kullanım: node scripts/elTesti.mjs <klasör> <sağ no|0>,<sol no|0> [...]
import { chromium } from 'playwright-core';
const [klasor, ...ciftler] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 900, height: 700 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.oyuncu?.model, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.kamera.uzaklik = 3.2; window.ke.kamera.aci = Math.PI * 1.1; });
const tum = await (await fetch('http://localhost:5173/esya/tum.json')).json();
for (const c of ciftler) {
  const [sag, sol] = c.split(',').map(Number);
  await s.evaluate(([a, b]) => { const o = window.ke.oyuncu; o.ekipman[6] = a ? { ...a, sunucuNo: a.no } : null; o.ekipman[8] = b ? { ...b, sunucuNo: b.no } : null; }, [tum.find((x) => x.no === sag), tum.find((x) => x.no === sol)]);
  await s.waitForTimeout(2500);
  await s.screenshot({ path: `${klasor}/el_${sag}_${sol}.png`, clip: { x: 200, y: 150, width: 500, height: 450 } });
}
console.log('hatalar', h); await t.close();
