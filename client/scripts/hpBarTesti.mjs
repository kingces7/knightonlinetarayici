// Geliştirme aracı: sunucu canavarına vururken hedef HP çubuğunun genişliğini zamanla ölçer + ekran görüntüsü alır.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 3 });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
if (await s.evaluate(() => window.ke.oyuncu.olu)) { await s.evaluate(() => window.ke.hud.yenidenDog()); await s.waitForTimeout(3000); }
await s.evaluate(() => window.ke.oyuncu.isinla(430, 217, window.ke.arazi));
for (let i = 0; i < 30; i++) { await s.waitForTimeout(500); if (await s.evaluate(() => window.ke.canavarlar.some((c) => c.agModu && !c.olu))) break; }
await s.evaluate(() => { const o = window.ke.oyuncu; const c = window.ke.canavarlar.filter((c) => c.agModu && !c.olu).sort((a, b) => a.konum.distanceTo(o.konum) - b.konum.distanceTo(o.konum))[0]; o.hedef = c; o.isinla(c.konum.x + 2, c.konum.z, window.ke.arazi); });
await s.waitForTimeout(1500);
const olc = () => s.evaluate(() => { const k = [...document.querySelectorAll('.ui-ilerleme')].filter((e) => e.offsetParent && e.dataset.tam && /level/.test(e.parentElement?.dataset?.id ?? e.parentElement?.className ?? '') || false); return [...document.querySelectorAll('.ui-ilerleme')].filter((e) => e.offsetParent !== null && e.dataset.tam).map((e) => Math.round(parseFloat(e.style.width)) + '/' + e.dataset.tam).join(' ') + ' | hedefCan=' + window.ke.oyuncu.hedef?.can + '/' + window.ke.oyuncu.hedef?.enCok; });
console.log('önce:', await olc());
await s.screenshot({ path: `${klasor}/hp0.png` });
await s.evaluate(() => { window.ke.oyuncu.saldiriyor = true; });
for (let i = 0; i < 8; i++) { await s.waitForTimeout(150); console.log(i, await olc()); if (i >= 1 && i <= 3) await s.screenshot({ path: `${klasor}/hp${i}.png`, clip: { x: 520, y: 10, width: 240, height: 60 } }); }
await t.close();
