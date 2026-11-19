// Geliştirme aracı (ross): sunucu seçimi → karakter seçimi (yürüyen 3B karakter) → Start akışını sahte sunucuyla dener; ayrıca boş hesapta ulus seçimi. Edge CDP 9333.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const r = {};
await s.evaluate(async () => {
  window.ke.arayuz().genel.hepsiniKapat();
  const { GirisEkrani } = await import('/src/arayuz/girisEkrani.ts');
  const araclar = { ulus: 1, olustur: async () => 0, yenile: async () => [{ ad: 'kingces', seviye: 1, sinif: 101, irk: 1, yuz: 1, sac: 1 }] };
  window.__sonuc = null;
  const g = new GirisEkrani({ kok: document.body, baglan: async (_h, _s, sec) => { window.__sonuc = await sec([{ ad: 'kingces', seviye: 1, sinif: 101 }, { ad: '', seviye: 0, sinif: 0 }], araclar); }, cevrimdisi: () => undefined });
  window.__g = g; await g.ac(); g.idKutusu.value = 'x'; g.sifreKutusu.value = 'y'; g.girisYap();
});
await s.waitForTimeout(1200); await s.screenshot({ path: `${klasor}/ga_sunucu.png` });
await s.keyboard.press('Enter'); await s.waitForTimeout(3500); await s.screenshot({ path: `${klasor}/ga_secim.png` });
await s.keyboard.press('Enter'); await s.waitForTimeout(900); await s.screenshot({ path: `${klasor}/ga_yuru.png` });
r.ara = await s.evaluate(() => ({ sure: window.__g.onizleme?.yuruSure, gecen: window.__g.onizleme?.yuruGecen, tus: !!window.__g.secimTusu, aktif: document.activeElement?.tagName })); await s.waitForTimeout(2500); r.sonuc = await s.evaluate(() => window.__sonuc);
// boş hesap: ulus seçimi
await s.evaluate(async () => { const { KarakterOlustur } = await import('/src/arayuz/karakterOlustur.ts'); window.__o = new KarakterOlustur({ kok: document.body, araclar: { ulus: 0, olustur: async () => 0, yenile: async () => [] }, baslangic: {}, yuva: 0 }); window.__oc = window.__o.ac(); });
await s.waitForTimeout(1500); await s.screenshot({ path: `${klasor}/ga_ulus.png` });
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
