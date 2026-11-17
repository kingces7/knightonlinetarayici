import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.oyuncu?.model, null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.keyboard.press('KeyH'); await s.waitForTimeout(800); await s.screenshot({ path: '/tmp/ui_cmd.png', clip: { x: 880, y: 0, width: 400, height: 560 } });
await s.keyboard.press('KeyH'); await s.keyboard.press('KeyI'); await s.waitForTimeout(1000);
const yer = await s.evaluate(() => { const l = [...document.querySelectorAll('.ui-t9, [class*=slot]')]; return l.length; });
await s.mouse.move(1255, 300); await s.waitForTimeout(200);
// sağ kenardaki ekipman yuvalarının üstüne gel
for (const [x, y] of [[1130, 355], [1245, 355], [1186, 355]]) { await s.mouse.move(x, y); await s.waitForTimeout(250); }
const r = await s.evaluate(() => { const e = document.querySelector('.ipucu'); if (!e || e.classList.contains('gizli')) return null; const b = e.getBoundingClientRect(); return { sag: b.right, alt: b.bottom, genislik: innerWidth }; });
console.log('ipucu', r, yer); await s.screenshot({ path: '/tmp/ui_tip.png' });
await t.close();
