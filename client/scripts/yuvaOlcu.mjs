// Geliştirme aracı: envanter yuva kutularının konum/boyutunu ve çerçeve çizimini ölçer, yuvaya yakın bir kırpma kaydeder.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/', klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 3 });
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(2500);
await s.evaluate(async () => {
  const liste = (await (await fetch('/esya/esyalar.json')).json()).map((e) => ({ ...e, simge: `/esya/${e.simge}` }));
  liste.slice(0, 6).forEach((e, i) => { window.ke.oyuncu.envanter[i] = e; });
});
await s.keyboard.press('KeyI'); await s.waitForTimeout(800);
const r = await s.evaluate(() => [...document.querySelectorAll('.ui-t9')].filter((x) => x.offsetTop >= 340 && /^\d+$/.test(x.dataset.id)).slice(0, 3).map((x) => { const b = x.getBoundingClientRect(); return { id: x.dataset.id, x: b.x, y: b.y, w: b.width, h: b.height, bg: x.style.backgroundImage.slice(0, 40) }; }));
console.log(JSON.stringify(r));
await s.screenshot({ path: `${klasor}/yuva.png`, clip: { x: r[1].x - 10, y: r[1].y - 10, width: 160, height: 70 } });

await s.mouse.move(r[1].x + 20, r[1].y + 20); await s.waitForTimeout(400);
await s.screenshot({ path: `${klasor}/ipucu.png`, clip: { x: 900, y: 380, width: 466, height: 380 } });
await t.close();
