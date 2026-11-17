// Geliştirme aracı (yerel mod): her mağaza NPC türünde ilk eşyayı envantere sürükle; yığınsa adet kutusu, değilse doğrudan alım. Kullanım: node scripts/magazaTumNpcTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const satislar = await s.evaluate(() => [...new Set(window.ke.npcler.filter((x) => x.tanim.satis > 0).map((x) => x.tanim.satis))]);
console.log('mağaza türü sayısı', satislar.length);
for (const sid of satislar) {
  await s.evaluate((sid) => { window.ke.oyuncu.altin = 99999999; window.ke.oyuncu.envanter.fill(null); window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis === sid)); }, sid); await s.waitForTimeout(1200);
  const bilgi = await s.evaluate(() => { const m = window.ke.arayuz().magazaYeni; const e = m.sayfalar?.[0]?.[0]; return e ? { ad: e.ad, yigin: !!e.sayilabilir } : null; });
  if (!bilgi) { console.log(sid, 'boş sayfa'); continue; }
  const nokta = (g, i) => s.evaluate(([g, i]) => { const r = window.ke.arayuz().magazaYeni[g][i].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [g, i]);
  const a = await nokta('magaza', 0), c = await nokta('canta', 4);
  await s.mouse.move(a[0], a[1]); await s.mouse.down(); await s.mouse.move(c[0], c[1], { steps: 10 }); await s.mouse.up(); await s.waitForTimeout(400);
  const kutu = await s.evaluate(() => !!window.ke.arayuz().magazaYeni.p.el.querySelector('input'));
  if (kutu) { await s.keyboard.press('Control+A'); await s.keyboard.type('3'); await s.keyboard.press('Enter'); await s.waitForTimeout(400); }
  const env = await s.evaluate(() => window.ke.oyuncu.envanter.filter(Boolean).map((e) => `${e.ad} x${e.adet ?? 1}`));
  console.log(sid, bilgi.ad, bilgi.yigin ? 'yığın' : 'tek', 'adet kutusu:', kutu, '→', env.join(', ') || 'ALINAMADI');
  await s.evaluate(() => window.ke.arayuz().magazaYeni.kapat()); await s.waitForTimeout(200);
}
console.log('hatalar', h); await t.close();
