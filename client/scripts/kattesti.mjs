// Geliştirme aracı: araziden belirgin yüksekteki zemin üçgenlerinde (köprü/kat) yüksekliğin doğru bulunduğunu denetler.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/?harita=moradon', cikti = 'kat.png'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
const r = await s.evaluate(async () => {
  const o = window.ke, c = o.arazi.carpisma, p = o.oyuncu;
  const kat = [];
  for (let t = 0; t < c.sinif.length && kat.length < 4000; t++) {
    if (c.sinif[t] !== 1) continue;
    const v = c.v, k = t * 9;
    const cx = (v[k] + v[k + 3] + v[k + 6]) / 3, cz = (v[k + 2] + v[k + 5] + v[k + 8]) / 3, cy = (v[k + 1] + v[k + 4] + v[k + 7]) / 3;
    if (cx < 4 || cz < 4 || cx > 1020 || cz > 1020) continue;
    const arazi = o.arazi.yukseklikAl(cx, cz);
    if (cy - arazi > 1.5 && cy - arazi < 12) kat.push({ cx, cz, cy, arazi });
  }
  const ornek = kat.filter((_, i) => i % Math.max(1, Math.floor(kat.length / 200)) === 0).slice(0, 200);
  let dogru = 0;
  for (const a of ornek) { const z = c.zemin(a.cx, a.cz, a.cy + 0.3); if (z !== null && Math.abs(z - a.cy) < 0.3) dogru++; }
  // Bir kata gerçekten çık: oyuncuyu kat yüksekliğinde başlatıp ışınla, yükseklik korunuyor mu?
  const e = ornek[0];
  p.isinla(e.cx, e.cz, o.arazi); p.yuksek = e.cy;
  await new Promise((r) => setTimeout(r, 800));
  return { katUcgenSayisi: kat.length, ornek: ornek.length, dogruBulunan: dogru, ilkKat: { x: +e.cx.toFixed(1), z: +e.cz.toFixed(1), katY: +e.cy.toFixed(2), araziY: +e.arazi.toFixed(2) }, oyuncuY: +p.yuksek.toFixed(2) };
});
console.log(JSON.stringify(r));
await s.screenshot({ path: cikti });
await t.close();
