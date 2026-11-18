// Geliştirme aracı: canavar eşzamanlılık ölçümü. A (kotest) gezer, sonra durur; B (kotest1, taze giriş) aynı noktada bakar; iki client'ın canavar listeleri karşılaştırılır.
// Kullanım: KO_HIZ=7 KO_ROTA=1 node scripts/senkronOlcum.mjs   (KO_ROTA=0: A hiç gezmez, 60 sn bekler)
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const aç = async (h, p, x, z) => { const s = await t.newPage({ viewport: { width: 960, height: 540 } }); await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2000); await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [h, p]); if (x) await s.evaluate(([x, z]) => window.ke.sunucuIsinla(x, z), [x, z]); return s; };
const A = await aç('kotest', 'batu1151', 190, 320); await A.waitForTimeout(4000);
if (process.env.KO_ROTA !== '0') {
  await A.evaluate((h) => { window.ke.oyuncu.hizCarpani = h; }, Number(process.env.KO_HIZ ?? 7));
  for (const [x, z] of [[300, 300], [200, 230], [160, 440], [320, 380], [230, 260], [190, 320]]) { await A.evaluate(([x, z]) => { const o = window.ke.oyuncu; o.yuruHedef = new o.konum.constructor(x, z); }, [x, z]); await A.waitForTimeout(9000); }
} else await A.waitForTimeout(60000);
await A.waitForTimeout(8000);
const son = await A.evaluate(() => [Math.round(window.ke.oyuncu.konum.x), Math.round(window.ke.oyuncu.konum.y)]);
const B = await aç('kotest1', 'kotest1', son[0], son[1]); await B.waitForTimeout(7000);
const al = (s) => s.evaluate(() => window.ke.canavarlar.filter((c) => c.agModu && !c.olu).map((c) => [c.agKimlik, c.tur.ad, c.konum.x, c.konum.y]));
const [a, b] = [await al(A), await al(B)];
const yalnizA = a.filter((m) => !b.find((q) => q[0] === m[0])), yalnizB = b.filter((m) => !a.find((q) => q[0] === m[0]));
const mesafe = (m) => Math.hypot(m[2] - son[0], m[3] - son[1]).toFixed(0);
console.log('durdu', son, '| ortak', a.length - yalnizA.length, '| yalnız A (hayalet?)', yalnizA.length, '| yalnız B (A eksik)', yalnizB.length);
console.log('A-yalnız mesafeler', yalnizA.map(mesafe).join(' '), '\nB-yalnız mesafeler', yalnizB.map(mesafe).join(' '));
console.log('A bilinmeyen tür', JSON.stringify(await A.evaluate(() => window.ke.sunucuDurumu()?.bilinmeyenTurler)));
await t.close();
