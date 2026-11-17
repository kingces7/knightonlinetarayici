// Geliştirme aracı: sohbet testi (kotest tarayıcıda; kotest1 kopru betiğiyle). Yalnız test hesapları.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
const yaz = async (m) => { await s.evaluate((m) => { const g = document.querySelector('[data-id=edit0] input'); g.focus(); }, m); await s.keyboard.type(m); await s.keyboard.press('Enter'); await s.waitForTimeout(700); };
await yaz('hi everyone');
await s.waitForTimeout(12000);
await yaz('/KoTest private from browser');
await s.waitForTimeout(8000);
console.log(await s.evaluate(() => [...document.querySelectorAll('[data-id=text0] span, [data-id=text0] div')].map((e) => e.textContent).filter((x, i, a) => x && a.indexOf(x) === i && /\[/.test(x)).join('\n')));
await s.screenshot({ path: process.argv[2] + '/sohbet.png' });
await t.close();
