// Geliştirme aracı: sunucu modunda ganimet testi (canavar öldür → kutu → hepsini al). Yalnız kotest hesabıyla kullan.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
if (await s.evaluate(() => window.ke.oyuncu.olu)) { await s.evaluate(() => window.ke.hud.yenidenDog()); await s.waitForTimeout(3000); }
await s.evaluate(() => window.ke.oyuncu.isinla(430, 217, window.ke.arazi));
for (let i = 0; i < 30; i++) { await s.waitForTimeout(500); if (await s.evaluate(() => window.ke.canavarlar.some((c) => c.agModu && !c.olu))) break; }
const once = await s.evaluate(() => ({ altin: window.ke.oyuncu.altin, dolu: window.ke.oyuncu.envanter.filter(Boolean).length }));
const hedef = await s.evaluate(() => { const o = window.ke.oyuncu; const c = window.ke.canavarlar.filter((c) => c.agModu && !c.olu).sort((a, b) => a.tur.seviye - b.tur.seviye)[0]; o.hedef = c; o.isinla(c.konum.x + 2, c.konum.y, window.ke.arazi); o.saldiriyor = true; return { ad: c.tur.ad, sev: c.tur.seviye, id: c.agKimlik }; });
console.log('hedef', JSON.stringify(hedef), 'önce', JSON.stringify(once));
let kutu = null;
for (let i = 0; i < 90 && !kutu; i++) {
  await s.waitForTimeout(500);
  if (await s.evaluate(() => window.ke.oyuncu.olu)) { console.log('oyuncu öldü'); break; }
  kutu = await s.evaluate(() => { const k = window.ke.kutular.find((k) => k.agTorba && k.icerikGeldi); return k ? { torba: k.agTorba, altin: k.altin, esyalar: k.esyalar.map((e) => e.ad + ' x' + (e.adet ?? 1)) } : null; });
}
console.log('kutu', JSON.stringify(kutu));
if (kutu) {
  await s.evaluate(() => { const k = window.ke.kutular.find((k) => k.agTorba); window.ke.hud.ganimetAc(k); }); await s.waitForTimeout(800);
  await s.screenshot({ path: `${klasor}/ganimet_ac.png` });
  await s.evaluate(() => { const k = window.ke.kutular.find((k) => k.agTorba); window.ke.hud.ganimetAl(k, 'hepsi'); }); await s.waitForTimeout(1500);
  const sonra = await s.evaluate(() => ({ altin: window.ke.oyuncu.altin, dolu: window.ke.oyuncu.envanter.filter(Boolean).length, kutuKaldi: window.ke.kutular.filter((k) => k.agTorba && !k.bos).length, mesaj: window.__m.filter((m) => /obtained|cannot/.test(m)) }));
  console.log('sonra', JSON.stringify(sonra));
  await s.screenshot({ path: `${klasor}/ganimet_alindi.png` });
}
console.log('hatalar', JSON.stringify(hatalar));
await t.close();
