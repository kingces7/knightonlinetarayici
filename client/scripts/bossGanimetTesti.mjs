// Geliştirme aracı: Dragon tooth Mentor'u öldür, ganimeti envantere al. Yalnız kotest ile. Kullanım: KO_HESAP=… KO_SIFRE=… node scripts/bossGanimetTesti.mjs <klasor>
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
await s.evaluate(() => window.ke.sunucuIsinla(270, 195)); await s.waitForTimeout(5000);
const once = await s.evaluate(() => ({ altin: window.ke.oyuncu.altin, esyalar: window.ke.oyuncu.envanter.filter(Boolean).map((e) => e.ad + ' x' + (e.adet ?? 1)) }));
const boss = await s.evaluate(() => { const c = window.ke.canavarlar.find((c) => c.agModu && c.tur.sid === 32600 && !c.olu); if (!c) return null; const o = window.ke.oyuncu; o.hedef = c; o.isinla(c.konum.x + 2, c.konum.y, window.ke.arazi); o.saldiriyor = true; return { ad: c.tur.ad, sid: c.tur.sid, hp: c.enCok, x: Math.round(c.konum.x), y: Math.round(c.konum.y) }; });
console.log('boss', JSON.stringify(boss), 'önce', JSON.stringify(once));
let kutu = null;
for (let i = 0; i < 60 && !kutu; i++) {
  await s.waitForTimeout(500);
  if (await s.evaluate(() => window.ke.oyuncu.olu)) { console.log('oyuncu öldü'); break; }
  kutu = await s.evaluate(() => { const k = window.ke.kutular.find((k) => k.agTorba && k.icerikGeldi); return k ? { altin: k.altin, esyalar: k.esyalar.map((e) => e.ad + ' x' + (e.adet ?? 1)) } : null; });
}
console.log('kutu', JSON.stringify(kutu));
if (kutu) {
  await s.evaluate(() => { const k = window.ke.kutular.find((k) => k.agTorba); window.ke.hud.ganimetAc(k); }); await s.waitForTimeout(800);
  await s.screenshot({ path: `${klasor}/boss_ganimet_ac.png` });
  await s.evaluate(() => { const k = window.ke.kutular.find((k) => k.agTorba); window.ke.hud.ganimetAl(k, 'hepsi'); }); await s.waitForTimeout(1500);
  const sonra = await s.evaluate(() => ({ altin: window.ke.oyuncu.altin, esyalar: window.ke.oyuncu.envanter.filter(Boolean).map((e) => e.ad + ' x' + (e.adet ?? 1)), mesaj: window.__m.filter((m) => /obtained|cannot|defeated/i.test(m)) }));
  console.log('sonra', JSON.stringify(sonra));
  await s.screenshot({ path: `${klasor}/boss_envanter.png` });
}
console.log('hatalar', JSON.stringify(hatalar));
await t.close();
