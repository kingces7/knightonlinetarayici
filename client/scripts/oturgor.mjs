// Geliştirme aracı: oturma pozunu 3 açıdan (yan, ön, arka) çekip klasöre kaydeder. Kullanım: node scripts/oturgor.mjs klasor [pozEtiketi]
import { chromium } from 'playwright-core';
const [klasor, etiket = 'o'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 700, height: 500 } });
s.on('pageerror', (e) => console.log('HATA', e.message));
await s.goto('http://localhost:5173/?harita=14th_oldmoradon');
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(3000);
await s.keyboard.press('KeyC'); await s.waitForTimeout(1500);
await s.addStyleTag({ content: 'body > *:not(canvas){display:none!important}' });
for (const [ad, aci] of [['yan', Math.PI / 2], ['on', 0], ['arka', Math.PI]]) {
  await s.evaluate((a) => { const k = window.ke.kamera; k.uzaklik = 4.5; k.egim = 0.05; k.aci = a; }, aci);
  await s.waitForTimeout(500);
  await s.screenshot({ path: `${klasor}/${etiket}_${ad}.png` });
}
await t.close();
