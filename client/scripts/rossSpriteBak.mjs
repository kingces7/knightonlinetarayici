// Geliştirme aracı (ross): bir arayüz dokusundan parçayı büyüterek kaydeder. node scripts/rossSpriteBak.mjs <doku> <x> <y> <w> <h> <cikti.png> [kat]
import { chromium } from 'playwright-core';
const [doku, x, y, w, h, cikti, kat = '8'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.goto('http://localhost:5173/arayuz.html').catch(() => {});
await s.setContent(`<body style="margin:0;background:#445"><div style="width:${w * kat}px;height:${h * kat}px;background:url(http://localhost:5173/arayuz/doku/${doku}.png) -${x * kat}px -${y * kat}px/${512 * kat}px ${512 * kat}px;image-rendering:pixelated"></div></body>`);
await s.waitForTimeout(800);
await s.screenshot({ path: cikti, clip: { x: 0, y: 0, width: w * kat, height: h * kat } });
await s.close(); await t.close();
