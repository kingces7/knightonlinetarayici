// Geliştirme aracı: PriTest1 (kotest2) yanında robot oyuncu (kotest1) durur, yakın çekim görüntü alınır. Kullanım: node scripts/_iyilestirTesti.mjs <skill no>
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const skill = process.argv[2] ?? '204002';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=1'); await s.waitForSelector('[data-id=Edit_ID] input', { timeout: 120000 }); await s.waitForTimeout(1500);
await s.fill('[data-id=Edit_ID] input', 'kotest2'); await s.fill('[data-id=Edit_PW] input', 'kotest2'); await s.keyboard.press('Enter'); await s.waitForTimeout(4500);
for (let i = 0; i < 2; i++) { await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_right]')].find((x) => x.offsetParent)?.click()); await s.waitForTimeout(300); }
await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_start]')].find((x) => x.offsetParent)?.click());
await s.waitForFunction(() => window.ke?.oyuncu?.ad, null, { timeout: 60000 }); await s.waitForTimeout(12500);
const konum = await s.evaluate(() => ({ ad: window.ke.oyuncu.ad, x: window.ke.oyuncu.konum.x, z: window.ke.oyuncu.konum.y }));
console.log('ben', JSON.stringify(konum));
const r = spawn('node', ['../kopru/src/saglik-robotu.ts', String(konum.x + 2), String(konum.z + 2), '40'], { stdio: 'inherit' });
await s.waitForTimeout(9000);
await s.evaluate(() => { window.ke.kamera.uzaklik = 5; });
await s.waitForTimeout(2500); await s.screenshot({ path: (process.argv[3] ?? 'kask') + '.png' });
console.log('diğerleri', await s.evaluate(() => JSON.stringify(window.ke.digerOyuncular?.map((o) => [o.ad, o.konum.x, o.konum.y]))));
r.kill(); await t.close();
