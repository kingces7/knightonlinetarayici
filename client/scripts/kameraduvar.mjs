// Geliştirme aracı: kameranın duvar/tavan çarpışmasını sınar. 8 yatay açıda kamera–oyuncu uzaklığını yazar (engel varsa uzaklık < ayarlı uzaklık).
import { chromium } from 'playwright-core';
const [harita = '14th_oldmoradon', x, z] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 900, height: 600 } });
s.on('pageerror', (e) => console.log('HATA', e.message));
await s.goto(`http://localhost:5173/?harita=${harita}`);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(3000);
if (x) await s.evaluate(([x, z]) => window.ke.oyuncu.isinla(+x, +z, window.ke.arazi), [x, z]);
const r = [];
for (let i = 0; i < 8; i++) {
  r.push(await s.evaluate(async (a) => {
    const k = window.ke.kamera; k.aci = a; k.egim = 0.4; k.uzaklik = 14;
    await new Promise((r) => setTimeout(r, 1500));
    const p = window.ke.oyuncu.grup.position; const c = k.kamera.position;
    return +Math.hypot(c.x - p.x, c.y - (p.y + 1.6), c.z - p.z).toFixed(1);
  }, (i * Math.PI) / 4));
}
console.log('uzaklıklar (ayarlı: ' + 14 + ' x ' + Math.cos(0.4).toFixed(2) + ' ... yatay+dikey toplam 14):', r.join(' '));
await t.close();
