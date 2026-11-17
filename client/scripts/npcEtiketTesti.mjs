// Geliştirme aracı: NPC ad etiketinin ekranda NPC'nin tepesinde olup olmadığını ölçer (model üst noktası ile etiket noktası farkı, ekran pikseli). Kullanım: node scripts/npcEtiketTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3500);
console.log(await s.evaluate(() => window.ke.npcler.map((n) => `${n.ad.padEnd(26)} boy=${n.boy.toFixed(2)} etiketY=${n.etiketY.toFixed(2)} eski=${(2.1 * n.tanim.boyut / 100).toFixed(2)}`).join('\n')));
await t.close();
