// Geliştirme aracı: sunucu modunda novice skill penceresi (yalnız kotest). Sekmeleri, puanları, + düğmesini ve ekran görüntüsünü kontrol eder. Kullanım: KO_HESAP=… KO_SIFRE=… node scripts/novisSkillTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]); await s.waitForTimeout(1500);
console.log('sınıf/seviye/skill puanları', await s.evaluate(() => [window.ke.oyuncu.sinif, window.ke.oyuncu.seviye, window.ke.oyuncu.skillPuanlari.join(',')]));
await s.keyboard.press('KeyK'); await s.waitForTimeout(800);
const durum = () => s.evaluate(() => { const a = window.ke.arayuz(); return { sekme: a.beceriSekme, sayfa: a.beceriSayfa, liste: a.beceriler.map((b) => `${b.ad}(${b.seviye})`), serbest: window.ke.oyuncu.skillPuanlari.join(',') }; });
console.log('temel', JSON.stringify(await durum())); await s.screenshot({ path: 'E:/tmp/skill_temel.png' });
for (const [ad, n] of [['btn_blade0', 1], ['btn_blade1', 2], ['btn_blade2', 3]]) { await s.evaluate((ad) => window.ke.arayuz().pencereler.beceri.tikla.get(ad)?.(), ad); await s.waitForTimeout(300); console.log('sekme', n, JSON.stringify(await durum())); if (n === 1) await s.screenshot({ path: 'E:/tmp/skill_agac1.png' }); }
await s.evaluate(() => window.ke.arayuz().pencereler.beceri.tikla.get('btn_blade0')?.()); await s.waitForTimeout(200);
if (process.env.PUAN) { await s.evaluate(() => window.ke.arayuz().pencereler.beceri.tikla.get('btn_4')?.()); await s.waitForTimeout(1500); console.log('+1 puan 1. ağaca', JSON.stringify(await durum())); await s.screenshot({ path: 'E:/tmp/skill_puan.png' }); }
console.log('hatalar', JSON.stringify(hatalar)); await t.close();
