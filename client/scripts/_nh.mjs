import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge' });
const s = await t.newPage({ viewport: { width: 1024, height: 1024 } });
await s.goto('http://localhost:5173/_nehir.html'); await s.waitForFunction(() => document.title === 'tamam', null, { timeout: 20000 });
await s.screenshot({ path: process.argv[2] + '/nehir.png' });
await t.close();
