// Geliştirme aracı: oyuncuya en yakın nesneleri (ad, konum, parça mesh adları) listeler.
import { chromium } from 'playwright-core';
const [url, x, z, yaricap = '40'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 800, height: 450 } });
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
const r = await s.evaluate(([x, z, yaricap]) => {
  const o = window.ke; const sonuc = [];
  o.sahne.traverse((n) => {
    if (!n.name || n.isMesh || n.parent !== o.sahne.children.find((c) => c.name !== 'arazi' && c.children.length > 100) ) return;
    const px = n.position.x, pz = -n.position.z;
    const d = Math.hypot(px - x, pz - z);
    if (d < yaricap) sonuc.push({ ad: n.name, x: +px.toFixed(0), z: +pz.toFixed(0), d: +d.toFixed(0), parca: n.children.map((c) => (c.children[0]?.geometry?.attributes.position.count ?? '?')).join(',') });
  });
  return sonuc.sort((a, b) => a.d - b.d).slice(0, 30);
}, [Number(x), Number(z), Number(yaricap)]);
console.log(r.map((q) => `${q.ad.padEnd(30)} (${q.x},${q.z}) ${q.d}m köşe[${q.parca}]`).join('\n'));
await t.close();
