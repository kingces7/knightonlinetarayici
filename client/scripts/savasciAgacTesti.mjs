// Geliştirme aracı: sunucu modunda Warrior novice ağaç skill'lerini tek tek dener (yalnız kotest). Her skill için: oynayan oyuncu animasyonu, oynatılan efekt numaraları, mesajlar.
// Kullanım: KO_HESAP=… KO_SIFRE=… KO_BECERI=205500,205505 node scripts/savasciAgacTesti.mjs
import { chromium } from 'playwright-core';
const nolar = (process.env.KO_BECERI ?? '').split(',').filter(Boolean).map(Number);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
if (await s.evaluate(() => window.ke.oyuncu.olu)) { await s.evaluate(() => window.ke.hud.yenidenDog()); await s.waitForTimeout(3000); }
await s.evaluate(() => {
  window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); };
  window.__fx = []; const e = window.ke.efektler, f = e.oynat.bind(e); e.oynat = (id, ...a) => { window.__fx.push(id); return f(id, ...a); };
  window.ke.oyuncu.isinla(430, 217, window.ke.arazi);
});
await s.waitForTimeout(5000);
if (process.env.KO_YAY) { const i = await s.evaluate(() => window.ke.oyuncu.envanter.findIndex((e) => e && /Bow/.test(e.ad))); if (i >= 0) { await s.evaluate((i) => window.ke.hud.esyaKusan(i), i); await s.waitForTimeout(1500); } console.log('yay', await s.evaluate(() => [window.ke.oyuncu.ekipman[6]?.ad, window.ke.oyuncu.ekipman[8]?.ad])); }
console.log('puanlar', await s.evaluate(() => [window.ke.oyuncu.seviye, window.ke.oyuncu.skillPuanlari.join(','), window.ke.oyuncu.mana + '/' + window.ke.oyuncu.enCokMana]));
for (const no of nolar) {
  const hazir = await s.evaluate(() => {
    const o = window.ke.oyuncu; o.mana = o.enCokMana; o.hedef = null; o.can = o.enCok;
    const l = window.ke.canavarlar.filter((c) => c.agModu && !c.olu).sort((a, b) => a.konum.distanceTo(o.konum) - b.konum.distanceTo(o.konum));
    if (!l.length) return null; const h = l[0]; o.isinla(h.konum.x + 1.2, h.konum.y, window.ke.arazi); o.hedef = h; return h.tur.ad;
  });
  await s.waitForTimeout(1200);
  const r = await s.evaluate(async (no) => {
    window.__m.length = 0; window.__fx.length = 0; const o = window.ke.oyuncu; o.beceriBekleme.clear?.(); const anim = new Set(); const mana0 = o.mana;
    window.ke.beceriKullan(no);
    for (let i = 0; i < 18; i++) { await new Promise((r) => setTimeout(r, 100)); anim.add(`${o.model?.aktifAd}${o.animKilidi > 0 ? '*' : ''}`); }
    return { anim: [...anim].join(' > '), fx: [...window.__fx].join(','), mana: `${mana0}->${o.mana}`, mesaj: window.__m.slice(0, 4).join(' | ') };
  }, no);
  const ad = await s.evaluate((no) => window.ke.arayuz().sinifBecerileri.find((b) => b.no === no)?.ad, no);
  console.log(no, ad, 'hedef:', hazir, JSON.stringify(r));
}
console.log('hatalar', JSON.stringify(hatalar)); await t.close();
