// Geliştirme aracı (ross): katlama düğmeleri, Shout sekmesi ve pencerelerin kenara oturması. Edge CDP 9333.
// Kullanım: node scripts/rossKatlaTesti.mjs <klasor> [genislik] [yukseklik]
import { chromium } from 'playwright-core';
const [klasor = '.', w = '1600', h = '900'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: Number(w), height: Number(h) });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('ke_')) localStorage.removeItem(k); } catch { /* */ } });
await s.reload();
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const rapor = {};
const alt = async (ad, kimlik) => { const r = await s.evaluate(([ad, kimlik]) => { const e = window.ke.arayuz()[ad].bul(kimlik)[0]; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [ad, kimlik]); return r; };
const kutu = async (ad) => { const r = await s.evaluate((ad) => { const b = window.ke.arayuz()[ad].el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, ad); return { x: Math.max(0, r[0] - 10), y: Math.max(0, r[1] - 10), width: Math.min(r[2] + 20, 1600), height: r[3] + 20 }; };
await s.screenshot({ path: `${klasor}/k0.png` });
// Shout sekmesine bas
let c = await alt('sohbet', 'btn_shout'); await s.mouse.click(c[0], c[1]); await s.mouse.move(700, 300); await s.waitForTimeout(200);
await s.screenshot({ path: `${klasor}/k1_shout.png`, clip: await kutu('sohbet') });
// mana yetmezken Shout
await s.evaluate(() => { const o = window.ke.arayuz().b.oyuncu; o.mana = 0; });
await s.evaluate(() => { const a = window.ke.arayuz(); a.sohbetGiris.value = 'hello world'; });
await s.keyboard.press('Enter'); await s.waitForTimeout(100);
await s.evaluate(() => { const a = window.ke.arayuz(); a.sohbetGiris.focus(); a.sohbetGiris.value = 'hello far away'; });
await s.keyboard.press('Enter'); await s.waitForTimeout(400);
rapor.shoutMesaj = await s.evaluate(() => [...document.querySelectorAll('.ui-gunluk')].map((k) => k.innerText.slice(-120)));
// katlama: sohbet
c = await alt('sohbet', 'btn_off'); await s.mouse.click(c[0], c[1]); await s.mouse.move(700, 300); await s.waitForTimeout(250);
c = await alt('bilgi', 'btn_minimizeui'); await s.mouse.click(c[0], c[1]); await s.mouse.move(700, 300); await s.waitForTimeout(250);
await s.screenshot({ path: `${klasor}/k2_katli.png` });
rapor.katli = await s.evaluate(() => { const a = window.ke.arayuz(); return { sohbet: a.sohbet.el.style.display, sohbetK: a.sohbetKucuk.el.getBoundingClientRect().toJSON(), bilgiK: a.bilgiKucuk.el.getBoundingClientRect().toJSON() }; });
// aç
c = await s.evaluate(() => { const e = window.ke.arayuz().sohbetKucuk.bul('btn_on')[0].getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; }); await s.mouse.click(c[0], c[1]);
c = await s.evaluate(() => { const e = window.ke.arayuz().bilgiKucuk.bul('btn_on')[0].getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; }); await s.mouse.click(c[0], c[1]);
await s.mouse.move(700, 300); await s.waitForTimeout(250);
await s.screenshot({ path: `${klasor}/k3_acik.png` });
rapor.acik = await s.evaluate(() => { const a = window.ke.arayuz(); return [a.sohbet.el.style.display, a.bilgi.el.style.display, a.sohbetKucuk.el.style.display]; });
// kenar oturma: pencereleri sürükle
await s.keyboard.press('KeyI'); await s.waitForTimeout(900);
const g = async (ad) => s.evaluate((ad) => { const a = window.ke.arayuz(); const p = a.pencereler[ad]; const [l, t, r, b] = p.sinir(); const o = p.olcek; const bb = p.el.getBoundingClientRect(); return { sol: bb.left + l * o, ust: bb.top + t * o, sag: bb.left + r * o, alt: bb.top + b * o, ekran: [innerWidth, innerHeight] }; }, ad);
const surukle = async (ad, hedefX, hedefY) => { const k = await s.evaluate((ad) => { const p = window.ke.arayuz().pencereler[ad]; const b = p.el.getBoundingClientRect(); const [l, t] = p.sinir(); return [b.left + (l + 100) * p.olcek, b.top + (t + 8) * p.olcek]; }, ad); await s.mouse.move(k[0], k[1]); await s.mouse.down(); await s.mouse.move(hedefX, hedefY, { steps: 10 }); await s.mouse.up(); await s.waitForTimeout(300); };
await surukle('envanter', -500, -500); rapor.envanterSolUst = await g('envanter');
await surukle('envanter', 5000, 5000); rapor.envanterSagAlt = await g('envanter');
// skill çubuğu: sol kenara yakın bırakınca geri sıçramamalı; dört kenara oturabilmeli
const cubukDurum = () => s.evaluate(() => { const p = window.ke.arayuz().cubuk; const [l, t, r, b] = p.sinir(); const bb = p.el.getBoundingClientRect(); const o = p.olcek; return { sol: bb.left + l * o, ust: bb.top + t * o, sag: bb.left + r * o, alt: bb.top + b * o }; });
const top = await s.evaluate(() => { const e = window.ke.arayuz().cubuk.bul('btn_change').filter((x) => x.offsetParent)[0]; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
await s.mouse.move(top[0], top[1]); await s.mouse.down(); await s.mouse.move(top[0] + 30, top[1] + 120, { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(300);
rapor.cubukSolaYakin = await cubukDurum();
const top2 = await s.evaluate(() => { const e = window.ke.arayuz().cubuk.bul('btn_change').filter((x) => x.offsetParent)[0]; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
await s.mouse.move(top2[0], top2[1]); await s.mouse.down(); await s.mouse.move(-300, -300, { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(300);
rapor.cubukSolUst = await cubukDurum();
await s.screenshot({ path: `${klasor}/k4_env.png` });
await s.screenshot({ path: `${klasor}/k5_bilgi.png`, clip: await kutu('bilgi') });
console.log(JSON.stringify({ hatalar, rapor }, null, 1));
await s.close(); await t.close();
