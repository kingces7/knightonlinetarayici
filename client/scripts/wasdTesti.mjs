// Geliştirme aracı: W karakterin baktığı yöne mi gidiyor? A/D karakteri döndürüyor mu (kamera ile birlikte)?
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const durum = () => s.evaluate(() => { const o = window.ke.oyuncu; return { x: o.konum.x, y: o.konum.y, h: o.bakisAcisi, kam: window.ke.kamera.aci }; });
const sonuc = [];
async function dene(ad, tuslar, ms) {
  const a = await durum();
  for (const k of tuslar) await s.keyboard.down(k);
  await s.waitForTimeout(ms);
  for (const k of tuslar) await s.keyboard.up(k);
  await s.waitForTimeout(150);
  const b = await durum();
  const hareket = Math.atan2(b.y - a.y, b.x - a.x), uzak = Math.hypot(b.x - a.x, b.y - a.y);
  let fark = hareket - a.h; fark = Math.atan2(Math.sin(fark), Math.cos(fark));
  sonuc.push({ ad, yolMetre: +uzak.toFixed(2), hareketMinusBakis_derece: +(fark * 180 / Math.PI).toFixed(0), donusDerece: +(((b.h - a.h + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * 180 / Math.PI).toFixed(0), kameraDegisim: +(b.kam - a.kam).toFixed(2) });
}
await dene('W', ['KeyW'], 1000);
await dene('A (yerinde dön)', ['KeyA'], 800);
await dene('W (dönüşten sonra)', ['KeyW'], 1000);
await dene('W+D', ['KeyW', 'KeyD'], 1000);
await dene('W (D sonrası)', ['KeyW'], 800);
await dene('S', ['KeyS'], 800);
console.log(JSON.stringify({ sonuc, hatalar }, null, 1));
await t.close();
