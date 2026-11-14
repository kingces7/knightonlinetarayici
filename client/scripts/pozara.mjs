// Geliştirme aracı: oturma pozu için kalça/diz açılarını sayısal tarar.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 600, height: 400 } });
await s.goto(process.argv[2] ?? 'http://localhost:5173/?harita=14th_oldmoradon');
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(2500);
const r = await s.evaluate(() => {
  const kok = window.ke.oyuncu.model.kok; const grup = window.ke.oyuncu.grup;
  const V = kok.position.constructor, Q = kok.quaternion.constructor;
  const ad = (a) => kok.getObjectByName(a);
  const sonuc = [];
  const yerel = (nesne) => { const v = new V(); nesne.getWorldPosition(v); return grup.worldToLocal(v); };
  // ileri yönü: omuzların ortasına göre göğsün baktığı yön yerine "dizin normalde öne çıkan" varsayımı yok; bu yüzden hem +z hem -z raporlanır
  for (const eksen of ['x', 'z']) for (const kalca of [-90, 90]) for (const diz of [-120, -90, 0, 90, 120]) {
    const lh = ad('LeftHip'), lk = ad('LeftKnee'), la = ad('LeftAnkle');
    const q0h = lh.quaternion.clone(), q0k = lk.quaternion.clone();
    const e = eksen === 'x' ? new V(1, 0, 0) : new V(0, 0, 1);
    lh.quaternion.multiply(new Q().setFromAxisAngle(e, kalca * Math.PI / 180));
    lk.quaternion.multiply(new Q().setFromAxisAngle(e, diz * Math.PI / 180));
    kok.updateMatrixWorld(true);
    const h = yerel(lh), k = yerel(lk), a = yerel(la);
    sonuc.push({ eksen, kalca, diz, diz_ileri: +(k.z - h.z).toFixed(2), diz_y: +(k.y - h.y).toFixed(2), bilek_ileri: +(a.z - k.z).toFixed(2), bilek_y: +(a.y - k.y).toFixed(2) });
    lh.quaternion.copy(q0h); lk.quaternion.copy(q0k);
  }
  kok.updateMatrixWorld(true);
  const bas = (n) => { const p = yerel(ad(n)); return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; };
  return { sonuc, duruş: { hips: bas('Hips'), chest: bas('Chest'), head: bas('Head'), lhip: bas('LeftHip'), lknee: bas('LeftKnee'), lank: bas('LeftAnkle') } };
});
console.log(JSON.stringify(r.duruş));
for (const x of r.sonuc) console.log(JSON.stringify(x));
await t.close();
