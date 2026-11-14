// Geliştirme aracı: W+A ile çapraz yürüyüp A bırakılınca yönün korunduğunu, tüm tuşlar bırakılınca sıfırlandığını denetler.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 800, height: 500 } });
await s.goto('http://localhost:5173/?harita=14th_oldmoradon');
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(3000);
const aci = () => s.evaluate(() => +(window.ke.oyuncu.yuruAcisi ?? NaN).toFixed(3));
await s.keyboard.down('KeyW'); await s.waitForTimeout(1500); console.log('W', await aci());
await s.keyboard.down('KeyA'); await s.waitForTimeout(1500); console.log('W+A', await aci());
await s.keyboard.up('KeyA'); await s.waitForTimeout(1500); console.log('A bırakıldı (W basılı)', await aci());
await s.keyboard.up('KeyW'); await s.waitForTimeout(300); console.log('hepsi bırakıldı', await aci());
await s.keyboard.down('KeyW'); await s.waitForTimeout(1500); console.log('yeniden W', await aci());
await s.keyboard.up('KeyW');
await t.close();
