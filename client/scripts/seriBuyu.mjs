// Geliştirme aracı: sınıf büyüsü testi (kotest2: RogTest1 / MageTest1 / PriTest1). Kullanım: node scripts/buyuTesti.mjs <klasör> <karakter-sırası 0-2> <skill no> [hedef=dusman|ben]
import { chromium } from 'playwright-core';
const [klasor, sira = '1', skill = '203002', hedefTur = 'dusman'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=1'); await s.waitForSelector('[data-id=Edit_ID] input', { timeout: 120000 }); await s.waitForTimeout(1500);
await s.fill('[data-id=Edit_ID] input', 'kotest2'); await s.fill('[data-id=Edit_PW] input', 'kotest2'); await s.keyboard.press('Enter'); await s.waitForTimeout(4500);
for (let i = 0; i < Number(sira); i++) { await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_right]')].find((x) => x.offsetParent)?.click()); await s.waitForTimeout(300); }
await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_start]')].find((x) => x.offsetParent)?.click());
await s.waitForFunction(() => window.ke?.oyuncu?.ad, null, { timeout: 60000 }); await s.waitForTimeout(12500); // göz kırpma biter
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
console.log('karakter', await s.evaluate(() => JSON.stringify({ ad: window.ke.oyuncu.ad, sinif: window.ke.oyuncu.sinif, seviye: window.ke.oyuncu.seviye, mana: window.ke.oyuncu.mana, beceriler: window.ke.arayuz()?.cubukBeceri?.filter(Boolean) })));
if (hedefTur === 'dusman') await s.evaluate(() => { const o = window.ke.oyuncu; const c = window.ke.canavarlar.filter((c) => c.agModu && !c.olu).sort((a, b) => a.konum.distanceTo(o.konum) - b.konum.distanceTo(o.konum))[0]; if (c) { o.hedef = c; window.__hedef = c; } });
console.log('hedef', await s.evaluate(() => window.__hedef ? window.__hedef.tur.ad + ' mesafe ' + Math.round(window.__hedef.konum.distanceTo(window.ke.oyuncu.konum)) : 'yok'));
const once = await s.evaluate(() => ({ mana: window.ke.oyuncu.mana, can: window.ke.oyuncu.can, hedefCan: window.__hedef?.can }));
console.log('ekip', await s.evaluate(() => JSON.stringify({e8: window.ke.oyuncu.ekipman[8], e6: window.ke.oyuncu.ekipman[6], ok: window.ke.oyuncu.envanter.filter(Boolean).map((e) => [e.no, e.sunucuNo, e.adet]), hedef: !!window.ke.oyuncu.hedef})));
await s.evaluate((no) => window.ke.beceriKullan(+no), skill); const kareler = []; for (let k = 0; k < 30; k++) { const h = await s.evaluate(() => { const g = window.__hedef.grup.position.clone().project(window.ke.kamera.kamera); return { x: (g.x + 1) / 2 * 1280, y: (1 - g.y) / 2 * 800 }; }); const cx = Math.max(0, Math.min(1280 - 300, h.x - 150)), cy = Math.max(0, Math.min(800 - 260, h.y - 150)); kareler.push((await s.screenshot({ clip: { x: cx, y: cy, width: 300, height: 260 } })).toString("base64")); await s.waitForTimeout(40); }
const m = await t.newPage({ viewport: { width: 1680, height: 1050 } }); await m.setContent("<body style=margin:0;background:#000>" + kareler.map((b, i) => "<div style=display:inline-block;position:relative><img width=270 src=data:image/png;base64," + b + "><span style=position:absolute;left:2px;top:2px;color:#ff0>" + i + "</span></div>").join("")); await m.screenshot({ path: klasor + "/montaj.png" });
console.log('önce', JSON.stringify(once), 'sonra', await s.evaluate(() => JSON.stringify({ mana: window.ke.oyuncu.mana, can: window.ke.oyuncu.can, hedefCan: window.__hedef?.can, mesaj: window.__m.slice(-5) })), JSON.stringify(h));
await t.close();
