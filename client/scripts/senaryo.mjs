// Geliştirme aracı: oyunu açar, en yakın canavarlara saldırtır, ekran görüntüsü alır.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/', cikti = 'senaryo.png'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
for (let tur = 0; tur < 3; tur++) {
  await s.evaluate(() => {
    const o = window.ke; const p = o.oyuncu.konum;
    const c = o.canavarlar.filter((x) => !x.olu).sort((a, b) => a.konum.distanceTo(p) - b.konum.distanceTo(p))[0];
    o.oyuncu.hedef = c; o.kamera.uzaklik = 10;
  });
  await s.waitForTimeout(12000);
}
// Düşen kutuya git ve aç
await s.evaluate(() => { const o = window.ke; const k = o.kutular[0]; if (k) { o.hud.ganimetAc(k); } });
await s.keyboard.press('KeyI');
await s.waitForTimeout(800);
await s.screenshot({ path: cikti });
const bilgi = await s.evaluate(() => {
  const o = window.ke;
  return { seviye: o.oyuncu.seviye, can: Math.round(o.oyuncu.can), deneyim: o.oyuncu.deneyim, altin: o.oyuncu.altin, kutu: o.kutular.length,
    olu: o.canavarlar.filter((c) => c.olu).length, mesajlar: [...document.querySelectorAll('.mesajlar .m')].slice(-10).map((m) => m.textContent) };
});
console.log(JSON.stringify(bilgi, null, 1), hatalar);
await t.close();
