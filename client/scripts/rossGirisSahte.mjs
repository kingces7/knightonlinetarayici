// Geliştirme aracı (ross): sahte sunucu bağlamıyla karakter seçme ve oluşturma ekranlarını açıp görüntü alır. Edge CDP 9333.
// Kullanım: node scripts/rossGirisSahte.mjs <klasor> [ulus 1|2] [genislik] [yukseklik]
import { chromium } from 'playwright-core';
const [klasor = '.', ulus = '1', w = '1600', h = '900'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message)); s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(async (ulus) => {
  window.ke.arayuz().genel.hepsiniKapat();
  const { GirisEkrani } = await import('/src/arayuz/girisEkrani.ts');
  const araclar = { ulus: Number(ulus), olustur: async () => 0, yenile: async () => [{ ad: 'kingces', seviye: 1, sinif: Number(ulus) === 1 ? 101 : 201, irk: Number(ulus) === 1 ? 1 : 12, yuz: 1, sac: 1 }, { ad: 'Second', seviye: 20, sinif: 102, irk: 1, yuz: 1, sac: 1 }] };
  const g = new GirisEkrani({ kok: document.body, baglan: async (_h, _s, sec) => { await sec([{ ad: 'kingces', seviye: 1, sinif: Number(ulus) === 1 ? 101 : 201 }, { ad: 'Second', seviye: 20, sinif: 102 }, { ad: '', seviye: 0, sinif: 0 }, { ad: '', seviye: 0, sinif: 0 }], araclar); }, cevrimdisi: () => undefined });
  window.__g = g; await g.ac();
  g.idKutusu.value = 'x'; g.sifreKutusu.value = 'y'; g.girisYap();
}, ulus);
await s.waitForTimeout(2500); await s.screenshot({ path: `${klasor}/gs_secim.png` });
await s.evaluate(() => { const g = window.__g; g.secim.tikla.get('btn_create')(); });
await s.waitForTimeout(3000); await s.screenshot({ path: `${klasor}/gs_olustur.png` });
console.log(JSON.stringify({ hatalar }));
await s.close(); await t.close();
