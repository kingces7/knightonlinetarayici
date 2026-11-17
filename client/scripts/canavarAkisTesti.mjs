// Geliştirme aracı: sunucu modunda yakındaki canavarların konumunu 100 ms'de bir örnekler; hedefi varken duran (donan) kare sayısını yazar.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1000, height: 700 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=1'); await s.waitForSelector('[data-id=Edit_ID] input', { timeout: 120000 }); await s.waitForTimeout(1500);
await s.fill('[data-id=Edit_ID] input', 'kotest2'); await s.fill('[data-id=Edit_PW] input', 'kotest2'); await s.keyboard.press('Enter'); await s.waitForTimeout(4500);
await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_start]')].find((e) => e.offsetParent)?.click());
await s.waitForFunction(() => window.ke?.oyuncu?.ad, null, { timeout: 60000 }); await s.waitForTimeout(8000);
const r = await s.evaluate(async () => {
  const cs = window.ke.canavarlar.filter((c) => c.agModu && !c.olu && c.konum.distanceTo(window.ke.oyuncu.konum) < 60);
  const son = new Map(cs.map((c) => [c, c.konum.clone()])); let donuk = 0, hareket = 0, kare = 0;
  for (let i = 0; i < 300; i++) { await new Promise((r) => setTimeout(r, 100)); for (const c of cs) { const d = c.konum.distanceTo(son.get(c)); son.get(c).copy(c.konum); kare++; if (c.agHedef && c.konum.distanceTo(c.agHedef) > 0.3 && d < 0.001) donuk++; if (d > 0.001) hareket++; } }
  return { canavar: cs.length, kare, hareketli: hareket, hedefiVarkenDonuk: donuk };
});
console.log(JSON.stringify(r), h);
await t.close();
