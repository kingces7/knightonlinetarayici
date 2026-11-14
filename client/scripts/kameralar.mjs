// Geliştirme aracı: tek oturumda birkaç konum/açıdan ekran görüntüsü alır.
// Kullanım: node scripts/kameralar.mjs <url> <klasor> "x,z,uzaklik,egim,aci" ...
import { chromium } from 'playwright-core';
const [url, klasor, ...konumlar] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(3000);
if (process.env.DETAY !== undefined) await s.evaluate((d) => { window.ke.arazi.mesh.material.uniforms.detay.value = d; }, Number(process.env.DETAY));
for (const [i, k] of konumlar.entries()) {
  const [x, z, u, e, a] = k.split(',').map(Number);
  await s.evaluate(([x, z, u, e, a]) => { const o = window.ke; o.oyuncu.isinla(x, z, o.arazi); o.kamera.uzaklik = u; o.kamera.egim = e; if (!Number.isNaN(a)) o.kamera.aci = a; }, [x, z, u, e, a]);
  await s.waitForTimeout(1500);
  await s.screenshot({ path: `${klasor}/k${i + 1}.png` });
}
console.log('bitti', hatalar);
await t.close();
