// Geliştirme aracı (ross): U/K/I pencerelerini sırayla açıp görüntüsünü alır + buff şeridi. Edge CDP 9333.
// Kullanım: node scripts/rossPencereGoruntu.mjs <klasor> [genislik] [yukseklik]
import { chromium } from 'playwright-core';
const [klasor = '.', w = '1600', h = '900'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('ke_') || k.startsWith('ke.')) localStorage.removeItem(k); } catch { /* */ } });
await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const rapor = {};
const gor = (ad) => s.evaluate((ad) => { const p = window.ke.arayuz().pencereler[ad]; const [l, t, r, b] = p.sinir(); const bb = p.el.getBoundingClientRect(); const o = p.olcek; return { sol: Math.round(bb.left + l * o), ust: Math.round(bb.top + t * o), sag: Math.round(bb.left + r * o), alt: Math.round(bb.top + b * o) }; }, ad);
await s.keyboard.press('KeyU'); await s.waitForTimeout(900); await s.screenshot({ path: `${klasor}/p_durum.png` }); await s.keyboard.press('KeyU'); await s.waitForTimeout(500);
await s.keyboard.press('KeyI'); await s.waitForTimeout(900); rapor.envanter = await gor('envanter'); await s.screenshot({ path: `${klasor}/p_envanter.png` });
await s.keyboard.press('KeyK'); await s.waitForTimeout(900); rapor.beceri = await gor('beceri'); await s.screenshot({ path: `${klasor}/p_beceri.png` });
// envanteri sürükle, sonra skill'i aç: aynı yerde olmalı
await s.keyboard.press('KeyK'); await s.waitForTimeout(500); await s.keyboard.press('KeyI'); await s.waitForTimeout(800);
const k = await s.evaluate(() => { const p = window.ke.arayuz().pencereler.envanter; const b = p.el.getBoundingClientRect(); const [l, t] = p.sinir(); return [b.left + (l + 100) * p.olcek, b.top + (t + 8) * p.olcek]; });
await s.mouse.move(k[0], k[1]); await s.mouse.down(); await s.mouse.move(k[0] - 350, k[1] + 60, { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(300);
rapor.envanterSurukle = await gor('envanter');
await s.keyboard.press('KeyK'); await s.waitForTimeout(900); rapor.beceriSonra = await gor('beceri');
await s.keyboard.press('KeyK'); await s.waitForTimeout(500);
// buff şeridi
await s.evaluate(() => { const o = window.ke.arayuz().b.oyuncu; const simdi = performance.now() / 1000; o.buflar.push({ no: 108010, bitis: simdi + 60, sure: 60 }, { no: 108020, bitis: simdi + 30, sure: 60 }); });
await s.waitForTimeout(800); await s.screenshot({ path: `${klasor}/p_buff.png` });
rapor.buff = await s.evaluate(() => { const k = window.ke.arayuz().buffKap; const b = k?.getBoundingClientRect(); return b ? { sol: Math.round(b.left), ust: Math.round(b.top), sag: Math.round(b.right), alt: Math.round(b.bottom), ikon: k.querySelector('[data-no]')?.getBoundingClientRect().width } : null; });
console.log(JSON.stringify({ hatalar, rapor }));
await s.close(); await t.close();
