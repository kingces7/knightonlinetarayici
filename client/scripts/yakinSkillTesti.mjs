// Geliştirme aracı: yerel modda savaşçı yakın dövüş skill'ini bir canavara kullanır; oyuncu çevresinden kare montajı alır. Kullanım: node scripts/yakinSkillTesti.mjs <klasör> <skill no>
import { chromium } from 'playwright-core';
const [klasor, skill = '201005'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1000, height: 700 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.oyuncu?.model, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.kamera.uzaklik = 4.5; window.ke.oyuncu.seviye = 12; window.ke.oyuncu.mana = 200; window.ke.oyuncu.enCokMana = 200; });
const hedef = await s.evaluate(() => { const o = window.ke.oyuncu; const c = window.ke.canavarlar.filter((c) => !c.olu).sort((a, b) => a.konum.distanceTo(o.konum) - b.konum.distanceTo(o.konum))[0]; if (!c) return null; o.konum.set(c.konum.x - 1.6, c.konum.y); o.hedef = c; return c.tur.ad; });
console.log('hedef', hedef); await s.waitForTimeout(800);
await s.evaluate((n) => window.ke.beceriKullan(+n), skill);
const kareler = [];
for (let k = 0; k < 24; k++) { kareler.push((await s.screenshot({ clip: { x: 250, y: 150, width: 500, height: 400 } })).toString('base64')); await s.waitForTimeout(40); }
const m = await t.newPage({ viewport: { width: 1620, height: 1100 } });
await m.setContent('<body style=margin:0;background:#000>' + kareler.map((b, i) => `<div style=display:inline-block;position:relative><img width=270 src=data:image/png;base64,${b}><span style=position:absolute;left:2px;top:2px;color:#ff0>${i}</span></div>`).join(''));
await m.screenshot({ path: `${klasor}/montaj.png` });
console.log('hatalar', h); await t.close();
