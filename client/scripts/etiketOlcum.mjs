// Geliştirme aracı: sunucu modunda verilen noktaya gider, yakındaki canavarların boy / etiket yüksekliğini yazar ve ekran görüntüsü alır. Kullanım: node scripts/etiketOlcum.mjs <klasör> <x> <z> [ad parçası]
import { chromium } from 'playwright-core';
const [klasor, x, z, ad = ''] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=1'); await s.waitForSelector('[data-id=Edit_ID] input', { timeout: 120000 }); await s.waitForTimeout(1500);
await s.fill('[data-id=Edit_ID] input', 'kotest2'); await s.fill('[data-id=Edit_PW] input', 'kotest2'); await s.keyboard.press('Enter'); await s.waitForTimeout(4500);
await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_start]')].find((e) => e.offsetParent)?.click());
await s.waitForFunction(() => window.ke?.oyuncu?.ad, null, { timeout: 60000 }); await s.waitForTimeout(8000);
await s.evaluate(([x, z]) => window.ke.sunucuIsinla(+x, +z), [x, z]); await s.waitForTimeout(6000);
const r = await s.evaluate((ad) => window.ke.canavarlar.filter((c) => c.tur.ad.toLowerCase().includes(ad.toLowerCase())).slice(0, 6).map((c) => ({ ad: c.tur.ad, boy: +c.boy.toFixed(2), etiketY: +c.etiketY.toFixed(2), yaricap: +c.secimYaricapi.toFixed(2), uzak: +c.konum.distanceTo(window.ke.oyuncu.konum).toFixed(1) })), ad);
console.log(JSON.stringify(r, null, 1));
await s.screenshot({ path: `${klasor}/etiket.png` });
await t.close();
