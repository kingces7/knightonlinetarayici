// Geliştirme aracı: animasyonlu dokulu nesnelere ışınlanıp ekran görüntüsü alır (ateş/duman karelerinin değiştiğini doğrular).
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2000);
const bilgi = await s.evaluate(() => {
  const liste = [];
  window.ke.sahne.traverse((o) => { if (o.isMesh && o.material?.map?.source?.data?.src?.includes?.('/anim/')) { o.geometry.computeBoundingBox(); const c = o.geometry.boundingBox.getCenter(new o.position.constructor()); liste.push({ x: c.x, y: c.y, z: c.z, ad: o.material.map.source.data.src.split('/').pop() }); } });
  return liste;
});
console.log(JSON.stringify(bilgi.slice(0, 12)));
const hedef = bilgi.find((b) => /fire/.test(b.ad)) ?? bilgi[0];
if (hedef) {
  await s.evaluate((h) => { const o = window.ke.oyuncu; o.konum.set(h.x + 1, h.y - 2, h.z + 7); o.grup.position.copy(o.konum); }, hedef);
  for (let i = 0; i < 2; i++) { await s.waitForTimeout(700); await s.screenshot({ path: `${klasor}/anim${i}.png` }); }
}
const kareler = await s.evaluate(async () => { const r = []; for (let i = 0; i < 4; i++) { const set = new Set(); window.ke.sahne.traverse((o) => { if (o.isMesh && o.material?.map?.source?.data?.src?.includes?.('/anim/')) set.add(o.material.map.source.data.src.split('/').pop()); }); r.push([...set].slice(0, 3).join(',')); await new Promise((q) => setTimeout(q, 400)); } return r; });
console.log(JSON.stringify({ hatalar, kareler }));
await t.close();
