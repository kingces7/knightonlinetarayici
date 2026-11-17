// Geliştirme aracı: sunucu modunda banka testi (yalnız kotest).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
const npc = await s.evaluate(() => { const n = window.ke.npcler.find((n) => n.tanim.sid === 16096); window.ke.sunucuIsinla(n.konum.x + 1.5, n.konum.y); return n ? { x: n.konum.x, y: n.konum.y } : null; });
console.log('banka NPC', JSON.stringify(npc)); await s.waitForTimeout(4000);
const d = () => s.evaluate(() => ({ altin: window.ke.oyuncu.altin, banka: window.ke.oyuncu.depoAltin, canta: window.ke.oyuncu.envanter.filter(Boolean).length, depo: window.ke.oyuncu.depo.filter(Boolean).length, mesaj: window.__m.splice(0).slice(-3) }));
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((n) => n.tanim.sid === 16096))); await s.waitForTimeout(1500);
console.log('açıldı', JSON.stringify(await d()));
const b = () => s.evaluate(() => window.ke.arayuz().b);
await s.evaluate(() => window.ke.arayuz().b.bankaIslem({ tur: 'altin-yatir' })); await s.waitForTimeout(1200); console.log('Noah yatır', JSON.stringify(await d()));
await s.evaluate(() => { const i = window.ke.oyuncu.envanter.findIndex((e) => e); window.ke.arayuz().b.bankaIslem({ tur: 'esya-yatir', canta: i }); }); await s.waitForTimeout(1200); console.log('eşya yatır', JSON.stringify(await d()));
await s.evaluate(() => { const j = window.ke.oyuncu.depo.findIndex((e) => e); window.ke.arayuz().b.bankaIslem({ tur: 'esya-cek', banka: j }); }); await s.waitForTimeout(1200); console.log('eşya çek', JSON.stringify(await d()));
await s.evaluate(() => window.ke.arayuz().b.bankaIslem({ tur: 'altin-cek' })); await s.waitForTimeout(1200); console.log('Noah çek', JSON.stringify(await d()));
console.log('hatalar', JSON.stringify(hatalar)); await t.close();
