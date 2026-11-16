// Geliştirme aracı: giriş ekranını açar, ekran görüntüsü alır; hesap/şifre verilirse gerçek sunucuyla tam akışı dener.
// Kullanım: node scripts/girisEkraniTesti.mjs <klasör> [hesap şifre]
import { chromium } from 'playwright-core';
const [klasor = '.', hesap, sifre] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=1&harita=14th_oldmoradon');
await s.waitForSelector('input[type=password]', { timeout: 120000 }); await s.waitForTimeout(1500);
await s.screenshot({ path: `${klasor}/g1_giris.png` });
await s.keyboard.press('Enter'); await s.waitForTimeout(300);
console.log('boş gönderim:', await s.evaluate(() => document.body.innerText.match(/Enter your ID[^\n]*/)?.[0]));
if (hesap) {
  await s.fill('input[autocomplete=username]', hesap); await s.fill('input[type=password]', sifre); await s.keyboard.press('Enter');
  await s.waitForTimeout(4000);
  await s.screenshot({ path: `${klasor}/g2_sonuc.png` });
  console.log('metin:', (await s.evaluate(() => document.getElementById('arayuz').innerText)).replace(/\n+/g, ' | ').slice(0, 300));
}
console.log('hatalar', hatalar);
await t.close();
