// Geliştirme aracı (ross): Moradon'da merdiven rampalarını bulup oyuncuyu aşağıdan yukarı yürütür. Edge CDP 9333.
import { chromium } from 'playwright-core';
const harita = process.argv[2] ?? 'moradon';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1280, height: 720 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(`http://localhost:5173/?giris=0&harita=${harita}`);
await s.waitForFunction(() => window.ke?.arazi, null, { timeout: 120000 }); await s.waitForTimeout(4000);
const r = await s.evaluate(() => {
  const ke = window.ke, a = ke.arazi, c = a.carpisma, o = ke.oyuncu;
  if (!c) return { hata: 'çarpışma yok' };
  const V2 = o.konum.constructor;
  // rampa noktaları
  const noktalar = [];
  for (let x = 4; x < a.genislik - 4; x += 1) for (let z = 4; z < a.genislik - 4; z += 1) {
    const tz = a.yukseklikAl(x, z); const g = c.zeminBilgi(x, z, tz + 8);
    if (g && g.egim < 0.9 && g.egim > 0.3 && g.y > tz + 0.8) noktalar.push([x, z, g.y, tz, g.egim]);
  }
  if (!noktalar.length) return { hata: 'rampa yok', genislik: a.genislik };
  const pts = [];
  for (let x = 220; x < 420; x += 0.5) for (let z = 240; z < 460; z += 0.5) {
    const tz = a.yukseklikAl(x, z); const g = c.zeminBilgi(x, z, tz + 8);
    if (g && g.egim > 0.34 && g.egim < 0.66 && g.y > tz + 0.2) pts.push([x, z, g.y, tz]);
  }
  const kum = new Map();
  for (const p of pts) { const k = Math.floor(p[0] / 8) + ',' + Math.floor(p[1] / 8); (kum.get(k) ?? kum.set(k, []).get(k)).push(p); }
  const cikti = [];
  for (const [k, l] of kum) if (l.length >= 8) { const ys = l.map((p) => p[2]); cikti.push({ k, n: l.length, x: +(l.reduce((s2, p) => s2 + p[0], 0) / l.length).toFixed(0), z: +(l.reduce((s2, p) => s2 + p[1], 0) / l.length).toFixed(0), yMin: +Math.min(...ys).toFixed(1), yMax: +Math.max(...ys).toFixed(1), arazi: +l[0][3].toFixed(1) }); }
  return { toplam: pts.length, cikti };
});
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
