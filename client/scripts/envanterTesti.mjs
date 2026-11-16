// Geliştirme aracı: envantere eşya koyar, I ile açar, ilk eşyaya sağ tıklayıp kuşanmayı dener.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/?harita=14th_oldmoradon', klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(2500);
await s.evaluate(async () => {
  const o = window.ke.oyuncu;
  const liste = (await (await fetch('/esya/esyalar.json')).json()).map((e) => ({ ...e, simge: `/esya/${e.simge}` }));
  const silahlar = liste.filter((e) => e.tur === 'silah').slice(0, 3), zirhlar = liste.filter((e) => e.tur === 'zirh').slice(0, 3);
  [...silahlar, ...zirhlar].forEach((e, i) => { o.envanter[i] = e; });
  o.altin = 12345;
});
await s.keyboard.press('KeyI'); await s.waitForTimeout(700);
await s.screenshot({ path: `${klasor}/e1.png` });
// ilk çanta yuvasına SAĞ tıkla (kuşan; sol tuş artık sürükleme için)
const once = await s.evaluate(() => ({ silah: window.ke.oyuncu.silah?.ad ?? null, ilk: window.ke.oyuncu.envanter[0]?.ad }));
const yuva = await s.evaluate(() => { const a = [...document.querySelectorAll('.ui-t9')].filter((x) => x.offsetTop >= 340 && /^\d+$/.test(x.dataset.id)).sort((p, q) => p.dataset.id - q.dataset.id)[0]; const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await s.mouse.click(yuva[0], yuva[1], { button: 'right' }); await s.waitForTimeout(700);
const sonra = await s.evaluate(() => ({ silah: window.ke.oyuncu.silah?.ad ?? null, ata: [...document.querySelectorAll('.ui-t9')].filter((x) => x.style.backgroundImage).length }));
await s.screenshot({ path: `${klasor}/e2.png` });
console.log(JSON.stringify({ once, sonra, hatalar }));
await t.close();
