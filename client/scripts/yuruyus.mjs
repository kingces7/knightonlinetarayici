// Geliştirme aracı: Moradon'da başlangıçtan 8 yöne yürütür, nerede durduğunu ve yüksekliği yazar.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/?harita=moradon', cikti = 'yuruyus.png'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
const V2 = await s.evaluate(() => window.ke.oyuncu.konum.constructor.name);
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const r = await s.evaluate(async ([a]) => {
    const o = window.ke, p = o.oyuncu, B = [815, 440];
    p.isinla(B[0], B[1], o.arazi);
    const hedef = p.konum.clone(); hedef.x = B[0] + Math.cos(a) * 80; hedef.y = B[1] + Math.sin(a) * 80;
    p.yuruHedef = hedef;
    await new Promise((r) => setTimeout(r, 4500));
    return { x: +p.konum.x.toFixed(1), z: +p.konum.y.toFixed(1), y: +(p.yuksek ?? 0).toFixed(2), mesafe: +Math.hypot(p.konum.x - B[0], p.konum.y - B[1]).toFixed(1), hedefBitti: p.yuruHedef === null };
  }, [a]);
  console.log(`yön ${Math.round(a * 180 / Math.PI)}°`, JSON.stringify(r));
}
await s.screenshot({ path: cikti });
console.log(hatalar);
await t.close();
