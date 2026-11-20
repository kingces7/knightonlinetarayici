// Geliştirme aracı (ross): verilen noktanın yakınındaki çarpışma üçgenlerini (sınıf, köşeler) listeler. Edge CDP 9333.
import { chromium } from 'playwright-core';
const [harita, ...nk] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.goto(`http://localhost:5173/?giris=0&harita=${harita}`);
await s.waitForFunction(() => window.ke?.arazi, null, { timeout: 120000 }); await s.waitForTimeout(4000);
const r = await s.evaluate((nk) => {
  const c = window.ke.arazi.carpisma; const cikti = [];
  for (let i = 0; i < nk.length; i += 3) {
    const [x, z, y] = [nk[i], nk[i + 1], nk[i + 2]]; const l = [];
    for (let t = 0; t < c.sinif.length; t++) {
      const o = t * 9, v = c.v; const cx = (v[o] + v[o + 3] + v[o + 6]) / 3, cz = (v[o + 2] + v[o + 5] + v[o + 8]) / 3;
      if (Math.hypot(cx - x, cz - z) > 1.2) continue;
      const ys = [v[o + 1], v[o + 4], v[o + 7]];
      l.push({ s: c.sinif[t], ny: +c.n[t * 3 + 1].toFixed(2), y: [+Math.min(...ys).toFixed(2), +Math.max(...ys).toFixed(2)], c: [+cx.toFixed(1), +cz.toFixed(1)] });
    }
    cikti.push({ x, z, y, l });
  }
  return cikti;
}, nk.map(Number));
console.log(JSON.stringify(r)); await s.close(); await t.close();
