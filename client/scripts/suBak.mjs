// Geliştirme aracı: yerel modda verilen konuma gidip ekran görüntüsü alır. Kullanım: node scripts/suBak.mjs <dosya> <x> <z>
import { chromium } from 'playwright-core';
const [dosya, x, z] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1600, height: 800 } });
await s.goto('http://localhost:5173/?giris=0&saat=12'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(([x, z]) => { window.ke.oyuncu.isinla(+x, +z, window.ke.arazi); for (const c of window.ke.canavarlar) c.grup.visible = false; }, [x, z]);
await s.waitForTimeout(2500);
await s.screenshot({ path: dosya }); await t.close();
