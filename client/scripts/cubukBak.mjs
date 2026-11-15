// Geliştirme aracı: dikey skill çubuğunu yakından çeker, her düğme/resim düğümünün konumunu yazar.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2000);
const r = await s.evaluate(() => { const v = document.querySelector('[data-id="Hotkey_vertical"]'); const b = v.getBoundingClientRect(); const o = [...v.querySelectorAll('*')].filter((e) => e.offsetParent && (e.dataset.id || e.className.includes('ui-t4') || e.className.includes('ui-t1'))).map((e) => { const q = e.getBoundingClientRect(); return [e.dataset.id ?? e.className.slice(0, 12), Math.round(q.x - b.x), Math.round(q.y - b.y), Math.round(q.width), Math.round(q.height)].join(','); }); return { box: [b.x, b.y, b.width, b.height], o }; });
console.log(JSON.stringify(r.o.filter((x) => !/^[0-9]/.test(x))));
await s.screenshot({ path: `${klasor}/cubuk_yakin.png`, clip: { x: r.box[0] - 6, y: r.box[1] + r.box[3] - 120, width: 90, height: 130 } });
await t.close();
