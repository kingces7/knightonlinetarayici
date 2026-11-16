// Geliştirme aracı (Aşama 4): oyun sayfasını açar, köprü + Myko sunucusu üzerinden `ke.sunucuyaBaglan()` ile giriş yapar,
// sunucudan gelen karakter verisinin oyuncuya uygulandığını doğrular ve ekran görüntüsü alır.
// Önkoşul: köprü (kopru: npm run baslat) ve Myko sunucusu (kopru/myko-baslat.ps1) çalışıyor, `npm run dev` açık.
// Kullanım:  KO_HESAP=... KO_SIFRE=... node scripts/sunucuTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const once = await s.evaluate(() => ({ seviye: window.ke.oyuncu.seviye, altin: window.ke.oyuncu.altin, konum: [window.ke.oyuncu.konum.x, window.ke.oyuncu.konum.y] }));
let sonuc;
try { sonuc = await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [hesap, sifre]); } catch (e) { sonuc = { HATA: String(e) }; }
await s.waitForTimeout(1500);
const sonra = await s.evaluate(() => {
  const o = window.ke.oyuncu;
  return { seviye: o.seviye, altin: o.altin, deneyim: o.deneyim, azamiDeneyim: o.azamiDeneyimSunucu, can: o.can, enCok: o.enCok, mana: o.mana, stat: o.stat, sinif: o.sinif, konum: [o.konum.x, o.konum.y],
    ekipman: o.ekipman.map((e, i) => e ? `${i}:${e.ad}` : null).filter(Boolean), cantaDolu: o.envanter.filter(Boolean).length, hudAd: document.querySelector('.durum .ad')?.textContent?.trim() };
});
// Canlı dünya: sunucu canavarları belirdi mi, hareket ediyorlar mı?
await s.waitForTimeout(5000);
const konumlar = () => s.evaluate(() => window.ke.canavarlar.filter((c) => c.agModu).map((c) => [c.agKimlik, c.tur.ad, +c.konum.x.toFixed(1), +c.konum.y.toFixed(1)]));
const k1 = await konumlar(); const sayac1 = await s.evaluate(() => window.ke.sunucuDurumu().sayac.hareket); await s.waitForTimeout(10000); const k2 = await konumlar(); const sayac2 = await s.evaluate(() => window.ke.sunucuDurumu().sayac.hareket);
const durum = await s.evaluate(() => window.ke.sunucuDurumu());
const hareketEdenler = k1.filter((a) => { const b = k2.find((x) => x[0] === a[0]); return b && (Math.abs(a[2] - b[2]) > 0.2 || Math.abs(a[3] - b[3]) > 0.2); }).length;
console.log(JSON.stringify({ once, sonuc, sonra, durum, hareketEdenSayisi: hareketEdenler, toplamCanavar: k2.length, hareketPaketleri10sn: sayac2 - sayac1, ornekCanavarlar: undefined, hatalar }, null, 1));
// Görsel kontrol: oyuncuyu canavarların yanına taşı
await s.evaluate(() => { const o = window.ke.oyuncu; o.isinla(433, 224, window.ke.arazi); window.ke.kamera.uzaklik = 14; window.ke.kamera.egim = 0.6; });
await s.waitForTimeout(2500);
await s.screenshot({ path: `${klasor}/sunucu_oyun.png` });
await t.close();
