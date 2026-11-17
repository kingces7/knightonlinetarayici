// Geliştirme aracı: öldürme sayacının görünümünü önizler (3 öldürme; ekran görüntüleri E:/tmp/kill_*.png). Kullanım: node scripts/oldurmeGorunum.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.oldurmeSayaci, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.oldurmeSayaci.ekle(1, 'kingces')); await s.waitForTimeout(500); await s.screenshot({ path: 'E:/tmp/kill_1.png', clip: { x: 340, y: 60, width: 600, height: 200 } });
await s.evaluate(() => { window.ke.oldurmeSayaci.ekle(2); }); await s.waitForTimeout(500); await s.screenshot({ path: 'E:/tmp/kill_2.png', clip: { x: 340, y: 60, width: 600, height: 200 } });
await s.evaluate(() => { window.ke.oldurmeSayaci.ekle(3); }); await s.waitForTimeout(500); await s.screenshot({ path: 'E:/tmp/kill_3.png' });
await t.close();
