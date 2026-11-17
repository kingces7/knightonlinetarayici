// Geliştirme aracı: envanter, banka ve mağaza pencerelerinin arka plan saydamlığını karşılaştırır (ekran görüntüsü E:/tmp). Kullanım: node scripts/saydamlikBak.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { const a = window.ke.arayuz(); a.depoAc(); }); await s.waitForTimeout(1200);
await s.keyboard.press('i'); await s.waitForTimeout(800);
await s.screenshot({ path: 'E:/tmp/saydam_depo.png' });
await s.evaluate(() => { window.ke.arayuz().ac('depo', false); window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis === 253000)); }); await s.waitForTimeout(1500);
await s.screenshot({ path: 'E:/tmp/saydam_magaza.png' });
const d = await s.evaluate(() => [...window.ke.arayuz().magazaYeni.p.el.querySelectorAll('.ui-t4')].map((r) => `${r.style.backgroundImage.slice(-40)} ${r.style.width}x${r.style.height} @${r.style.left},${r.style.top} op=${r.style.opacity} d=${r.style.display}`));
console.log(d.join('\n')); await t.close();
