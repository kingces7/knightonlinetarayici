// Geliştirme aracı: banka penceresinde fare tekerleğiyle sayfa çevirme. Kullanım: node scripts/depoOrtaTusTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.arayuz().depoAc()); await s.waitForTimeout(1500);
const sayfa = () => s.evaluate(() => window.ke.arayuz().depoSayfa + 1);
const zoom = () => s.evaluate(() => window.ke.kamera.uzaklik);
await s.mouse.move(1100, 300); const z0 = await zoom();
await s.mouse.wheel(0, 100); await s.waitForTimeout(150); console.log('tekerlek aşağı → sayfa', await sayfa());
await s.mouse.wheel(0, 100); await s.waitForTimeout(150); console.log('tekerlek aşağı → sayfa', await sayfa());
await s.mouse.wheel(0, -100); await s.waitForTimeout(150); console.log('tekerlek yukarı → sayfa', await sayfa());
await s.mouse.wheel(0, -100); await s.waitForTimeout(150); await s.mouse.wheel(0, -100); await s.waitForTimeout(150); console.log('başa gelince sayfa (1\'in altına inmemeli)', await sayfa());
console.log('kamera zoom değişmedi mi', z0 === await zoom());
await t.close();
