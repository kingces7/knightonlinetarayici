// Geliştirme aracı: skill çubuğunun çevirme düğmesini dener (dikey ↔ yatay) ve sayfa hatalarını sayar.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2000);
const gorunen = () => s.evaluate(() => ['Hotkey_vertical', 'Hotkey_Horizontal'].map((id) => [...document.querySelectorAll(`[data-id="${id}"]`)].some((e) => e.offsetParent !== null)));
const once = await gorunen();
const tikla = async () => { const p = await s.evaluate(() => { const e = [...document.querySelectorAll('[data-id="btn_change"]')].find((x) => x.offsetParent !== null); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); await s.mouse.click(p[0], p[1]); await s.waitForTimeout(400); };
await tikla(); const sonra = await gorunen(); await s.screenshot({ path: `${klasor}/cubuk_yatay.png` });
await tikla(); const geri = await gorunen();
console.log(JSON.stringify({ once, sonra, geri, hatalar }));
await t.close();
