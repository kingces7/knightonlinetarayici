// Geliştirme aracı: sunucu modunda eşya taşıma testi; sonunda client envanterini yazar (sunucudakiyle kopru/src/envanter-yakala.ts çıktısı karşılaştırılır). Yalnız kotest.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
const dok = () => s.evaluate(() => ({ ekp: window.ke.oyuncu.ekipman.map((e, i) => e ? `${i}:${e.sunucuNo ?? e.no}` : '').filter(Boolean).join(' '), env: window.ke.oyuncu.envanter.map((e, i) => e ? `${i + 14}:${e.sunucuNo ?? e.no}x${e.adet ?? 1}` : '').filter(Boolean).join(' ') }));
const adim = async (ad, js) => { await s.evaluate(js); await s.waitForTimeout(1200); console.log(ad, JSON.stringify(await dok()), JSON.stringify(await s.evaluate(() => window.__m.splice(0).slice(-2)))); };
console.log('başlangıç', JSON.stringify(await dok()));
const a = s.evaluate.bind(s);
await adim('çıkar(4)', () => window.ke.arayuz().b.esyaCikar(4));
await adim('giy(inv0)', () => { const o = window.ke.oyuncu; const i = o.envanter.findIndex((e) => e && e.tur === 'zirh'); if (i >= 0) window.ke.arayuz().b.esyaKusan(i); });
await adim('tasi c0->c5', () => window.ke.arayuz().b.esyaTasi({ tur: 'c', i: 0 }, { tur: 'c', i: 5 }));
await adim('geçersiz: ok -> ekipman 6', () => { const o = window.ke.oyuncu; const i = o.envanter.findIndex((e) => e && e.sayilabilir); window.ke.arayuz().b.esyaTasi({ tur: 'c', i }, { tur: 'e', i: 6 }); });
console.log('hatalar', JSON.stringify(hatalar));
await t.close();
