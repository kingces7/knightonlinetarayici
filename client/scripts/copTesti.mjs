// Geliştirme aracı: çöp kutusu (yerel mod): bırak → onay penceresi → Yes → eşya silinir; imleç gizleme sınıfı.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1400, height: 900 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.evaluate(() => { const o = window.ke.oyuncu; if (!o.envanter.some(Boolean)) { o.envanter[0] = o.ekipman.find(Boolean) ?? null; } });
await s.keyboard.press('KeyI'); await s.waitForTimeout(1500);
const once = await s.evaluate(() => window.ke.oyuncu.envanter.filter(Boolean).length);
await s.evaluate(() => {
  const i = window.ke.oyuncu.envanter.findIndex(Boolean); const dt = new DataTransfer(); dt.setData('application/x-ke-esya', JSON.stringify({ tur: 'c', i }));
  const cop = document.querySelector('.cop-kutusu'); cop.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })); cop.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
});
await s.waitForTimeout(500);
const dlg = await s.evaluate(() => { const p = window.ke.arayuz().pencereler.envanter; return { gorunur: [...p.bul('string_Destroy')].some((e) => e.offsetParent !== null), metin: p.bul('string_Destroy')[0]?.textContent }; });
console.log('onay penceresi', JSON.stringify(dlg));
const r = await s.evaluate(() => { const p = window.ke.arayuz().pencereler.envanter; const b = p.el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
await s.screenshot({ path: process.argv[2] + '/cop.png', clip: { x: r[0], y: r[1] + r[3] * 0.3, width: r[2], height: r[3] * 0.7 } });
await s.evaluate(() => window.ke.arayuz().pencereler.envanter.bul('btn_Destroy_ok')[0].click()); await s.waitForTimeout(500);
console.log('eşya sayısı', once, '→', await s.evaluate(() => window.ke.oyuncu.envanter.filter(Boolean).length));
await s.mouse.move(600, 400); await s.mouse.down({ button: 'right' }); await s.waitForTimeout(200);
console.log('sağ tık: imleç gizli', await s.evaluate(() => document.body.classList.contains('kamera-donuyor')));
await s.mouse.up({ button: 'right' }); await s.waitForTimeout(200);
console.log('bırakınca gizli mi', await s.evaluate(() => document.body.classList.contains('kamera-donuyor')), 'hatalar', JSON.stringify(hatalar));
await t.close();
