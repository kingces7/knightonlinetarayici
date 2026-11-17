// Geçici: PriTest1 (kotest2) robot oyuncuyu (kotest1) iyileştirir. Kullanım: node scripts/_iyilestirTesti.mjs <skill no>
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
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
console.log('diğerleri', await s.evaluate(() => JSON.stringify(window.ke.digerOyuncular?.map((d) => [d.ad, d.kimlik, d.konum.x, d.konum.y]))));
console.log('seç', await s.evaluate(() => { const d = window.ke.digerOyuncular?.[0]; if (!d) return 'yok'; window.ke.secilenAyarla(d); return d.ad; }));
const once = await s.evaluate(() => ({ mana: window.ke.oyuncu.mana }));
await s.evaluate((no) => window.ke.beceriKullan(+no), skill); for (const ms of [1900, 450, 450]) { await s.waitForTimeout(ms); await s.screenshot({ path: (process.argv[3] ?? 'iy') + (ms + Math.random()).toFixed(0) + '.png' }); }
console.log('önce', JSON.stringify(once), 'sonra', await s.evaluate(() => JSON.stringify({ mana: window.ke.oyuncu.mana, mesaj: window.__m })), h);
await s.waitForTimeout(1500); r.kill(); await t.close();
