// Geliştirme aracı (ross): giriş sahnesini tek başına açar, düğüm sınırlarını yazar, görüntü alır. Edge CDP 9333.
import { chromium } from 'playwright-core';
const [yol, ulus = 'ka'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
const h = []; s.on('pageerror', (e) => h.push(e.message)); s.on('console', (m) => { if (m.type() === 'error') h.push(m.text()); });
await s.setViewportSize({ width: 1600, height: 900 });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const r = await s.evaluate(async (ulus) => {
  window.ke.arayuz().genel.hepsiniKapat();
  const { GirisSahnesi } = await import('/src/arayuz/girisSahnesi.ts');
  const g = new GirisSahnesi(ulus); window.__gs = g;
  Object.assign(g.tuval.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '9500' }); document.body.appendChild(g.tuval);
  await g.yukle(); await g.karakterGoster(ulus === "el" ? 7012 : 7001); g.boyutla(innerWidth, innerHeight); g.baslat();
  const THREE = await import('/node_modules/.vite/deps/three.js');
  const cikti = [];
  g.oda.traverse((c) => { if (!c.isMesh) return; const b = new THREE.Box3().setFromObject(c); cikti.push([c.geometry.name || c.name, b.min.toArray().map((v) => +v.toFixed(1)), b.max.toArray().map((v) => +v.toFixed(1))].join(' ')); });
  return cikti;
}, ulus);
await s.waitForTimeout(4500); await s.screenshot({ path: yol });
console.log(h.join(' | '));
for (const x of r) console.log(x.split('chrselect\\').join(''));
await s.close(); await t.close();
