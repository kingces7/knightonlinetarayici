// Geliştirme aracı: Moradon canavarları hareket ediyor mu? 25 sn boyunca konumları örnekler. Yalnız kotest (bölge 21'de olmalı).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
const [x0, z0] = (process.env.KO_YER ?? '230,300').split(',').map(Number);
await s.evaluate(([x, z]) => window.ke.sunucuIsinla(x, z), [x0, z0]); await s.waitForTimeout(6000);
const ornek = () => s.evaluate(() => window.ke.canavarlar.filter((c) => c.agModu && !c.olu).map((c) => [c.agKimlik, c.tur.ad, c.konum.x, c.konum.y]));
const a = await ornek(); await s.waitForTimeout(12000); const b = await ornek(); await s.waitForTimeout(12000); const c = await ornek();
const hareket = (p, q) => q.filter((m) => { const e = p.find((x) => x[0] === m[0]); return e && Math.hypot(e[2] - m[2], e[3] - m[3]) > 0.5; }).length;
console.log('canavar sayısı', a.length, '| 12 sn içinde hareket eden:', hareket(a, b), '| sonraki 12 sn:', hareket(b, c));
console.log(JSON.stringify(b.slice(0, 6).map((m) => [m[1], Math.round(m[2]), Math.round(m[3])])));
await t.close();
