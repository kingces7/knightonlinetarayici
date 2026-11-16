// Geliştirme aracı (envanterTesti.mjs'ten ayrı): (1) envanterde sağ tık ile giy/çıkar, (2) sol tuşla sürükle-bırak, (3) sol+sağ tuşla dönüşte karakter kamerayla birlikte döner.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const sonuc = {};

// ---------- envanter ----------
await s.keyboard.press('KeyI'); await s.waitForTimeout(800);
const durum = () => s.evaluate(() => ({ silah: window.ke.oyuncu.ekipman[6]?.ad ?? null, canta: window.ke.oyuncu.envanter.map((e, i) => e ? `${i}:${e.ad}` : null).filter(Boolean) }));
sonuc.basta = await durum();
// yuvaları işaretle: data-t = e6 (ekipman 6), c0..c27 (çanta)
await s.evaluate(() => {
  const p = [...document.querySelectorAll('[data-id]')];
  const ekip = p.filter((a) => a.offsetTop < 320 && a.offsetLeft >= 360);
  for (const a of ekip) a.setAttribute('data-t', 'e' + a.dataset.id);
  const canta = p.filter((a) => a.offsetTop >= 340 && /^\d+$/.test(a.dataset.id)).sort((a, b) => Number(a.dataset.id) - Number(b.dataset.id));
  canta.forEach((a, i) => a.setAttribute('data-t', 'c' + i));
});
// 1) sağ tık: ekipmandaki silahı çıkar
await s.locator('[data-t="e6"]').click({ button: 'right' }); await s.waitForTimeout(500);
sonuc.sagTikCikarma = await durum();
// 2) sürükle: çantadaki silahı boş bir yuvaya (c20) taşı
const kaynakIdx = Number(sonuc.sagTikCikarma.canta[0]?.split(':')[0]);
await s.locator(`[data-t="c${kaynakIdx}"]`).dragTo(s.locator('[data-t="c20"]')); await s.waitForTimeout(500);
sonuc.surukleme = await durum();
// 3) sürükle: çantadan ekipman yuvasına (c20 → e6)
await s.locator('[data-t="c20"]').dragTo(s.locator('[data-t="e6"]')); await s.waitForTimeout(500);
sonuc.ekipmanaSurukleme = await durum();
// 4) sağ tık ile çıkar, sonra sağ tık ile tekrar giy
await s.locator('[data-t="e6"]').click({ button: 'right' }); await s.waitForTimeout(400);
const idx2 = Number((await durum()).canta[0]?.split(':')[0]);
await s.locator(`[data-t="c${idx2}"]`).click({ button: 'right' }); await s.waitForTimeout(400);
sonuc.sagTikGiyme = await durum();
await s.screenshot({ path: `${klasor}/envanter.png` });
await s.keyboard.press('KeyI'); await s.waitForTimeout(400);

// ---------- sol + sağ tuş: dönüş ----------
await s.evaluate(() => { window.ke.oyuncu.isinla(264, 302, window.ke.arazi); });
await s.waitForTimeout(800);
const aci = () => s.evaluate(() => { const o = window.ke.oyuncu, k = window.ke.kamera, f = k.ileriYon(); const h = o.bakisAcisi; const kam = Math.atan2(f.y, f.x); let d = Math.atan2(Math.sin(h - kam), Math.cos(h - kam)); return { fark: Math.abs(d), x: o.konum.x, y: o.konum.y }; });
await s.mouse.move(640, 500); await s.mouse.down({ button: 'left' }); await s.mouse.down({ button: 'right' });
await s.waitForTimeout(300);
let enBuyuk = 0; const ornek = [];
for (let i = 0; i < 40; i++) { await s.mouse.move(640 + (i + 1) * 9, 500, { steps: 1 }); await s.waitForTimeout(25); const a = await aci(); enBuyuk = Math.max(enBuyuk, a.fark); if (i % 10 === 9) ornek.push(+(a.fark * 180 / Math.PI).toFixed(1)); }
const sonA = await aci();
await s.mouse.up({ button: 'right' }); await s.mouse.up({ button: 'left' });
sonuc.donus = { enBuyukFarkDerece: +(enBuyuk * 180 / Math.PI).toFixed(1), her10AdimdaFarkDerece: ornek, sonKonum: [+sonA.x.toFixed(1), +sonA.y.toFixed(1)] };
console.log(JSON.stringify({ sonuc, hatalar }, null, 1));
await t.close();
