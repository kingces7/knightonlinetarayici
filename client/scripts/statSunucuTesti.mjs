// Geliştirme aracı: sunucu modunda stat puanı harcama + otur/kalk testi (yalnız kotest).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
const d = () => s.evaluate(() => ({ puan: window.ke.oyuncu.bonusPuan, stat: window.ke.oyuncu.stat, can: window.ke.oyuncu.enCok, mana: window.ke.oyuncu.enCokMana, oturuyor: window.ke.arayuz().b.durum().oturuyor }));
console.log('önce', JSON.stringify(await d()));
await s.evaluate(() => { window.ke.arayuz().b.statSunucu('str'); window.ke.arayuz().b.statSunucu('int'); }); await s.waitForTimeout(1200);
console.log('stat sonrası', JSON.stringify(await d()));
await s.evaluate(() => window.ke.arayuz().b.otur()); await s.waitForTimeout(800); console.log('otur', JSON.stringify((await d()).oturuyor));
await s.evaluate(() => window.ke.arayuz().b.otur()); await s.waitForTimeout(800); console.log('kalk', JSON.stringify((await d()).oturuyor));
console.log('hatalar', JSON.stringify(hatalar)); await t.close();
