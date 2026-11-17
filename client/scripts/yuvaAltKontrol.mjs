// Geliştirme aracı: banka ve mağaza yuvalarının ALT kenarında fare olayının yuvaya ulaşıp ulaşmadığını kontrol eder.
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const kontrol = (listeKodu) => s.evaluate((kod) => { const l = eval(kod); let ok = 0, kotu = 0; for (const el of l) { const r = el.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.bottom - 3); if (x === el) ok++; else kotu++; } return { ulasan: ok, baskasi: kotu }; }, listeKodu);
await s.evaluate(() => window.ke.arayuz().depoAc()); await s.waitForTimeout(1500);
console.log('banka yuvaları (alt kenar)', await kontrol('[...window.ke.arayuz().depoUst(), ...window.ke.arayuz().depoAlt()]'));
await s.evaluate(() => { window.ke.arayuz().ac('depo', false); window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis > 0)); }); await s.waitForTimeout(1800);
console.log('mağaza yuvaları (alt kenar)', await kontrol('[...window.ke.arayuz().magazaYeni.magaza.filter(Boolean), ...window.ke.arayuz().magazaYeni.canta.filter(Boolean)]'));
await t.close();
