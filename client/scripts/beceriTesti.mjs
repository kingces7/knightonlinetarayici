// Geliştirme aracı: savaşçı skill'lerinin hepsini sırayla kullanır; bilgi penceresindeki iletileri ve etkileri yazar.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(() => { const o = window.ke.oyuncu; o.seviye = 10; o.canManaHesapla(true); o.mana = o.enCokMana = 200; });
const msgs = () => s.evaluate(() => [...document.querySelectorAll('[data-id="text_message"] div')].map((d) => d.textContent));
const sonuc = [];
// hedefi yanına getir
await s.evaluate(() => { const c = window.ke.canavarlar.find((x) => !x.olu); const o = window.ke.oyuncu; o.konum.set(c.konum.x - 1.5, c.konum.y); o.grup.position.set(o.konum.x, 0, -o.konum.y); });
await s.waitForTimeout(500);
await s.keyboard.press('KeyZ'); await s.waitForTimeout(300);
for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6']) {
  const once = (await msgs()).length;
  await s.evaluate(() => { const c = window.ke.oyuncu.hedef; if (c) { c.can = c.enCok = 9999; } window.ke.oyuncu.beceriBekleme.clear(); });
  await s.keyboard.press(k); await s.waitForTimeout(900);
  const m = await msgs();
  sonuc.push({ tus: k, yeni: m.slice(once), buflar: await s.evaluate(() => window.ke.oyuncu.buflar.map((b) => `${b.ad} hiz=${b.hiz} ac=${b.ac}`)), mana: await s.evaluate(() => Math.round(window.ke.oyuncu.mana)) });
}
console.log(JSON.stringify({ sonuc, hatalar }, null, 1));
await t.close();
