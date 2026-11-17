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
await s.evaluate((no) => window.ke.beceriKullan(+no), skill); await s.waitForTimeout(900);
await s.screenshot({ path: `${klasor}/buyu_hazirlik.png` });
await s.waitForTimeout(1500);
await s.screenshot({ path: `${klasor}/buyu_ucus.png` });
await s.waitForTimeout(2000);
console.log('önce', JSON.stringify(once), 'sonra', await s.evaluate(() => JSON.stringify({ mana: window.ke.oyuncu.mana, can: window.ke.oyuncu.can, hedefCan: window.__hedef?.can, mesaj: window.__m.slice(-5) })), JSON.stringify(h));
await t.close();
