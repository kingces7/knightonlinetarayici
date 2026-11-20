// Geliştirme aracı: bolgeler.json'daki bütün haritaları tarayıcıda açar; yükleme süresi, indirilen veri, bellek, hata ve ekran görüntüsü ölçer.
// Hazırlık: npm run dev açık; Edge yeni başsız kipte:
//   msedge --headless=new --disable-gpu --remote-debugging-port=9333 --user-data-dir=<boş klasör> about:blank
// Kullanım: node scripts/haritaAcmaTesti.mjs <rapor.json> [<ekran-görüntüsü klasörü>] [harita adı ...]   (harita adı verilmezse hepsi)
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const [rapor, klasor, ...secili] = process.argv.slice(2);
if (!rapor) { console.log('Kullanım: node scripts/haritaAcmaTesti.mjs <rapor.json> [klasör] [harita ...]'); process.exit(1); }
if (klasor) fs.mkdirSync(klasor, { recursive: true });
const t = await chromium.connectOverCDP(process.env.KO_CDP ?? 'http://127.0.0.1:9333');

const bolgeler = await (await fetch('http://localhost:5173/harita/bolgeler.json')).json();
const haritalar = [...new Set(Object.values(bolgeler).map((b) => b.ad))].sort().filter((a) => !secili.length || secili.includes(a));
const sonuc = [];
for (const ad of haritalar) for (let deneme = 1; deneme <= 2; deneme++) {
  const c = await t.newContext(); // her harita temiz bağlamda (önbellek yok): gerçek ilk açılış süresi
  const s = await c.newPage(); await s.setViewportSize({ width: 1280, height: 720 });
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push('pageerror: ' + e.message.slice(0, 200)));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text().slice(0, 200)); });
  const istekHatalari = [];
  s.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) istekHatalari.push(`${r.status()} ${r.url().replace('http://localhost:5173', '')}`); });
  const t0 = Date.now();
  let durum = 'tamam', ayrinti = {};
  try {
    await s.goto(`http://localhost:5173/?harita=${ad}&giris=0&saat=12`, { timeout: 120000 });
    await s.waitForFunction(() => window.ke?.oyuncu, null, { timeout: 180000 });
    const ms = Date.now() - t0;
    await s.waitForTimeout(2500);
    ayrinti = await s.evaluate(() => {
      const ke = window.ke, a = ke.arazi;
      const k = ke.oyuncu.konum;
      const kaynaklar = performance.getEntriesByType('resource');
      const bayt = kaynaklar.reduce((x, r) => x + (r.decodedBodySize || 0), 0);
      const nesne = ke.sahne.children.find((c) => c.name === 'nesneler');
      let ucgen = 0; ke.sahne.traverse((o) => { if (o.isMesh && o.geometry) ucgen += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
      return { genislik: a?.genislik ?? null, oyuncu: [Math.round(k.x), Math.round(k.y)], yukseklik: a ? Math.round(a.yukseklikAl(k.x, k.y)) : null, nesneVar: !!nesne, ucgen: Math.round(ucgen), kaynakMB: Math.round(bayt / 1048576 * 10) / 10, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, gl: ke.cizici?.info ? { geometri: ke.cizici.info.memory.geometries, doku: ke.cizici.info.memory.textures } : null };
    });
    ayrinti.yuklemeSn = Math.round(ms / 100) / 10;
    if (klasor) await s.screenshot({ path: `${klasor}/${ad}.png` });
  } catch (e) { durum = 'HATA: ' + String(e.message).split('\n')[0]; }
  if (durum !== 'tamam' && deneme === 1) { console.log(ad.padEnd(26), durum, '(sayfa çöktü mü? bir kez daha denenecek)'); await c.close().catch(() => {}); continue; }
  sonuc.push({ harita: ad, durum, ...ayrinti, hatalar: [...new Set(hatalar)].slice(0, 6), istekHatalari: [...new Set(istekHatalari)].slice(0, 8) });
  console.log(ad.padEnd(26), durum, JSON.stringify(ayrinti), hatalar.length ? `| ${hatalar.length} hata` : '', istekHatalari.length ? `| ${istekHatalari.length} istek hatası` : '');
  await c.close().catch(() => {});
  fs.writeFileSync(rapor, JSON.stringify(sonuc, null, 1));
  break;
}
fs.writeFileSync(rapor, JSON.stringify(sonuc, null, 1));
await t.close();
