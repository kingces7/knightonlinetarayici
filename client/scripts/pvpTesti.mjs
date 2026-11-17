// Geliştirme aracı: iki hesap (farklı ulus) — A, B'ye skill atar; B'nin canı ve mesajlar. Kullanım: KO_HESAP=… KO_SIFRE=… KO_HESAP2=… KO_SIFRE2=… KO_BECERI=205500 node scripts/pvpTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const sayfa = async (h, p) => { const s = await t.newPage({ viewport: { width: 1100, height: 700 } }); s.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 200)));
  await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2000);
  const r = await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [h, p]); await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; window.ke.sunucuIsinla(264, 304); }); return [s, r.ad]; };
const [a, adA] = await sayfa(process.env.KO_HESAP, process.env.KO_SIFRE), [b, adB] = await sayfa(process.env.KO_HESAP2, process.env.KO_SIFRE2);
await a.waitForTimeout(8000);
console.log('B canı (B ekranında)', await b.evaluate(() => [window.ke.oyuncu.can, window.ke.oyuncu.enCok]));
for (const no of (process.env.KO_BECERI ?? '205500').split(',').map(Number)) {
  await a.evaluate((ad) => { const d = window.ke.digerOyuncular.find((x) => x.ad === ad); window.ke.secilenAyarla(d); window.ke.oyuncu.mana = 5000; window.ke.oyuncu.isinla(d.konum.x - 1.5, d.konum.y, window.ke.arazi); }, adB); await a.waitForTimeout(1200);
  await a.evaluate((no) => { window.__m.length = 0; window.ke.beceriKullan(no); }, no); await a.waitForTimeout(2500);
  console.log('kill sayacı A', await a.evaluate(() => document.querySelector('.ke-kill-plaka .sayi')?.textContent));
  console.log(no, 'A mesaj', JSON.stringify(await a.evaluate(() => window.__m.slice(0, 4))), '| B canı', JSON.stringify(await b.evaluate(() => [window.ke.oyuncu.can, window.ke.oyuncu.enCok])), 'B mesaj', JSON.stringify(await b.evaluate(() => window.__m.slice(-3))));
}
await t.close();
