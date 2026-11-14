// Geliştirme aracı: orijinal arayüzü açar; U, K, I pencerelerini sırayla açıp ekran görüntüsü alır.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/?harita=14th_oldmoradon', klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const kayit = []; s.on('pageerror', (e) => kayit.push('HATA ' + e.message)); s.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') kayit.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(3000);
await s.screenshot({ path: `${klasor}/u0.png` });
await s.evaluate(() => { const o = window.ke.oyuncu; o.bonusPuan = 3; o.seviye = 3; });
for (const [tus, ad] of [['KeyU', 'u1'], ['KeyK', 'u2'], ['KeyI', 'u3']]) { await s.keyboard.press(tus); await s.waitForTimeout(600); await s.screenshot({ path: `${klasor}/${ad}.png` }); }
console.log(kayit.slice(0, 12).join('\n') || 'konsol temiz');
await t.close();
