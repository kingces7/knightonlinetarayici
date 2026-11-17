// Geliştirme aracı (yerel mod): mağaza ve banka açıkken hareket edince kapanır. Kullanım: node scripts/npcHareketKapatTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const acik = () => s.evaluate(() => window.ke.arayuz().npcPencereAcik());
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0))); await s.waitForTimeout(1500);
console.log('mağaza açıldı, hareketsiz 1,5 sn sonra açık mı', await acik());
await s.keyboard.down('KeyW'); await s.waitForTimeout(400); await s.keyboard.up('KeyW'); await s.waitForTimeout(300); console.log('W ile hareket sonrası açık mı (false olmalı)', await acik());
await s.evaluate(() => window.ke.arayuz().depoAc()); await s.waitForTimeout(1200); console.log('banka açıldı', await acik());
await s.mouse.click(300, 500); await s.waitForTimeout(600); console.log('yere tıklayıp yürüyünce açık mı (false olmalı)', await acik());
await t.close();
