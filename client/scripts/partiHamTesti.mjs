// Geliştirme aracı: iki hesapla parti kurar (kotest davet eder, kotest1 kabul eder) ve gelen ham WIZ_PARTY gövdelerini yazar. Kullanım: KO_HESAP=kotest KO_SIFRE=… KO_HESAP2=kotest1 KO_SIFRE2=… node scripts/partiHamTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const sayfa = async (h, p) => { const s = await t.newPage({ viewport: { width: 900, height: 600 } }); s.on('dialog', (d) => d.accept()); s.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 200)));
  await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2000);
  const r = await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [h, p]); await s.evaluate(() => window.ke.sunucuIsinla(264, 304)); return [s, r.ad]; };
const [a, adA] = await sayfa(process.env.KO_HESAP, process.env.KO_SIFRE), [b, adB] = await sayfa(process.env.KO_HESAP2, process.env.KO_SIFRE2);
console.log('oyuncular', adA, adB); await a.waitForTimeout(9000);
console.log('A, B\'yi görüyor mu', await a.evaluate((ad) => { const d = window.ke.digerOyuncular.find((x) => x.ad === ad); if (d) window.ke.secilenAyarla(d); return !!d; }, adB));
await a.evaluate(() => window.ke.arayuz().b.partiDavet()); await a.waitForTimeout(9000);
for (const [ad, s] of [[adA, a], [adB, b]]) console.log('--', ad, JSON.stringify(await s.evaluate(() => window.__parti ?? [])));
await t.close();
