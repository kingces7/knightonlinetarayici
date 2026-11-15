// Geliştirme aracı: ölüm kuralları (deneyim kaybı, seviye düşmesi, yeniden doğma, göz kırpma).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const r = await s.evaluate(async () => {
  const { gerekenDeneyim } = await import('/src/oyun/veri.ts');
  const o = window.ke.oyuncu; const sonuc = {};
  o.seviye = 10; o.deneyim = 1000; const tavan = gerekenDeneyim(10);
  window.ke.deneyimKaybet(Math.floor(tavan / 20)); sonuc.normal = { tavan, kayip: Math.floor(tavan / 20), deneyim: o.deneyim };
  o.seviye = 10; o.deneyim = 5; window.ke.deneyimKaybet(Math.floor(tavan / 20));
  const t9 = gerekenDeneyim(9); sonuc.seviyeDusme = { seviye: o.seviye, deneyim: o.deneyim, beklenen: t9 - 5 - Math.floor(t9 / 20) };
  o.seviye = 5; o.deneyim = 3; window.ke.deneyimKaybet(100); sonuc.alti = { seviye: o.seviye, deneyim: o.deneyim };
  o.can = 0; window.ke.hud.yenidenDog(); sonuc.dogus = { can: o.can, enCok: o.enCok, blinkli: o.blinkli, x: o.konum.x, y: o.konum.y };
  return sonuc;
});
console.log(JSON.stringify({ r, hatalar }, null, 1));
await t.close();
