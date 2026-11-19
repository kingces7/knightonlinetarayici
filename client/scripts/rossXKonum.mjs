// Geliştirme aracı (ross): U penceresinde dört sekme arasında gezip kapatma (X) düğmesi ve sekmelerin ekran konumunu ölçer; görüntü alır. Edge CDP 9333.
// Kullanım: node scripts/rossXKonum.mjs <klasor> [genislik] [yukseklik]
import { chromium } from 'playwright-core';
const [klasor = '.', w = '1600', h = '900'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('ke_') || k.startsWith('ke.')) localStorage.removeItem(k); } catch { /* */ } });
await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const olc = (kaynak) => s.evaluate((kaynak) => {
  const a = window.ke.arayuz(); const p = kaynak === 'durum' ? a.pencereler.durum : a.genel.pencere(kaynak);
  const x = [...p.el.querySelectorAll('[title="Close"], [data-id="btn_close"]')].find((e) => e.parentElement === p.el && e.style.top === '18px');
  const sek = (k) => { const e = p.el.querySelector(`[data-sekme="${k}"]`) ?? p.bul({ durum: 'btn_state', gorev: 'btn_title', klan: 'btn_clan', dost: 'btn_friends' }[k])[0]; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; };
  const b = x.getBoundingClientRect();
  return { x: [Math.round(b.left), Math.round(b.top)], cr: sek('durum'), quest: sek('gorev'), clan: sek('klan'), friend: sek('dost') };
}, kaynak);
const git = async (kaynak, sekme) => { const c = await s.evaluate(([kaynak, sekme]) => { const a = window.ke.arayuz(); const p = kaynak === 'durum' ? a.pencereler.durum : a.genel.pencere(kaynak); const e = p.el.querySelector(`[data-sekme="${sekme}"]`) ?? p.bul({ durum: 'btn_state', gorev: 'btn_title', klan: 'btn_clan', dost: 'btn_friends' }[sekme])[0]; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [kaynak, sekme]); await s.mouse.click(c[0], c[1]); await s.mouse.move(700, 600); await s.waitForTimeout(800); };
const r = {};
await s.keyboard.press('KeyU'); await s.waitForTimeout(900);
r.durum = await olc('durum'); await s.screenshot({ path: `${klasor}/x_durum.png`, clip: { x: 0, y: 90, width: 420, height: 330 } });
await git('durum', 'gorev'); r.quest = await olc('re_el_page_quest'); await s.screenshot({ path: `${klasor}/x_quest.png`, clip: { x: 0, y: 90, width: 420, height: 330 } });
await git('re_el_page_quest', 'klan'); r.clan = await olc('re_el_clan_window'); await s.screenshot({ path: `${klasor}/x_clan.png`, clip: { x: 0, y: 90, width: 420, height: 330 } });
await git('re_el_clan_window', 'dost'); r.friend = await olc('re_el_page_friend'); await s.screenshot({ path: `${klasor}/x_friend.png`, clip: { x: 0, y: 90, width: 420, height: 330 } });
await git('re_el_page_friend', 'durum'); r.durum2 = await olc('durum');
console.log(JSON.stringify({ hatalar, r }));
await s.close(); await t.close();
