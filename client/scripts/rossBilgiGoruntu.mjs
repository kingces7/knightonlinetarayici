// Geliştirme aracı (ross): bilgi (hasar) ve sohbet pencerelerinin ekran görüntüsünü alır. Edge CDP 9333 üzerinden bağlanır.
// Kullanım: node scripts/rossBilgiGoruntu.mjs <klasor> [genislik] [yukseklik]
import { chromium } from 'playwright-core';
const [klasor = '.', w = '1600', h = '900'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = t.contexts()[0] ?? await t.newContext();
const s = await ctx.newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.evaluate(() => { try { localStorage.removeItem('ke_pencere_bilgi'); localStorage.removeItem('ke_pencere_sohbet'); } catch { /* */ } });
await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => {
  const a = window.ke.arayuz();
  for (let i = 0; i < 14; i++) a.bilgiMesaji(`You hit Raptor for ${100 + i} damage. Very long message to test wrapping inside the window ${i}`, i % 2 ? 'hasar' : 'odul');
  for (let i = 0; i < 3; i++) a.tuccarSohbetiYaz(`Merchant${i}: Selling Iron Bow cheap ${i}`);
  for (let i = 0; i < 12; i++) a.duyuruYaz(`Server notice number ${i}: Castle siege starts soon.`);
  for (let i = 0; i < 10; i++) a.sohbetYaz(`[Normal] Test${i}: hello there`);
});
await s.waitForTimeout(500);
const kutu = async () => { const r = await s.evaluate(() => { const b = window.ke.arayuz().bilgi.el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }); return { x: r[0] - 10, y: r[1] - 10, width: r[2] + 20, height: r[3] + 20 }; };
const sohbetKutu = async () => { const r = await s.evaluate(() => { const b = window.ke.arayuz().sohbet.el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }); return { x: r[0] - 10, y: r[1] - 10, width: r[2] + 20, height: r[3] + 20 }; };
await s.screenshot({ path: `${klasor}/i1_bilgi.png`, clip: await kutu() });
await s.screenshot({ path: `${klasor}/i1_sohbet.png`, clip: await sohbetKutu() });
const tikla = async (id) => { const b = await s.evaluate((id) => { const e = window.ke.arayuz().bilgi.bul(id)[0]; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id); await s.mouse.click(b[0], b[1]); await s.mouse.move(10, 10); await s.waitForTimeout(250); };
await tikla('btn_Merchant'); await s.screenshot({ path: `${klasor}/i2_tuccar.png`, clip: await kutu() });
await tikla('btn_notice'); await s.screenshot({ path: `${klasor}/i3_duyuru.png`, clip: await kutu() });
// Information etiketine bas
const e = await s.evaluate(() => { const y = [...window.ke.arayuz().bilgi.el.querySelectorAll('.ui-yazi')].find((x) => x.textContent === 'Information').parentElement.nextElementSibling; return null; });
// kaydırma: kutucuğu sürükle
const kt = await s.evaluate(() => { const sc = window.ke.arayuz().bilgi.bul('scroll')[0]; const yol = sc.querySelector('.ui-t7'); const k = yol.children[1]; const r = k.getBoundingClientRect(); const y = yol.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, yolAlt: y.bottom }; });
await s.mouse.move(kt.x, kt.y); await s.mouse.down(); await s.mouse.move(kt.x, kt.y - 30, { steps: 5 }); await s.mouse.up();
await s.waitForTimeout(200); await s.screenshot({ path: `${klasor}/i4_surukle.png`, clip: await kutu() });
console.log(JSON.stringify({ hatalar, ust: await s.evaluate(() => [...window.ke.arayuz().bilgi.el.querySelectorAll('.ui-gunluk')].map((k) => [k.style.display, k.scrollTop, k.scrollHeight, k.clientHeight]) ) }));
await s.close();
await t.close();
