// Geliştirme aracı: sunucu modunda skill testi. Canavara Stroke (105500?) ve buff kullanır; MP/hasar/mesajları ölçer.
// Kullanım: KO_HESAP=... KO_SIFRE=... KO_BECERI=<no,no> node scripts/beceriSunucuTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
const nolar = (process.env.KO_BECERI ?? '').split(',').filter(Boolean).map(Number);
if (!hesap || !sifre || !nolar.length) { console.log('KO_HESAP, KO_SIFRE, KO_BECERI gerekli'); process.exit(1); }
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const bag = await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [hesap, sifre]);
console.log('bağlandı:', bag.ad, 'seviye', bag.seviye);
if (await s.evaluate(() => window.ke.oyuncu.olu)) { await s.evaluate(() => window.ke.hud.yenidenDog()); await s.waitForTimeout(3000); console.log('yeniden doğdu'); }
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
await s.evaluate(() => window.ke.oyuncu.isinla(430, 217, window.ke.arazi));
let n = 0; for (let i = 0; i < 30 && !n; i++) { await s.waitForTimeout(500); n = await s.evaluate(() => window.ke.canavarlar.filter((c) => c.agModu && !c.olu).length); }
const hedef = await s.evaluate(() => { const o = window.ke.oyuncu; const l = window.ke.canavarlar.filter((c) => c.agModu && !c.olu).sort((a, b) => a.konum.distanceTo(o.konum) - b.konum.distanceTo(o.konum)); if (!l.length) return null; o.hedef = l[0]; return { ad: l[0].tur.ad, can: l[0].can }; });
console.log('hedef:', JSON.stringify(hedef));
await s.evaluate(() => { const o = window.ke.oyuncu, h = o.hedef; o.isinla(h.konum.x + 1.5, h.konum.z, window.ke.arazi); }); await s.waitForTimeout(1500);
for (const no of nolar) {
  const once = await s.evaluate(() => ({ mana: window.ke.oyuncu.mana, enCokMana: window.ke.oyuncu.enCokMana, hedefCan: window.ke.oyuncu.hedef?.can, buf: window.ke.oyuncu.buflar.length }));
  await s.evaluate((no) => { window.__m.length = 0; window.ke.beceriKullan(no); }, no);
  await s.waitForTimeout(2500);
  const sonra = await s.evaluate(() => ({ mana: window.ke.oyuncu.mana, hedefCan: window.ke.oyuncu.hedef?.can, buf: window.ke.oyuncu.buflar.length, mesaj: window.__m.slice(-5) }));
  console.log(no, JSON.stringify({ once, sonra }));
}
await s.screenshot({ path: `${klasor}/beceri.png` });
console.log('sayfa hataları:', JSON.stringify(hatalar));
await t.close();
