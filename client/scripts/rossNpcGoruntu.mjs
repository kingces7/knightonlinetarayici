// Geliştirme aracı (ross): ışınlanma listesi (eski/yeni), mağaza NPC'si ve Inn menüsünü açıp görüntü alır. Edge CDP 9333.
// Kullanım: node scripts/rossNpcGoruntu.mjs <klasor> [genislik] [yukseklik]
import { chromium } from 'playwright-core';
const [klasor = '.', w = '1600', h = '900'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const r = {};
// 1) ham orijinal pencere
await s.evaluate(async () => { await window.ke.arayuz().genel.ac('re_el_warp'); }); await s.waitForTimeout(700);
await s.screenshot({ path: `${klasor}/n_warp_ham.png` });
await s.evaluate(() => { window.ke.arayuz().genel.hepsiniKapat(); });
// 2) mağaza NPC'si ve Inn menüsü (sunucusuz: yerel diyalog)
await s.evaluate(() => { const a = window.ke.arayuz(); a.diyalogDuz('Test Blacksmith', 'A great blacksmith like me is hard to find. Tell me if you need anything...', [{ yazi: 'I want to trade.', sec: () => undefined }, { yazi: 'I want to repair.', sec: () => undefined }, { yazi: 'I want to exchange.', sec: () => undefined, pasif: true }, { yazi: 'Walk away.', sec: () => undefined }]); });
await s.waitForTimeout(900); await s.screenshot({ path: `${klasor}/n_magaza.png` });
await s.evaluate(() => { window.ke.arayuz().diyalogKapat(); });
// 3) ışınlanma listesi (uygulamanın kendi çağrısı)
await s.evaluate(() => { window.__sec = []; window.ke.arayuz().isinlanmaListesi([
  { ad: 'Luferson Castle', duyuru: 'The gate to Luferson Castle. Be careful: the area is dangerous.', ucret: 0, sec: () => window.__sec.push('lufer') },
  { ad: 'Ronark Land', duyuru: '', ucret: 5000, sec: () => window.__sec.push('ronark') },
  { ad: 'Delos', duyuru: 'Not ready', ucret: 0, pasif: true, sec: () => window.__sec.push('delos') }]); });
await s.waitForTimeout(900); await s.screenshot({ path: `${klasor}/n_kapi.png` });
// ikinci satıra tıkla, Confirm
const c = await s.evaluate(() => { const e = window.ke.arayuz().isinlanma.p.el.querySelector('[data-satir="1"]').getBoundingClientRect(); return [e.left + 50, e.top + e.height / 2]; });
await s.mouse.click(c[0], c[1]); await s.waitForTimeout(300); await s.screenshot({ path: `${klasor}/n_kapi2.png` });
await s.keyboard.press('Enter'); await s.waitForTimeout(300);
r.secilen = await s.evaluate(() => window.__sec); r.acikMi = await s.evaluate(() => window.ke.arayuz().isinlanma.acik);
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
