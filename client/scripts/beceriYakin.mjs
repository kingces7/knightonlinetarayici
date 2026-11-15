import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.keyboard.press('KeyK'); await s.waitForTimeout(900);
await s.screenshot({ path: process.argv[2] + '/beceriyakin.png', clip: { x: 960, y: 150, width: 380, height: 170 } });
await t.close();
