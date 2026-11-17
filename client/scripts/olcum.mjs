// Geliştirme aracı: bir test hesabıyla girip giriş paketindeki can/savunma/vuruş değerlerini yazar. Kullanım: KO_HESAP=… KO_SIFRE=… node scripts/olcum.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage(); await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2000);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]); await s.waitForTimeout(1200);
console.log(JSON.stringify(await s.evaluate(() => { const m = window.ke.benimBilgi; return { ad: m.ad, seviye: m.seviye, sinif: m.sinif, can: m.can + '/' + m.azamiCan, mana: m.azamiMana, savunma: m.toplamSavunma, vurus: m.toplamVurus, str: m.statlar.str.deger, sta: m.statlar.sta.deger }; })));
await t.close();
