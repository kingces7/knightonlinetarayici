// Geliştirme aracı: 10 maddelik düzenlemenin görsel kontrolü (çubuk, sohbet, bilgi, kutu).
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.evaluate(() => localStorage.clear()); await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(async () => {
  const { GanimetKutusu } = await import('/src/oyun/varliklar.ts');
  const o = window.ke.oyuncu; const esyalar = (await (await fetch('/esya/esyalar.json')).json()).slice(0, 2).map((e) => ({ ...e, simge: `/esya/${e.simge}` }));
  const k = new GanimetKutusu(o.konum.x + 2, o.konum.y + 1, 350, esyalar); window.ke.sahne.add(k.grup); window.ke.kutular.push(k); window.ke.hud.ganimetAc(k);
  window.ke.sohbetYaz = (m, r) => window.ke.arayuz().sohbetYaz(m, r);
  window.ke.arayuz().sohbetYaz('__buTCher__ has obtained Monster Stone Grade 1 from Monster Fighter (1007, 1016) in Ronark Land.', '#ffffff');
  window.ke.arayuz().sohbetYaz('### Monster Fighter killed by __buTCher__ in Ronark Land! ###', '#e8e84a');
});
await s.waitForTimeout(800);
await s.screenshot({ path: `${klasor}/t10a.png` });
await s.keyboard.press('F3'); await s.waitForTimeout(300);
const sayfa = await s.evaluate(() => window.ke.arayuz().cubukSayfa);
console.log(JSON.stringify({ sayfaF3: sayfa, hatalar }));
await t.close();
