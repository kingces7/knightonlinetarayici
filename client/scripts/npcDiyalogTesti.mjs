// Geliştirme aracı: Inn Hostess ve Sundries konuşma menüleri (ekran görüntüsü) + seçenekler. KO_HESAP/KO_SIFRE ile (kotest). Kullanım: node scripts/npcDiyalogTesti.mjs <klasor>
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
const dene = async (ad, x, z, dosya, secenek) => {
  await s.evaluate(([x, z]) => window.ke.sunucuIsinla(x, z), [x, z]); await s.waitForTimeout(3000);
  const var_ = await s.evaluate((ad) => { const n = window.ke.npcler.find((n) => n.tanim.ad.includes(ad)); if (!n) return null; window.ke.npcTikla(n); return n.ad; }, ad);
  await s.waitForTimeout(1500); await s.screenshot({ path: `${klasor}/${dosya}.png` });
  const yazilar = await s.evaluate(() => [...document.querySelectorAll('.ui-yazi span')].filter((e) => e.offsetParent && e.closest('[data-ad], div')).map((e) => e.textContent).filter((x) => x && x.length > 2).slice(0, 12));
  console.log(ad, JSON.stringify(var_), JSON.stringify(yazilar));
  if (secenek) { await s.evaluate((t) => { [...document.querySelectorAll('div')].find((e) => e.children.length === 0 && e.textContent === t)?.click(); }, secenek); await s.waitForTimeout(2000); await s.screenshot({ path: `${klasor}/${dosya}_sec.png` }); console.log('seçenek', secenek, 'mağaza/depo açık:', await s.evaluate(() => { const a = window.ke.arayuz(); return [a.npcPencereAcik(), !!document.querySelector('[class*=ui-]') ]; })); }
};
await dene('Neria', 396, 395, 'inn');
await dene('Zarta', 320, 308, 'sundries', 'I want to trade.');
console.log('mesajlar', JSON.stringify(await s.evaluate(() => window.__m.slice(-5))), 'hatalar', JSON.stringify(hatalar));
await t.close();
