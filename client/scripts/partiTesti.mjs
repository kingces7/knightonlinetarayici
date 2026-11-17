// Geliştirme aracı: iki hesapla parti (davet, kabul, pencere, ayrılma). Kullanım: KO_HESAP=… KO_SIFRE=… KO_HESAP2=… KO_SIFRE2=… node scripts/partiTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const sayfa = async (h, p) => { const s = await t.newPage({ viewport: { width: 1100, height: 700 } }); s.on('dialog', (d) => d.accept()); s.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 200)));
  await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2000);
  const r = await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [h, p]); await s.evaluate(() => window.ke.sunucuIsinla(264, 304)); return [s, r.ad]; };
const [a, adA] = await sayfa(process.env.KO_HESAP, process.env.KO_SIFRE), [b, adB] = await sayfa(process.env.KO_HESAP2, process.env.KO_SIFRE2);
await a.waitForTimeout(8000);
await a.evaluate((ad) => { const d = window.ke.digerOyuncular.find((x) => x.ad === ad); window.ke.secilenAyarla(d); window.ke.arayuz().b.partiDavet(); }, adB); await a.waitForTimeout(3500);
const uyeler = (s) => s.evaluate(() => window.ke.partiUyeleri().map((u) => `${u.ad}:${u.can}/${u.enCokCan} L${u.seviye}`));
console.log('A', await uyeler(a), '| B', await uyeler(b));
for (const s of [a, b]) await s.evaluate(() => window.ke.arayuz().genel.ac('re_el_party')); await a.waitForTimeout(1200);
await a.screenshot({ path: 'E:/tmp/parti_a.png', clip: { x: 200, y: 20, width: 460, height: 420 } });
const idB = await b.evaluate(() => window.ke.partiUyeleri().find((u) => /KoTest/i.test(u.ad))?.id ?? -1);
await (process.env.DAGIT ? a.evaluate(() => window.ke.arayuz().b.partiDagit()) : b.evaluate((id) => window.ke.arayuz().b.partiAyril(id), idB)); await a.waitForTimeout(2500);
console.log('ham A', JSON.stringify((await a.evaluate(() => window.__parti)).slice(-3)), 'ham B', JSON.stringify((await b.evaluate(() => window.__parti)).slice(-3)));
console.log('B ayrıldıktan sonra A', await uyeler(a), '| B', await uyeler(b));
await t.close();
