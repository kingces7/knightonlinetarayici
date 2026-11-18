// Geliştirme aracı: GM eşya dükkânı ([Item Master] Aurora, grup 999000): sayfa sayısı, ücretsiz alım, ekran görüntüsü. Yalnız GM yetkili test hesabıyla (kotest).
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(`http://localhost:5173/?giris=0&harita=${process.env.KO_HARITA ?? '14th_oldmoradon'}`); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
const npc = await s.evaluate(() => { const n = window.ke.npcler.find((n) => n.tanim.sid === 29990); if (!n) return null; window.ke.sunucuIsinla(n.konum.x + 2, n.konum.y); return { ad: n.ad, satis: n.tanim.satis, x: n.konum.x, z: n.konum.y }; });
console.log('NPC', JSON.stringify(npc)); if (!npc) process.exit(1);
await s.evaluate((p) => { window.__sayfa = p; }, Number(process.env.KO_SAYFA ?? 60));
await s.waitForTimeout(4500);
const durum = () => s.evaluate(() => ({ altin: window.ke.oyuncu.altin, dolu: window.ke.oyuncu.envanter.filter(Boolean).length, mesaj: window.__m.splice(0).slice(-3) }));
console.log('önce', JSON.stringify(await durum()));
const alinan = await s.evaluate(async () => {
  const n = window.ke.npcler.find((n) => n.tanim.sid === 29990); window.ke.npcTikla(n);
  const m = await (await fetch('/magaza/magaza.json')).json(); const sayfalar = m.gruplar['999000']; const sayfa = sayfalar[Math.min(Number(window.__sayfa ?? 60), sayfalar.length - 1)];
  const no = sayfa.find(Boolean); const e = { ...m.esyalar[String(no)], simge: '' };
  return { sayfaSayisi: sayfalar.length, esyaSayisi: sayfalar.flat().filter(Boolean).length, no, ad: e.ad, fiyat: e.fiyat, e };
});
await s.waitForTimeout(1500); await s.screenshot({ path: `${klasor}/gm_dukkan.png` });
await s.evaluate((e) => window.ke.arayuz().b.magazaSatinAl(e), alinan.e);
await s.waitForTimeout(2000);
const { e: _e, ...ozet } = alinan; console.log('alım', JSON.stringify(ozet), JSON.stringify(await durum()));
console.log('hatalar', JSON.stringify(hatalar));
await t.close();
