// Geliştirme aracı (ross): sohbet ve bilgi pencerelerini etiketlerinden sürükleyip bırakılan yeri ölçer. Edge CDP 9333.
import { chromium } from 'playwright-core';
const [w = '1600', h = '900'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('ke_') || k.startsWith('ke.')) localStorage.removeItem(k); } catch { /* */ } });
await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const gor = (ad) => s.evaluate((ad) => { const p = window.ke.arayuz()[ad]; const [l, t, r, b] = p.sinir(); const bb = p.el.getBoundingClientRect(); const o = p.olcek; return { sol: Math.round(bb.left + l * o), ust: Math.round(bb.top + t * o), sag: Math.round(bb.left + r * o), alt: Math.round(bb.top + b * o) }; }, ad);
const tut = (ad) => s.evaluate((ad) => { const p = window.ke.arayuz()[ad]; const bb = p.el.getBoundingClientRect(); const o = p.olcek; return ad === 'sohbet' ? [bb.left + 45 * o, bb.bottom - 11 * o] : [bb.right - 65 * o, bb.bottom - 11 * o]; }, ad);
const surukle = async (ad, dx, dy) => { const k = await tut(ad); await s.mouse.move(k[0], k[1]); await s.mouse.down(); await s.mouse.move(k[0] + dx, k[1] + dy, { steps: 10 }); await s.mouse.up(); await s.waitForTimeout(400); };
const r = { basta: { sohbet: await gor('sohbet'), bilgi: await gor('bilgi') } };
await surukle('sohbet', 300, 60); r.sohbetGorevCubuguUstunde = await gor('sohbet');   // görev çubuğuna binecek şekilde: yerinde kalmalı
await surukle('bilgi', -300, 50); r.bilgiSolda = await gor('bilgi');
await surukle('bilgi', -150, 0); r.bilgiSohbetinUstunde = await gor('bilgi');   // sohbetle çakışır: yerinde kalmalı
await s.reload(); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
r.yenidenYuklemeSonrasi = { sohbet: await gor('sohbet'), bilgi: await gor('bilgi') }; // kayıtlı konum hatırlanmalı
await s.screenshot({ path: process.argv[4] ?? 'sr.png' });
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
