// Geliştirme aracı: ?model=NO ile açıp verilen animasyonları sırayla çekip kaydeder. Kullanım: node scripts/modelbak.mjs NO klasor anim1 anim2 …
import { chromium } from 'playwright-core';
const [no, klasor, ...adlar] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 700, height: 500 } });
s.on('pageerror', (e) => console.log('HATA', e.message));
await s.goto(`http://localhost:5173/?harita=14th_oldmoradon&model=${no}`);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(3000);
await s.addStyleTag({ content: 'body > *:not(canvas){display:none!important}' });
await s.evaluate(() => { const k = window.ke.kamera; k.uzaklik = 4; k.egim = 0.1; const m = window.ke.oyuncu.model; m.oynatGercek = m.oynat.bind(m); m.oynat = () => 0; }); // oyun döngüsü her karede 'bekle' diye ezmesin
console.log('klipler', await s.evaluate(() => [...window.ke.oyuncu.model.klipler.keys()].length));
for (const [i, ad] of adlar.entries()) {
  await s.evaluate((a) => window.ke.oyuncu.model.oynatGercek(a, true, 0), ad);
  await s.waitForTimeout(700);
  await s.screenshot({ path: `${klasor}/m${i}_${ad}.png`, clip: { x: 150, y: 50, width: 400, height: 400 } });
}
await t.close();
