// Geliştirme aracı: arazi dokusunu (yol/karo yönü) farklı çizim kipleriyle aynı noktadan fotoğraflar.
// Edge yeni başsız kipte açık olmalı: msedge --headless=new --disable-gpu --remote-debugging-port=9333 --user-data-dir=<boş klasör> about:blank
// Kullanım (npm run dev açıkken): node scripts/arazKarsilastir.mjs <harita> <x> <z> <klasör> [dokuv=3,0 ...]
//   dokuv: 3 = orijinal yön tablosu + ADD (varsayılan), 2 = eski yön tablosu + ADD, 0 = eski sezgisel çizim
import { chromium } from 'playwright-core';
const [harita, x, z, klasor = '.', ...kipler] = process.argv.slice(2);
const t = await chromium.connectOverCDP(process.env.KO_CDP ?? 'http://127.0.0.1:9333');
const ctx = t.contexts()[0] ?? await t.newContext();
for (const dokuv of kipler.length ? kipler : ['3']) {
  const s = await ctx.newPage(); await s.setViewportSize({ width: 1280, height: 720 });
  const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message)); s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text().slice(0, 200)); });
  await s.goto(`http://localhost:5173/?harita=${harita}&giris=0&saat=12&dokuv=${dokuv}`);
  await s.waitForFunction(() => window.ke?.oyuncu, null, { timeout: 240000 }); await s.waitForTimeout(3000);
  await s.evaluate(([x, z]) => { window.ke.oyuncu.isinla(Number(x), Number(z), window.ke.arazi); window.ke.sahne.children.filter((c) => c.name === 'nesneler' || c.name === 'su').forEach((c) => { c.visible = false; }); }, [x, z]);
  await s.waitForTimeout(2500);
  const dosya = `${klasor}/arazi_${harita}_dokuv${dokuv}_${x}_${z}.png`;
  await s.screenshot({ path: dosya }); console.log(dosya, hatalar.length ? 'HATA: ' + hatalar.join(' | ') : 'hata yok');
  await s.close();
}
await t.close();
