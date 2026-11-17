import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 720 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.ke.oyuncu.isinla(430, 217, window.ke.arayuz ? window.ke.arazi : window.ke.arazi); }); await s.waitForTimeout(5000);
await s.evaluate(() => { const o = window.ke.oyuncu; window.__izle = window.ke.canavarlar.filter((c) => c.agModu && !c.olu && c.konum.distanceTo(o.konum) < 25).slice(0, 4); window.__log = []; window.__t0 = performance.now(); const iv = setInterval(() => { window.__log.push([Math.round(performance.now() - window.__t0), window.__izle.map((c) => c.can).join('/')]); if (performance.now() - window.__t0 > 4500) clearInterval(iv); }, 150); window.ke.oyuncu.mana = 5000; window.ke.beceriKullan(205645); });
await s.waitForTimeout(5000);
const l = await s.evaluate(() => window.__log); let onceki = ''; for (const [ms, v] of l) { if (v !== onceki) console.log(ms, v); onceki = v; }
await t.close();
