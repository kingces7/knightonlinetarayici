// Geliştirme aracı: çubukta sürükleyerek yer değiştirme, skill penceresinde sağ tıkla hızlı yerleştirme, seviye denetimi, imleç.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
const bar = () => s.evaluate(() => window.ke.arayuz().cubukBeceri.slice(0, 8));
const r = {};
r.varsayilan = await bar();
// 1) yer değiştirme: dikey çubukta 0. ve 1. yuva
const yuva = (i) => s.locator(`.ui-t9[data-id="${i}"]`).filter({ has: s.locator('.cubuk-bekleme') }).first();
await yuva(0).dragTo(yuva(1)); await s.waitForTimeout(300); r.takasSonra = await bar();
// 2) seviye 1'de seviye 3 skill'i sağ tıkla → konmamalı
await s.keyboard.press('KeyK'); await s.waitForTimeout(800);
const pen = s.locator('.ui-pencere', { has: s.locator('[data-id="string_skillpoint"]') });
const alanlar = pen.locator('.ui-t9').filter({ hasNot: s.locator('.cubuk-bekleme') });
const adlar = await s.evaluate(() => [...document.querySelectorAll('[data-id^="string_list_"]')].map((e) => e.textContent.replace(/\s+/g, ' ')));
r.pencereAdlari = adlar.slice(0, 6);
const sag = async (i) => { const p = await s.evaluate((k) => { const w = [...document.querySelectorAll('.ui-pencere')].find((x) => x.querySelector('[data-id="string_skillpoint"]')); const e = w.querySelector(`.ui-t9[data-id="${k}"]`); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, i); await s.mouse.click(p[0], p[1], { button: 'right' }); await s.waitForTimeout(250); };
await sag(2); r.sv3SagTik = await bar();            // Slash (sv.3) konmamalı
await s.evaluate(() => { window.ke.oyuncu.seviye = 5; });
await sag(2); r.sv5SonraSlash = await bar();        // artık konmalı (ilk boş yuva)
await sag(2); r.tekrar = await bar();               // zaten çubukta
// imleç
r.imlec = await s.evaluate(() => getComputedStyle(document.body).cursor.slice(0, 60));
r.hatalar = hatalar;
console.log(JSON.stringify(r, null, 1));
await t.close();
