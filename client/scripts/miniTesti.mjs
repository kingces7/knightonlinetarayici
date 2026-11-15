import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(() => window.ke.arayuz().genel.ac('re_minimap')); await s.waitForTimeout(800);
await s.screenshot({ path: process.argv[2] + '/mini.png', clip: { x: 380, y: 200, width: 420, height: 330 } });
console.log(JSON.stringify({ hatalar }));
await t.close();
