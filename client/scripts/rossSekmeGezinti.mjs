// Geliştirme aracı (ross): Character Report → Quest → Clan → Friends → Character Report sekme gezintisini dener. Edge CDP 9333.
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
await s.keyboard.press('KeyU'); await s.waitForTimeout(800);
const acik = () => s.evaluate(() => { const a = window.ke.arayuz(); return ['re_el_page_quest', 're_el_clan_window', 're_el_page_friend'].filter((x) => a.genel.acik(x)).concat(a.acik.has('durum') ? ['durum'] : []); });
const git = async (ad, kimlik) => { const c = await s.evaluate(([ad, kimlik]) => { const a = window.ke.arayuz(); const p = ad === 'durum' ? a.pencereler.durum : a.genel.pencere(ad); const e = kimlik ? p.bul(kimlik)[0] : null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [ad, kimlik]); await s.mouse.click(c[0], c[1]); await s.waitForTimeout(700); return acik(); };
const sonuc = [await acik()];
const tikSekme = async (kaynak, sekme) => { const c = await s.evaluate(([kaynak, sekme]) => { const a = window.ke.arayuz(); const p = kaynak === 'durum' ? a.pencereler.durum : a.genel.pencere(kaynak); const e = p.el.querySelector(`[data-sekme="${sekme}"]`); const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [kaynak, sekme]); await s.mouse.click(c[0], c[1]); await s.waitForTimeout(800); return acik(); };
sonuc.push(await tikSekme('durum', 'gorev'));
sonuc.push(await git('re_el_page_quest', 'btn_clan'));
sonuc.push(await git('re_el_clan_window', 'btn_friends'));
sonuc.push(await tikSekme('re_el_page_friend', 'durum'));
console.log(JSON.stringify({ hatalar, sonuc }));
await s.close(); await t.close();
