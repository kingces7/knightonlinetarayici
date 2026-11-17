// Geliştirme aracı: sunucu modunda NPC diyalogu (yalnız kotest). NPC'ye gidip tıklar, menüyü ve düğmeleri yazdırır, ilk düğmeye basar. Kullanım: KO_HESAP=… KO_SIFRE=… node scripts/diyalogSunucuTesti.mjs [npcSid=18004]
import { chromium } from 'playwright-core';
const sid = Number(process.argv[2] ?? 18004);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
await s.evaluate((sid) => { const n = window.ke.npcler.find((n) => n.tanim.sid === sid); window.ke.sunucuIsinla(n.konum.x + 1.5, n.konum.y); }, sid); await s.waitForTimeout(4500);
await s.evaluate((sid) => window.ke.npcTikla(window.ke.npcler.find((n) => n.tanim.sid === sid)), sid); await s.waitForTimeout(2500);
const goster = () => s.evaluate(() => { const a = window.ke.arayuz(); const d = a.diyalog; if (!d?.acik) return { acik: false, mesaj: window.__m.splice(0) }; const el = d.p.el; const vis = (e) => e.offsetParent !== null; return { acik: true, baslik: d.p.alan('txt_title')?.textContent, konusma: d.p.alan('txt_talk')?.textContent.slice(0, 160), dugmeler: [...el.querySelectorAll('.ui-t1')].filter((b) => /^btn_\d+$/.test(b.dataset.id ?? '') && vis(b)).map((b) => b.querySelector('.ui-yazi span')?.textContent), mesaj: window.__m.splice(0) }; });
console.log('görev durumları', await s.evaluate(() => [...window.ke.gorevDurumlari.entries()].join(' ')), 'seviye', await s.evaluate(() => [window.ke.oyuncu.seviye, window.ke.oyuncu.sinif]));
console.log('1. menü', JSON.stringify(await goster(), null, 1)); await s.screenshot({ path: 'E:/tmp/diyalog1.png' });
await s.evaluate(() => window.ke.arayuz().diyalog.p.tikla.get('btn_0')?.()); await s.waitForTimeout(2000);
console.log('2. menü (ilk düğmeden sonra)', JSON.stringify(await goster(), null, 1)); await s.screenshot({ path: 'E:/tmp/diyalog2.png' });
if (process.env.TERFI) { await s.evaluate(() => { window.__op = []; window.ke.arayuz().diyalog.p.tikla.get('btn_0')?.(); }); await s.waitForTimeout(2500); console.log('3. terfi sonrası', JSON.stringify(await goster()), await s.evaluate(() => ({ op: window.__op, sinif: window.ke.oyuncu.sinif, altin: window.ke.oyuncu.altin }))); await s.screenshot({ path: 'E:/tmp/diyalog3.png' }); }
console.log('hatalar', JSON.stringify(hatalar)); await t.close();
