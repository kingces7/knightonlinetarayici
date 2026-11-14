// Geliştirme aracı: başlangıca en yakın duvar üçgenine doğru yürür, duvardan ne kadar uzakta durduğunu ölçer.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/?harita=moradon', cikti = 'duvar.png'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
const sonuc = await s.evaluate(async () => {
  const o = window.ke, c = o.arazi.carpisma, p = o.oyuncu, B = [815, 440];
  const out = [];
  // Başlangıca yakın, yüksekliği ayak seviyesini kesen duvar üçgenleri
  const adaylar = [];
  for (let t = 0; t < c.sinif.length; t++) {
    if (c.sinif[t] !== 2) continue;
    const v = c.v, k = t * 9;
    const cx = (v[k] + v[k + 3] + v[k + 6]) / 3, cz = (v[k + 2] + v[k + 5] + v[k + 8]) / 3;
    const d = Math.hypot(cx - B[0], cz - B[1]);
    const yMin = Math.min(v[k + 1], v[k + 4], v[k + 7]), yMax = Math.max(v[k + 1], v[k + 4], v[k + 7]);
    if (d < 40 && yMin < 5.2 && yMax > 6.5) adaylar.push({ t, d, cx, cz });
  }
  adaylar.sort((a, b) => a.d - b.d);
  for (const a of adaylar.slice(0, 4)) {
    const nx = c.n[a.t * 3], nz = c.n[a.t * 3 + 2], m = Math.hypot(nx, nz);
    for (const isaret of [1, -1]) {
      const bx = a.cx + isaret * nx / m * 6, bz = a.cz + isaret * nz / m * 6; // duvarın bir yanından 6 m uzakta başla
      p.isinla(bx, bz, o.arazi);
      for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 30)); // yerleşsin
      const hedef = p.konum.clone(); hedef.x = a.cx - isaret * nx / m * 6; hedef.y = a.cz - isaret * nz / m * 6; // duvarın öbür yanı
      p.yuruHedef = hedef;
      await new Promise((r) => setTimeout(r, 2600));
      const ayrildi = Math.hypot(p.konum.x - a.cx, p.konum.y - a.cz);
      const oteYan = ((p.konum.x - a.cx) * nx + (p.konum.y - a.cz) * nz) * isaret < 0; // duvarı geçti mi?
      out.push({ duvar: [+a.cx.toFixed(1), +a.cz.toFixed(1)], yanSigns: isaret, durdu: [+p.konum.x.toFixed(1), +p.konum.y.toFixed(1)], uzaklik: +ayrildi.toFixed(2), gecti: oteYan });
    }
  }
  return out;
});
console.log(JSON.stringify(sonuc, null, 0).replace(/\},\{/g, '},\n{'));
await s.screenshot({ path: cikti });
await t.close();
