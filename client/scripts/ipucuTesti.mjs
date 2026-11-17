// Geliştirme aracı: eşya bilgisi (tooltip) görünümünü verilen eşyalar için çizer. Kullanım: node scripts/ipucuTesti.mjs <klasör> <eşya no,...>
import { chromium } from 'playwright-core';
const [klasor, liste] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 520 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.hud, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const tum = await (await fetch('http://localhost:5173/esya/tum.json')).json();
const nolar = liste.split(',').map(Number);
await s.evaluate(([tum, nolar]) => {
  nolar.forEach((n, i) => { const e = tum.find((x) => x.no === n); window.__ip ??= []; const kutu = document.createElement('div'); kutu.id = 'ipk' + i; kutu.style.cssText = `position:fixed;left:${20 + i * 270}px;top:20px;width:1px;height:1px`; document.body.appendChild(kutu); });
}, [tum, nolar]);
for (let i = 0; i < nolar.length; i++) {
  const e = tum.find((x) => x.no === nolar[i]);
  await s.evaluate(([e, i]) => { window.ke.hud.ipucuGoster({ ...e, sunucuNo: e.no }, { clientX: 10 + i * 270, clientY: 10 }); const el = document.querySelector('.ipucu'); const c = el.cloneNode(true); c.style.left = (10 + i * 270) + 'px'; c.style.top = '10px'; c.classList.remove('gizli'); c.classList.add('kopya'); document.body.appendChild(c); }, [e, i]);
}
await s.evaluate(() => document.querySelector('.ipucu:not(.kopya)')?.classList.add('gizli'));
await s.screenshot({ path: `${klasor}/ipucu.png` });
await t.close();
