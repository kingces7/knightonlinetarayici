// Geliştirme aracı (Aşama 5): tarayıcı oyuncusu sunucuya bağlanıp en yakın sunucu canavarına saldırır; savaş sonuçlarını (mesajlar, can, deneyim, ölüm) ölçer.
// Önkoşul: köprü, Myko sunucusu ve `npm run dev` açık.  Kullanım:  KO_HESAP=... KO_SIFRE=... node scripts/savasTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const bag = await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [hesap, sifre]);
console.log('bağlandı:', bag.ad, 'seviye', bag.seviye);
// mesajları kaydet
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
const once = await s.evaluate(() => ({ can: window.ke.oyuncu.can, enCok: window.ke.oyuncu.enCok, deneyim: window.ke.oyuncu.deneyim, seviye: window.ke.oyuncu.seviye }));
// canavar bölgesine git ve en yakın sunucu canavarını bekle
await s.evaluate(() => window.ke.oyuncu.isinla(430, 217, window.ke.arazi));
let n = 0; for (let i = 0; i < 30 && !n; i++) { await s.waitForTimeout(500); n = await s.evaluate(() => window.ke.canavarlar.filter((c) => c.agModu && !c.olu).length); }
console.log('çevredeki sunucu canavarı:', n);
const hedef = await s.evaluate(() => {
  const o = window.ke.oyuncu; const l = window.ke.canavarlar.filter((c) => c.agModu && !c.olu).sort((a, b) => a.konum.distanceTo(o.konum) - b.konum.distanceTo(o.konum));
  if (!l.length) return null; o.hedef = l[0]; o.saldiriyor = true; return { id: l[0].agKimlik, ad: l[0].tur.ad, can: l[0].can, enCok: l[0].enCok };
});
console.log('hedef:', JSON.stringify(hedef));
// savaşı izle (en çok 40 sn)
let bitis = null;
for (let i = 0; i < 80 && !bitis; i++) {
  await s.waitForTimeout(500);
  bitis = await s.evaluate((id) => { const c = window.ke.canavarlar.find((x) => x.agKimlik === id); const o = window.ke.oyuncu; return (c?.olu ? 'canavar öldü' : o.olu ? 'oyuncu öldü' : null); }, hedef.id);
}
await s.waitForTimeout(1500);
const sonra = await s.evaluate(() => ({ can: window.ke.oyuncu.can, enCok: window.ke.oyuncu.enCok, deneyim: window.ke.oyuncu.deneyim, seviye: window.ke.oyuncu.seviye, mesajlar: window.__m.filter((m) => !/Connected|Welcome/.test(m)).slice(-14) }));
await s.screenshot({ path: `${klasor}/savas.png` });
console.log(JSON.stringify({ bitis, once, sonra, hatalar }, null, 1));
// oyuncu öldüyse yeniden doğma sunucudan çalışıyor mu?
if (bitis === 'oyuncu öldü') {
  await s.evaluate(() => window.ke.hud.yenidenDog());
  await s.waitForTimeout(2500);
  console.log('yeniden doğma sonrası:', JSON.stringify(await s.evaluate(() => ({ can: window.ke.oyuncu.can, enCok: window.ke.oyuncu.enCok, olu: window.ke.oyuncu.olu, konum: [window.ke.oyuncu.konum.x, window.ke.oyuncu.konum.y] }))));
}
await t.close();
