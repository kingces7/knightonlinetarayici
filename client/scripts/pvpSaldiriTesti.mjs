// Geliştirme aracı: bir hesapla girip PvPRobot'u seçer, R ile temel saldırı başlatır; robotun can çubuğunun (hedef çerçevesi) inişini izler.
// Kullanım: KO_HESAP=… KO_SIFRE=… node scripts/pvpSaldiriTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 700 } });
s.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 200)));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2000);
console.log(await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]));
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; window.ke.sunucuIsinla(264, 304); });
await s.waitForTimeout(12000); // yeni karakter ~10 sn bağışık
await s.evaluate(() => { const d = window.ke.digerOyuncular.find((x) => x.ad === 'PvPRobot'); window.ke.secilenAyarla(d); });
await s.waitForTimeout(1500);
await s.keyboard.press('KeyR');
for (let i = 0; i < 8; i++) {
  await s.waitForTimeout(1500);
  console.log(i, await s.evaluate(() => [window.ke.oyuncu.saldiriSayaci, window.ke.oyuncu.animKilidi, window.ke.oyuncu.aktifAd, window.ke.oyuncu.olu, window.ke.oyuncu.blinkBitis]), JSON.stringify(await s.evaluate(() => { const d = window.ke.digerOyuncular.find((x) => x.ad === 'PvPRobot'); return d ? [d.can, d.enCok, Math.round(window.ke.oyuncu.konum.distanceTo(d.konum) * 10) / 10] : null; })), JSON.stringify(await s.evaluate(() => window.__m.slice(-3))));
}
await t.close();
