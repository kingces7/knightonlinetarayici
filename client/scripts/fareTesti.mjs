// Geliştirme aracı: sol tuşla sürükleme yürüyüşü, sağ tuşla yumuşak yatay kamera, orta tuşta ad sabitliği.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
const d = () => s.evaluate(() => ({ x: window.ke.oyuncu.konum.x, y: window.ke.oyuncu.konum.y, h: window.ke.oyuncu.bakisAcisi, aci: window.ke.kamera.aci, egim: window.ke.kamera.egim }));
const r = {};
const a = await d();
await s.mouse.move(683, 250); await s.mouse.down(); await s.mouse.move(900, 300, { steps: 5 }); await s.waitForTimeout(900);
const b1 = await d(); await s.mouse.move(400, 250, { steps: 5 }); await s.waitForTimeout(900); const b2 = await d(); await s.mouse.up();
r.solSurukle = { yol1: +Math.hypot(b1.x - a.x, b1.y - a.y).toFixed(2), yonDegisti: +(b2.h - b1.h).toFixed(2), yol2: +Math.hypot(b2.x - b1.x, b2.y - b1.y).toFixed(2) };
await s.waitForTimeout(800); const c0 = await d();
await s.mouse.move(683, 300); await s.mouse.down({ button: 'right' }); await s.mouse.move(783, 400, { steps: 10 }); await s.waitForTimeout(50); const c1 = await d(); await s.waitForTimeout(600); const c2 = await d(); await s.mouse.up({ button: 'right' });
r.sagTus = { anindaDonus: +(c1.aci - c0.aci).toFixed(3), sonDonus: +(c2.aci - c0.aci).toFixed(3), egimDegisimi: +(c2.egim - c0.egim).toFixed(3) };
const nick = () => s.evaluate(() => { const e = document.querySelector('.etiket.oyuncu'); const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.bottom)]; });
const n0 = await nick(); await s.mouse.click(683, 300, { button: 'middle' }); const nler = []; for (let i = 0; i < 8; i++) { await s.waitForTimeout(100); nler.push(await nick()); }
r.nick = { once: n0, ortaTusSirasinda: nler };
r.hatalar = hatalar;
console.log(JSON.stringify(r));
await t.close();
