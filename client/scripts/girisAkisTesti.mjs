// Geliştirme aracı: gerçek sunucuyla giriş → karakter seçimi → Back (giriş ekranına dönüş) → yeniden giriş → Start Game akışı.
// Kullanım: KO_HESAP=.. KO_SIFRE=.. node scripts/girisAkisTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const klasor = process.argv[2] ?? '.'; const { KO_HESAP: h, KO_SIFRE: p } = process.env;
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=1&harita=14th_oldmoradon');
await s.waitForSelector('input[type=password]', { timeout: 120000 }); await s.waitForTimeout(1000);
const tikla = async (x, y) => { await s.mouse.click(x, y); await s.waitForTimeout(400); };
const giris = async () => { await s.fill('input[autocomplete=username]', h); await s.fill('input[type=password]', p); await s.keyboard.press('Enter'); await s.waitForTimeout(3500); };
await giris(); // karakter seçim ekranı
await tikla(297, 592); // Back
console.log('Back sonrası giriş çubuğu geri geldi:', await s.evaluate(() => !!document.querySelector('input[type=password]') && document.querySelector('input[type=password]').offsetParent !== null));
await s.screenshot({ path: `${klasor}/g3_back.png` });
await giris(); await tikla(297, 740); // Start Game
await s.waitForTimeout(3000);
console.log('katman kapandı:', await s.evaluate(() => !document.querySelector('input[type=password]')));
console.log('oyuncu:', await s.evaluate(() => ({ ad: window.ke.oyuncu.ad, seviye: window.ke.oyuncu.seviye, sunucu: !!window.ke.sunucuDurumu() })));
await s.screenshot({ path: `${klasor}/g4_oyun.png` });
console.log('hatalar', hatalar); await t.close();
