// Geliştirme aracı: sunucu modunda mağaza alım/satım testi (yalnız kotest).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
const npc = await s.evaluate(() => { const n = window.ke.npcler.find((n) => n.tanim.satis > 0 && [13003, 13005, 13007, 22301, 23400].includes(n.tanim.sid)); if (!n) return null; window.ke.sunucuIsinla(n.konum.x + 2, n.konum.y); return { ad: n.ad, sid: n.tanim.sid, satis: n.tanim.satis, x: n.konum.x, y: n.konum.y }; });
console.log('NPC', JSON.stringify(npc)); if (!npc) process.exit(1);
await s.waitForTimeout(4000); // sunucu bölgeyi/NPC listesini göndersin
const durum = () => s.evaluate(() => ({ altin: window.ke.oyuncu.altin, dolu: window.ke.oyuncu.envanter.filter(Boolean).length, mesaj: window.__m.splice(0).slice(-3) }));
console.log('önce', JSON.stringify(await durum()));
const alinan = await s.evaluate(async () => {
  const n = window.ke.npcler.find((n) => n.tanim.satis > 0 && [13003, 13005, 13007, 22301, 23400].includes(n.tanim.sid)); window.ke.npcTikla(n);
  const m = await (await fetch('/magaza/magaza.json')).json(); const no = m.gruplar[String(n.tanim.satis)][0].find(Boolean); const e = { ...m.esyalar[String(no)], simge: '' };
  window.ke.arayuz().b.magazaSatinAl(e); return { no, ad: e.ad, fiyat: e.fiyat };
});
await s.waitForTimeout(1500); console.log('alım', JSON.stringify(alinan), JSON.stringify(await durum()));
await s.evaluate((ad) => { const o = window.ke.oyuncu; const i = o.envanter.findIndex((e) => e && e.ad === ad); if (i >= 0) window.ke.arayuz().b.magazaSat(i); }, alinan.ad);
await s.waitForTimeout(1500); console.log('satım', JSON.stringify(await durum()));
console.log('hatalar', JSON.stringify(hatalar));
await t.close();
