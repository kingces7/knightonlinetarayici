// Geliştirme aracı (ross): haritadaki bütün merdiven rampalarını bulup oyuncuyu ayaktan yukarı yürütür; çıkamayanları listeler. Edge CDP 9333.
// Kullanım: node scripts/rossRampaTara.mjs [harita]
import { chromium } from 'playwright-core';
const harita = process.argv[2] ?? 'moradon';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1280, height: 720 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(`http://localhost:5173/?giris=0&harita=${harita}`);
await s.waitForFunction(() => window.ke?.arazi, null, { timeout: 120000 }); await s.waitForTimeout(4000);
const noktalar = [[263, 305], [308, 279], [310, 282], [310, 436]];
const r = await s.evaluate((noktalar) => {
  const ke = window.ke, a = ke.arayuz ? ke.arazi : ke.arazi, c = a.carpisma, o = ke.oyuncu;
  const V2 = o.konum.constructor; const cikti = [];
  for (const [x, z] of noktalar) {
    const f = (px, pz) => { const tz = a.yukseklikAl(px, pz); const g = c.zeminBilgi(px, pz, tz + 12); return g ? g.y : tz; };
    let gx = f(x + 0.4, z) - f(x - 0.4, z), gz = f(x, z + 0.4) - f(x, z - 0.4); const m = Math.hypot(gx, gz); gx /= m; gz /= m;
    const yon = new V2(gx, gz); o.isinla(x - gx * 1.2, z - gz * 1.2, a);
    const iz = [];
    for (let i = 0; i < 40; i++) { const once = o.konum.clone(); o.ilerle(yon, 0.12); o.sonYerlestirme = performance.now() - 16; o.sahneyeYerlestir(a);
      const kayma = Math.hypot(o.konum.x - once.x, o.konum.y - once.y);
      if (i % 4 === 0) { const zb = o.zeminBul(a, o.konum.x, o.konum.y); iz.push([+o.konum.x.toFixed(2), +o.konum.y.toFixed(2), +o.yuksek.toFixed(2), +a.yukseklikAl(o.konum.x, o.konum.y).toFixed(2), +zb.y.toFixed(2), zb.kat ? 'K' : 'a', +kayma.toFixed(3)]); } }
    cikti.push({ x, z, yon: [+gx.toFixed(2), +gz.toFixed(2)], iz });
  }
  return cikti;
}, noktalar);
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
