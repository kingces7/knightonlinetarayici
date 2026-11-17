import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.oyuncu?.model, null, { timeout: 120000 }); await s.waitForTimeout(3000);
for (let i = 0; i < 3; i++) { await s.keyboard.press('KeyH'); await s.waitForTimeout(600);
  console.log(i, await s.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.style.borderColor === 'rgb(49, 224, 90)' || d.style.borderColor === '#31e05a').map((d) => d.textContent)));
  if (i === 1) { await s.evaluate(() => [...document.querySelectorAll('div')].find((d) => d.textContent === 'Exit' && d.style.cursor === 'pointer')?.click()); await s.waitForTimeout(200); console.log('tık sonrası', await s.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.style.borderColor === 'rgb(49, 224, 90)').map((d) => d.textContent))); }
  await s.keyboard.press('KeyH'); await s.waitForTimeout(400); }
await t.close();
