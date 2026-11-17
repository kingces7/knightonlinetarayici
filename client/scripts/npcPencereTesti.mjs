// Geliştirme aracı: NPC pencerelerini (mağaza, banka) açar, ekran görüntüsü alır ve düğmelerini listeler. Kullanım: node scripts/npcPencereTesti.mjs <klasör>
import { chromium } from 'playwright-core';
const [klasor = 'E:/tmp'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const n = await s.evaluate(() => { const l = window.ke.npcler; const m = l.find((x) => x.tanim.satis > 0); return m ? m.tanim.satis : null; });
console.log('satış grubu', n);
await s.evaluate(() => window.ke.arayuz().depoAc()); await s.waitForTimeout(1200); await s.screenshot({ path: `${klasor}/depo.png` });
console.log('depo düğmeleri', await s.evaluate(() => [...document.querySelectorAll('[data-id]')].filter((e) => e.offsetParent && /close|cancel|exit|btn_x|x$/i.test(e.dataset.id)).map((e) => e.dataset.id + '@' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().top))));

const gorunur = (ad) => s.evaluate((ad) => { const e = document.querySelector('[data-id="' + ad + '"]'); return !!e && !!e.offsetParent; }, ad);
await s.mouse.click(345, 50); await s.waitForTimeout(500); console.log('depo X sonrası açık mı', await gorunur('btn_close'));
await s.evaluate((g) => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis === g)), n); await s.waitForTimeout(1200);
await s.screenshot({ path: klasor + '/magaza.png' });
console.log('mağaza düğmeleri', await s.evaluate(() => [...document.querySelectorAll('[data-id]')].filter((e) => e.offsetParent && /close|cancel|exit|btn_x|ok/i.test(e.dataset.id)).map((e) => e.dataset.id + '@' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().top))));
await s.mouse.click(351, 52); await s.waitForTimeout(500); console.log('mağaza X sonrası açık mı', await gorunur('btn_cancel'));
await t.close();
