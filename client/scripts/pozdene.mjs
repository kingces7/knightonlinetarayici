// Geliştirme aracı: kemiklere dönüş uygulayıp ekran görüntüsü alır. Kullanım: node pozdene.mjs <url> <klasor> "eksen,aci,diz,kalca_y" ...
import { chromium } from 'playwright-core';
const [url, klasor, ...denemeler] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 900, height: 600 } });
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(2500);
await s.evaluate(() => { const o = window.ke; o.kamera.uzaklik = 4.2; o.kamera.egim = 0.1; o.kamera.aci = Math.PI / 2; });
for (const [i, d] of denemeler.entries()) {
  const [eksen, aci, diz] = d.split(',');
  await s.evaluate(([eksen, aci, diz]) => {
    const T = window.ke.oyuncu.model.kok.constructor; // Object3D
    const kok = window.ke.oyuncu.model.kok;
    const e = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[eksen];
    window.ke.oyuncu.model.oynat('bekle', true, 0);
    window.__poz = () => {
      const q = (v, a) => { const h = a / 2, s = Math.sin(h); return [v[0] * s, v[1] * s, v[2] * s, Math.cos(h)]; };
      const uygula = (ad, a) => { const b = kok.getObjectByName(ad); const [x, y, z, w] = q(e, a * Math.PI / 180); const Q = b.quaternion.constructor; b.quaternion.multiply(new Q(x, y, z, w)); };
      uygula('LeftHip', Number(aci)); uygula('RightHip', Number(aci)); uygula('LeftKnee', Number(diz)); uygula('RightKnee', Number(diz));
    };
  }, [eksen, aci, diz]);
  // her karede mixer sonrası uygula: guncelle'yi sarmala
  await s.evaluate(() => { const m = window.ke.oyuncu.model; if (!m.__sarildi) { const eski = m.guncelle.bind(m); m.guncelle = (dt) => { eski(dt); window.__poz(); }; m.__sarildi = true; } });
  await s.waitForTimeout(500);
  await s.screenshot({ path: `${klasor}/p${i}.png`, clip: { x: 250, y: 60, width: 400, height: 460 } });
}
console.log('bitti');
await t.close();
