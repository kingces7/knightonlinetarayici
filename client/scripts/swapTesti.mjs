// Geliştirme aracı: yeni karakterin sıfır başlangıcı + "/swap admin" (yönetici karakteri oluşturma, GM yetkisi, geri dönüş).
// NOT: "admin" adı gerçek kullanıcı hesabında varsa bu test çalışmaz (karakter adı çakışır); genel test için gmTesti.mjs kullanın.
// Kullanım (köprü, oyun sunucusu ve `npm run dev` açıkken): KO_HESAP=.. KO_SIFRE=.. node scripts/swapTesti.mjs <klasör>
// Yalnız TEST hesabıyla çalıştırın: sonunda "admin" ve "KoTestA" karakterlerini veritabanından silmek gerekir (araclar/sunucu/test-karakter-sil.sql örneği).
import { chromium } from 'playwright-core';
const klasor = process.argv[2] ?? '.'; const { KO_HESAP: h, KO_SIFRE: p } = process.env;
if (!h || !p) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
// Edge yeni başsız kipte başlatılmış olmalı: msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<klasör>
const t = await chromium.connectOverCDP(process.env.KO_CDP ?? 'http://127.0.0.1:9333');
const ctx = t.contexts()[0] ?? await t.newContext();
const yeniSayfa = async (viewport) => { const p = await ctx.newPage(); await p.setViewportSize(viewport); return p; };
const hatalar = [];

// 1) Karakteri doğrudan bağlantı akışıyla oluştur (ulus seçimi + karakter) ve sıfır başlangıcı oku
{
  const s = await yeniSayfa({ width: 1280, height: 720 }); s.on('pageerror', (e) => hatalar.push(e.message));
  await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2000);
  const ozet = await s.evaluate(async ([h, p]) => {
    await window.ke.sunucuyaBaglan(h, p, undefined, undefined, async (yuvalar, araclar) => {
      if (!yuvalar.some((y) => y.ad)) {
        const kod = await araclar.olustur({ yuva: 0, ad: 'KoTestA', irk: 12, sinif: 201, yuz: 1, sac: 1, str: 75, sta: 65, dex: 60, int: 50, cha: 50 });
        if (kod !== 0) throw new Error('olusturma kodu ' + kod);
        await araclar.yenile();
      }
      return 'KoTestA';
    });
    await new Promise((r) => setTimeout(r, 2500));
    const o = window.ke.oyuncu;
    return { ad: o.ad, seviye: o.seviye, altin: o.altin, envanterDolu: o.envanter.filter(Boolean).length, ekipmanDolu: o.ekipman.filter(Boolean).length };
  }, [h, p]);
  console.log('1) yeni karakter:', JSON.stringify(ozet));
  await s.close(); await new Promise((r) => setTimeout(r, 6000)); // sunucu kaydedip bağlantıyı bıraksın
}

// 2) Gerçek giriş ekranı → oyun → "/swap admin"
const s = await yeniSayfa({ width: 1366, height: 768 }); s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=1&harita=14th_oldmoradon');
await s.waitForSelector('input[type=password]', { timeout: 120000 }); await s.waitForTimeout(1000);
await s.fill('input[autocomplete=username]', h); await s.fill('input[type=password]', p); await s.keyboard.press('Enter'); await s.waitForTimeout(3500);
await s.mouse.click(297, 740); // Start Game
await s.waitForFunction(() => window.ke?.oyuncu?.ad, null, { timeout: 90000 }); await s.waitForTimeout(3000);
const kim = () => s.evaluate(() => ({ ad: window.ke.oyuncu.ad, seviye: window.ke.oyuncu.seviye, altin: window.ke.oyuncu.altin, envanterDolu: window.ke.oyuncu.envanter.filter(Boolean).length }));
console.log('2) giriş yapıldı:', JSON.stringify(await kim()));
const yaz = async (m) => { await s.evaluate(() => document.querySelector('[data-id=edit0] input').focus()); await s.keyboard.type(m); await s.keyboard.press('Enter'); await s.waitForTimeout(700); };
await yaz('/swap admin');
// sayfa yenilenir: yeni bağlamda ke ve oyuncu.ad = admin beklenir
await s.waitForTimeout(9000);
await s.waitForFunction(() => window.ke?.oyuncu?.ad === 'admin', null, { timeout: 120000 }).catch(() => {});
await s.waitForTimeout(3000);
console.log('3) /swap admin sonrası:', JSON.stringify(await kim().catch((e) => ({ hata: e.message }))));
await s.screenshot({ path: `${klasor}/swap_admin.png` });
await yaz('/swap admin'); await s.waitForTimeout(1500);
console.log('   (admin iken /swap admin) sohbet:', await s.evaluate(() => [...document.querySelectorAll('.ui-gunluk')].map((k) => k.innerText.trim().split('\n').slice(-2).join(' | ')).join(' || ')));
await yaz('/swap KoTestA');
await s.waitForTimeout(9000);
await s.waitForFunction(() => window.ke?.oyuncu?.ad === 'KoTestA', null, { timeout: 120000 }).catch(() => {});
await s.waitForTimeout(3000);
console.log('4) /swap KoTestA sonrası:', JSON.stringify(await kim().catch((e) => ({ hata: e.message }))));
console.log('hatalar', JSON.stringify(hatalar));
await t.close();
