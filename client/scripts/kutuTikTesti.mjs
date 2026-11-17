// Geliştirme aracı (yerel mod): ölü canavara sol ve sağ tık → ganimet kutusuna yürünür / açılır.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1400, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(3000);
const hazir = await s.evaluate(async () => {
  const o = window.ke.oyuncu; const c = window.ke.canavarlar.filter((c) => !c.olu).sort((a, b) => a.konum.distanceTo(o.konum) - b.konum.distanceTo(o.konum))[0];
  let en = null; for (let a = 0; a < 16 && !en; a++) { const x = o.konum.x + Math.cos(a * 0.39) * 6, z = o.konum.y + Math.sin(a * 0.39) * 6; c.konum.set(x, z); c.sahneyeYerlestir(window.ke.arazi); const v = c.grup.position.clone(); v.y += .5; v.project(window.ke.kamera.kamera); if (v.z < 1 && Math.abs(v.x) < .5 && Math.abs(v.y) < .5) en = 1; }
  c.can = 0; c.durum = 'olu'; c.oluSuresi = 0.5; c.olu;
  return !!c;
});
await s.waitForTimeout(1500);
const nokta = () => s.evaluate(() => { const k = window.ke.kutular.find((k) => k.sahip); if (!k) return null; const c = k.sahip; const v = c.grup.position.clone(); v.y += 0.5; v.project(window.ke.kamera.kamera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, olu: c.olu, kutuVar: true, gorunur: c.grup.visible }; });
const p = await nokta(); console.log('canavar ekranda', JSON.stringify(p)); if (!p) process.exit(1);
for (const dugme of ['right', 'left']) {
  await s.evaluate(() => { window.ke.oyuncu.yuruHedef = null; });
  await s.mouse.move(p.x, p.y); await s.mouse.down({ button: dugme }); await s.mouse.up({ button: dugme }); await s.waitForTimeout(300);
  console.log(dugme, 'tık → kutuya yürüyor:', await s.evaluate(() => !!window.ke.oyuncu.yuruHedef));
}
console.log('hatalar', JSON.stringify(h)); await t.close();
