// Geliştirme aracı: arazi dokusunu yakından incele (nesneler gizli, sabit kamera). Kullanım: node scripts/arazDokuBak.mjs elmo2004 1500 520 <ad>
import { chromium } from 'playwright-core';
const [harita, x, z, ad] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
await s.goto(`http://localhost:5173/?harita=${harita}&giris=0&saat=12`); await s.waitForFunction(() => window.ke?.oyuncu, null, { timeout: 240000 }); await s.waitForTimeout(3000);
await s.evaluate(([x, z]) => { window.ke.oyuncu.isinla(Number(x), Number(z), window.ke.arazi); window.ke.sahne.children.filter((c) => c.name === 'nesneler' || c.name === 'su').forEach((c) => { c.visible = false; }); }, [x, z]);
await s.waitForTimeout(2500); await s.screenshot({ path: `E:/tmp/ss/doku_${ad}.png` });
await t.close();
