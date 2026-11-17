// Geliştirme aracı: banka penceresinde orta tuşla (Mouse3) sayfa çevirme. Kullanım: node scripts/depoOrtaTusTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => window.ke.arayuz().depoAc()); await s.waitForTimeout(1500);
const sayfa = () => s.evaluate(() => window.ke.arayuz().depoSayfa + 1);
await s.mouse.move(1100, 200); await s.mouse.down({ button: 'middle' });
await s.mouse.move(1100, 280, { steps: 8 }); console.log('aşağı 80px sonrası sayfa', await sayfa());
await s.mouse.move(1100, 330, { steps: 6 }); console.log('toplam ~130px aşağı sonrası sayfa', await sayfa());
await s.mouse.move(1100, 270, { steps: 8 }); console.log('yukarı çekince sayfa', await sayfa());
await s.mouse.up({ button: 'middle' }); await s.mouse.move(1100, 100, { steps: 4 }); console.log('tuş bırakılınca değişmemeli', await sayfa());
await t.close();
