// Geliştirme aracı: orijinal tuş tablosunu dener (M, H, F10, E, R, Home/End, PageUp/PageDown, Shift+M).
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:5173/?harita=14th_oldmoradon';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url);
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 });
await s.waitForTimeout(2500);
const acik = (ad) => s.evaluate((a) => window.ke.arayuz().genel.acik(a), ad);
const sonuc = {};
for (const [tus, pencere] of [['KeyM', 're_minimap'], ['KeyH', 're_el_cmdlist'], ['F10', 're_seed_helper']]) {
  await s.keyboard.press(tus); await s.waitForTimeout(600); const a = await acik(pencere);
  await s.keyboard.press(tus); await s.waitForTimeout(600); const b = await acik(pencere);
  sonuc[tus] = a && !b ? 'tamam' : `HATA aç=${a} kapat=${b}`;
}
// E otomatik ilerleme
const konum = () => s.evaluate(() => { const p = window.ke.oyuncu.konum; return [p.x, p.y]; });
const k0 = await konum(); await s.keyboard.press('KeyE'); await s.waitForTimeout(1000); const k1 = await konum();
await s.keyboard.press('KeyS'); await s.waitForTimeout(300);
const k2 = await konum(); await s.waitForTimeout(500); const k3 = await konum();
sonuc.E = `E ile ${Math.hypot(k1[0] - k0[0], k1[1] - k0[1]).toFixed(2)} m ilerledi; S ile durdu: ${Math.hypot(k3[0] - k2[0], k3[1] - k2[1]) < 0.3 ? 'evet' : 'hayır'}`;
// Home/End kamera eğimi
const egim = () => s.evaluate(() => Math.round(window.ke.kamera.egim * 180 / Math.PI * 10) / 10);
const e0 = await egim(); await s.keyboard.down('Home'); await s.waitForTimeout(400); await s.keyboard.up('Home'); const e1 = await egim();
await s.keyboard.down('End'); await s.waitForTimeout(800); await s.keyboard.up('End'); const e2 = await egim();
sonuc.HomeEnd = `eğim ${e0}° → Home ${e1}° → End ${e2}°`;
// PageUp/PageDown skill sayfası
await s.keyboard.press('PageDown'); await s.keyboard.press('PageDown'); await s.keyboard.press('PageUp');
// Shift+M ses
await s.keyboard.press('Shift+KeyM'); await s.waitForTimeout(300);
const sessiz = await s.evaluate(() => window.ke.ses.sessiz ?? null);
sonuc.ShiftM = `ses.sessiz=${sessiz}; mini harita karışmadı: ${!(await acik('re_minimap')) ? 'evet' : 'hayır'}`;
console.log(JSON.stringify(sonuc, null, 1), 'hatalar', hatalar);
await t.close();
