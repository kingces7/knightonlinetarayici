// Geliştirme aracı: mağaza penceresinde Buy ve Sell sekmelerini sırayla görüntüler. Kullanım: node scripts/magazaSekmeBak.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = 'E:/tmp'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.altin = 50000; window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0)); }); await s.waitForTimeout(2000);
const klip = { x: 880, y: 300, width: 400, height: 200 };
await s.screenshot({ path: `${klasor}/buy.png`, clip: klip });
await s.evaluate(() => window.ke.arayuz().magazaYeni.sekme(true)); await s.waitForTimeout(400);
await s.screenshot({ path: `${klasor}/sell.png`, clip: klip });
await t.close();
