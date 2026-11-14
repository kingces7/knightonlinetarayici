// Geliştirme aracı: WASD ve orta fare tuşunu dener.
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:5173/?harita=14th_oldmoradon';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(2000);
const konum = () => s.evaluate(() => { const p = window.ke.oyuncu.konum; return [+p.x.toFixed(2), +p.y.toFixed(2)]; });
const mesafe = (a, b) => +Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2);
for (const tus of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
  const a = await konum();
  await s.keyboard.down(tus); await s.waitForTimeout(800); await s.keyboard.up(tus);
  console.log(tus, 'yürüdü:', mesafe(a, await konum()), 'm');
}
// 144 Hz taklidi: adım 4,5 cm
const k = await s.evaluate(() => { const o = window.ke, V = o.oyuncu.konum.constructor; const a = o.oyuncu.konum.clone(); for (let i = 0; i < 100; i++) o.oyuncu.ilerle(new V(1, 0), 0.045); return +o.oyuncu.konum.distanceTo(a).toFixed(2); });
console.log('100 adım × 4,5 cm →', k, 'm (beklenen ≈ 4,5; duvara çarparsa az)');
// orta tuş
const aci0 = await s.evaluate(() => window.ke.kamera.aci);
await s.mouse.click(640, 360, { button: 'middle' });
await s.waitForTimeout(700);
const aci1 = await s.evaluate(() => window.ke.kamera.aci);
console.log('orta tuş: açı farkı', +(aci1 - aci0).toFixed(3), 'rad (π =', +Math.PI.toFixed(3), ')');
console.log('hatalar', hatalar);
await t.close();
