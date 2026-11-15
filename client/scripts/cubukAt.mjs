// Geliştirme aracı: çubuktaki skill'i dışarı sürükleyip bırakınca atılır; sol+sağ tuşla düz ilerleme (kamera yönü değişse de sapmaz).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
const bar = () => s.evaluate(() => window.ke.arayuz().cubukBeceri.slice(0, 4));
const r = { once: await bar() };
await s.locator('.ui-t9[data-id="1"]').filter({ has: s.locator('.cubuk-bekleme') }).first().dragTo(s.locator('canvas').first(), { targetPosition: { x: 700, y: 300 } });
await s.waitForTimeout(300); r.atilanSonra = await bar();
// sol + sağ tuş: yön sabit kalmalı
const d = () => s.evaluate(() => ({ x: window.ke.oyuncu.konum.x, y: window.ke.oyuncu.konum.y, h: window.ke.oyuncu.bakisAcisi }));
await s.mouse.move(683, 300); await s.mouse.down(); await s.mouse.move(690, 280, { steps: 2 }); await s.waitForTimeout(300);
await s.mouse.down({ button: 'right' });
const a = await d();
for (let i = 0; i < 14; i++) { await s.mouse.move(690 + i * 15, 280); await s.waitForTimeout(70); }
await s.waitForTimeout(400); const b = await d();
await s.mouse.up({ button: 'right' }); await s.mouse.up();
let dh = b.h - a.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
r.ikiTus = { yol: +Math.hypot(b.x - a.x, b.y - a.y).toFixed(2), yonDegisimi_derece: +(dh * 57.3).toFixed(1) };
r.hatalar = hatalar; console.log(JSON.stringify(r));
await t.close();
