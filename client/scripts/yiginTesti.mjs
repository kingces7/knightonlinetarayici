// Geliştirme aracı: yığınlanan eşya (ok/iksir) aynı yuvada toplanır, adet görünür.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
const r = await s.evaluate(async () => {
  const g = await (await fetch('/oyun/ganimet.json')).json();
  const sayilabilir = Object.values(g.esyalar).filter((e) => e.sayilabilir);
  const e = { ...sayilabilir[0], simge: `/esya/${sayilabilir[0].simge}` };
  const o = window.ke.oyuncu;
  o.esyaEkle({ ...e }); o.esyaEkle({ ...e, adet: 20 }); o.esyaEkle({ ...e });
  const dolu = o.envanter.filter(Boolean).filter((x) => x.no === e.no);
  return { ad: e.ad, sayilabilirAdet: sayilabilir.length, yuva: dolu.length, adet: dolu[0]?.adet };
});
await s.keyboard.press('KeyI'); await s.waitForTimeout(800);
await s.screenshot({ path: `${klasor}/yigin.png`, clip: { x: 1000, y: 400, width: 330, height: 120 } });
console.log(JSON.stringify({ r, hatalar }));
await t.close();
