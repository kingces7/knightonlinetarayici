// Geliştirme aracı (ross): giriş ekranının görüntüsünü alır. Edge CDP 9333.
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1280, height: 720 });
await s.goto('http://localhost:5173/?giris=1'); await s.waitForTimeout(5000);
await s.screenshot({ path: process.argv[2] });
await s.close(); await t.close();
