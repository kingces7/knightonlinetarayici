// Geliştirme aracı (yerel mod): banka sağ tık hedefleri (bulunulan sayfa, dolu sayfada en yakın boş, aynı yığına yığılma), adet kutusu, sürükle-bırak. Kullanım: node scripts/depoSurukleTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(async () => {
  const tum = await (await fetch('/esya/tum.json')).json(); const o = window.ke.oyuncu;
  const e = (ad, no, ek = {}) => ({ ...tum.find((x) => x.ad === ad), sunucuNo: no, ...ek });
  o.envanter[0] = e('Short Blade', 120110000); o.envanter[1] = e('Spear', 150210000); o.envanter[2] = e('Arrow', 391010000, { adet: 100 });
  o.depo[3] = e('Arrow', 391010000, { adet: 50 }); // 1. sayfada bir ok yığını
  window.ke.arayuz().depoAc();
});
await s.waitForTimeout(1500);
const depo = () => s.evaluate(() => window.ke.oyuncu.depo.map((e, i) => e ? `${i}:${e.ad}${e.adet ? ' x' + e.adet : ''}` : null).filter(Boolean));
const canta = () => s.evaluate(() => window.ke.oyuncu.envanter.map((e, i) => e ? `${i}:${e.ad}${e.adet ? ' x' + e.adet : ''}` : null).filter(Boolean));
const yer = (yer, i) => s.evaluate(([y, i]) => { const a = window.ke.arayuz(); const el = (y === 'depo' ? a.depoUst() : a.depoAlt())[i]; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [yer, i]);
const sag = async (y, i) => { const p = await yer(y, i); await s.mouse.click(p[0], p[1], { button: 'right' }); await s.waitForTimeout(300); };
await s.mouse.move(1100, 300); await s.mouse.wheel(0, 100); await s.waitForTimeout(300); // 2. sayfa
console.log('sayfa', await s.evaluate(() => window.ke.arayuz().depoSayfa + 1));
await sag('canta', 0); console.log('1) sağ tık, 2. sayfadaki ilk boş yuva (24 olmalı)', await depo());
// 2. sayfayı doldur (24..47), sonra sağ tık: en yakın boş (23)
await s.evaluate(() => { const o = window.ke.oyuncu; for (let j = 24; j < 48; j++) if (!o.depo[j]) o.depo[j] = { ...o.depo[24], no: 999000 + j, adet: undefined }; window.ke.arayuz().depoImza = ''; }); await s.waitForTimeout(300);
await sag('canta', 1); console.log('2) sayfa dolu → en yakın boş yuva (23 olmalı)', (await depo()).filter((x) => x.includes('Spear')));
// 3) ok yığını: 1. sayfadaki 3. yuvada 50 ok var; 2. sayfadayken sağ tık → adet kutusu → 30 → üstüne yığılmalı
await sag('canta', 2); await s.waitForTimeout(300);
console.log('3) adet kutusu açıldı mı', await s.evaluate(() => !!window.ke.arayuz().pencereler.depo.el.querySelector('input')));
await s.keyboard.press('Control+A'); await s.keyboard.type('30'); await s.keyboard.press('Enter'); await s.waitForTimeout(400);
console.log('   banka ok yığını (3: x80 olmalı)', (await depo()).filter((x) => x.includes('Arrow')), 'çanta', await canta());
console.log('hatalar', h); await t.close();
