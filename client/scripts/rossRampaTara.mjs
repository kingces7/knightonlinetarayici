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
const r = await s.evaluate(() => {
  const ke = window.ke, a = ke.arazi, c = a.carpisma, o = ke.oyuncu;
  if (!c) return { hata: 'çarpışma yok' };
  const V2 = o.konum.constructor;
  const hucre = new Map();
  for (let x = 4; x < a.genislik - 4; x += 1) for (let z = 4; z < a.genislik - 4; z += 1) {
    const tz = a.yukseklikAl(x, z); const g = c.zeminBilgi(x, z, tz + 12);
    if (!g || g.egim < 0.34 || g.egim > 0.66 || g.y < tz - 0.1 || g.y > tz + 0.9) continue; // rampanın ayağı: zemin seviyesine yakın
    const k = Math.floor(x / 5) + ',' + Math.floor(z / 5);
    if (!hucre.has(k)) hucre.set(k, [x, z, g.y, tz]);
  }
  const sonuc = [];
  for (const [, [x, z, gy]] of hucre) {
    // çıkış yönü: rampanın yükselen yönü (sayısal eğim)
    const f = (px, pz) => { const tz = a.yukseklikAl(px, pz); const g = c.zeminBilgi(px, pz, tz + 12); return g ? g.y : tz; };
    let gx = f(x + 0.4, z) - f(x - 0.4, z), gz = f(x, z + 0.4) - f(x, z - 0.4);
    const m = Math.hypot(gx, gz); if (m < 0.2) continue; gx /= m; gz /= m;
    const yon = new V2(gx, gz);
    o.isinla(x - gx * 1.2, z - gz * 1.2, a); const y0 = o.yuksek;
    let enYuksek = y0;
    for (let i = 0; i < 90; i++) { o.ilerle(yon, 0.12); o.sonYerlestirme = performance.now() - 16; o.sahneyeYerlestir(a); if (o.yuksek > enYuksek) enYuksek = o.yuksek; }
    const kazanc = enYuksek - y0, ilerledi = Math.hypot(o.konum.x - (x - gx * 1.2), o.konum.y - (z - gz * 1.2));
    let engel = null;
    if (kazanc < 1.0 && ilerledi < 4) { // takıldı: bu noktada yakındaki duvarların ayağa göre alt/üst yüksekliği
      const cc = c, px = o.konum.x, pz = o.konum.y, py = o.yuksek; const l = [];
      for (let t = 0; t < cc.sinif.length; t++) { if (cc.sinif[t] !== 2) continue; const q = t * 9, v = cc.v; const cx = (v[q] + v[q + 3] + v[q + 6]) / 3, cz = (v[q + 2] + v[q + 5] + v[q + 8]) / 3; if (Math.hypot(cx - px, cz - pz) > 1.5) continue;
        const ys = [v[q + 1], v[q + 4], v[q + 7]]; const mn = Math.min(...ys) - py, mx = Math.max(...ys) - py; if (mx < 0.72 || mn > 1.5) continue; l.push([+mn.toFixed(1), +mx.toFixed(1)]); }
      engel = { n: l.length, enAlt: l.length ? Math.min(...l.map((e) => e[0])) : null };
    }
    sonuc.push({ x, z, y0: +y0.toFixed(1), kazanc: +kazanc.toFixed(1), ilerledi: +ilerledi.toFixed(1), engel });
  }
  const basarisiz = sonuc.filter((p) => p.kazanc < 1.0);
  const yakin = sonuc.filter((p) => Math.hypot(p.x - 304, p.z - 341) < 60).map((p) => [p.x, p.z, p.y0, p.kazanc, p.ilerledi]); const takili = basarisiz.filter((p) => p.engel); return { yakin, toplam: sonuc.length, basarisiz: basarisiz.length, takili: takili.length, alcakEngel: takili.filter((p) => p.engel.enAlt !== null && p.engel.enAlt < 0.5).map((p) => [p.x, p.z, p.y0, p.engel]), basarili: sonuc.filter((p) => p.kazanc >= 1.0).length };
});
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
