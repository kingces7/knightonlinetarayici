// Geliştirme aracı: verilen (ya da re_el_* bütün) pencereleri tek tek açar, hata sayar ve ekran görüntüsü alır.
import { chromium } from 'playwright-core';
const [liste = 're_minimap', klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message)); s.on('console', (m) => { if (m.type() === 'warning' && /Pencere açılamadı/.test(m.text())) hatalar.push(m.text()); });
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2000);
const adlar = liste === 'hepsi' ? await s.evaluate(async () => (await (await fetch('/arayuz/')).text()).length && []) : liste.split(',');
for (const ad of adlar) {
  const ok = await s.evaluate(async (a) => { const g = window.ke.arayuz().genel; const r = await g.ac(a); const n = g.sayi; g.kapat(a); return r; }, ad);
  if (!ok) hatalar.push('açılamadı: ' + ad);
}
if (adlar.length === 1) { await s.evaluate(async (a) => { await window.ke.arayuz().genel.ac(a); }, adlar[0]); await s.waitForTimeout(500); await s.screenshot({ path: `${klasor}/pencere.png` }); }
console.log(JSON.stringify({ acilan: adlar.length, hatalar }));
await t.close();
