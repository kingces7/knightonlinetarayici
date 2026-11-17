// Geliştirme aracı: yerel modda mağaza penceresinin ekran görüntüsü. Kullanım: node scripts/magazaGorunum.mjs <png yolu>
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { window.ke.oyuncu.altin = 50000; window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0)); }); await s.waitForTimeout(2000);
await s.screenshot({ path: process.argv[2] ?? 'E:/tmp/magaza.png', clip: { x: 880, y: 0, width: 400, height: 740 } });
await t.close();
