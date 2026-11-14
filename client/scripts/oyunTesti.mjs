// Geliştirme aracı: sohbet/bilgi pencereleri, kayarak açılma, oturma, T (yürü/koş), yumuşak dönüş ve orta tuşu dener.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/?harita=14th_oldmoradon', klasor = '.'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(url);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(2500);
const bilgi = () => s.evaluate(() => { const o = window.ke.oyuncu; return { can: +o.can.toFixed(1), mana: +o.mana.toFixed(1), oturuyor: !!o.model.oturuyor, anim: o.model.aktifAd, konum: [+o.konum.x.toFixed(2), +o.konum.y.toFixed(2)], yon: +o.yon.toFixed(2) }; });
const cikti = {};

// --- kayarak açılma: K'ya bas, 60 ms sonra pencere hâlâ yolda mı (saydamlık <1), 500 ms sonra tam mı
await s.keyboard.press('KeyK');
await s.waitForTimeout(60);
cikti.kaymaBaslangic = await s.evaluate(() => { const e = document.querySelector('.ui-pencere.kayan:not(.kapali)'); const r = e.getBoundingClientRect(); return { sol: Math.round(r.left), opaklik: +getComputedStyle(e).opacity }; });
await s.waitForTimeout(500);
cikti.kaymaSon = await s.evaluate(() => { const e = document.querySelector('.ui-pencere.kayan:not(.kapali)'); const r = e.getBoundingClientRect(); return { sol: Math.round(r.left), opaklik: +getComputedStyle(e).opacity }; });
await s.keyboard.press('KeyI'); await s.waitForTimeout(600);
cikti.beceriVeEnvanterSol = await s.evaluate(() => [...document.querySelectorAll('.ui-pencere.kayan')].map((e) => Math.round(e.getBoundingClientRect().left)));
await s.screenshot({ path: `${klasor}/o1.png` });
await s.keyboard.press('Escape'); await s.keyboard.press('Escape'); await s.waitForTimeout(500);

// --- sohbet
await s.keyboard.press('Enter'); await s.keyboard.type('hello moradon'); await s.keyboard.press('Enter'); await s.waitForTimeout(300);
cikti.sohbetSatirlari = await s.evaluate(() => [...document.querySelectorAll('.ui-gunluk')].map((k) => k.innerText.trim().split('\n').slice(-2).join(' | ')));
await s.evaluate(() => window.ke.hud.mesaj('You hit Worm for 12 damage.', 'bilgi'));
await s.evaluate(() => window.ke.hud.mesaj('Worm hits you for 4 damage.', 'hasar'));
await s.waitForTimeout(200);
await s.screenshot({ path: `${klasor}/o2.png` });

// --- oturma: C; can/mana düşük başlat, 3 sn sonra dolum
await s.evaluate(() => { const o = window.ke.oyuncu; o.can = 20; o.mana = 10; o.savastanBeri = 99; });
await s.keyboard.press('KeyC'); await s.waitForTimeout(1200);
cikti.oturunca = await bilgi();
await s.screenshot({ path: `${klasor}/o3.png` });
await s.waitForTimeout(2000);
cikti.oturdu3sn = await bilgi();
// oturuken W -> kalkmalı
await s.keyboard.down('KeyW'); await s.waitForTimeout(500); await s.keyboard.up('KeyW');
cikti.Wsonra = await bilgi();
// savaş sonrası oturma reddi
await s.evaluate(() => { window.ke.oyuncu.savastanBeri = 0; });
await s.keyboard.press('KeyC'); await s.waitForTimeout(300);
cikti.savasta = (await bilgi()).oturuyor;
await s.evaluate(() => { window.ke.oyuncu.savastanBeri = 99; });

// --- T: yürüme/koşma hızı
const hiz = async (ms) => { const a = (await bilgi()).konum; await s.keyboard.down('KeyW'); await s.waitForTimeout(ms); await s.keyboard.up('KeyW'); const b = (await bilgi()).konum; return +Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2); };
cikti.kosuMetre = await hiz(1000);
await s.keyboard.press('KeyT'); await s.waitForTimeout(200);
cikti.yuruAnim = null;
await s.keyboard.down('KeyW'); await s.waitForTimeout(300); cikti.yuruAnim = (await bilgi()).anim; await s.keyboard.up('KeyW');
cikti.yurumeMetre = await hiz(1000);
cikti.simgeler = await s.evaluate(() => ['btn_run', 'btn_walk', 'btn_stand', 'btn_sit'].map((id) => `${id}:${[...document.querySelectorAll(`[data-id="${id}"]`)].map((e) => e.style.display === 'none' ? 'gizli' : 'görünür').join(',')}`));
await s.keyboard.press('KeyT'); await s.waitForTimeout(200);

// --- yumuşak dönüş: W ile yürürken A'ya geç; yön açısının zaman içindeki değişimini ölç (ani sıçrama olmamalı)
await s.keyboard.down('KeyW'); await s.waitForTimeout(600);
const ornek = [];
await s.keyboard.up('KeyW'); await s.keyboard.down('KeyS');
for (let i = 0; i < 14; i++) { await s.waitForTimeout(60); ornek.push((await bilgi()).yon); }
await s.keyboard.up('KeyS');
let enBuyukAdim = 0; for (let i = 1; i < ornek.length; i++) { let d = Math.abs(ornek[i] - ornek[i - 1]) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; enBuyukAdim = Math.max(enBuyukAdim, d); }
cikti.donus = { ornek: ornek.map((v) => +v.toFixed(2)), en_buyuk_60ms_adimi_rad: +enBuyukAdim.toFixed(2) };

// --- orta tuş süresi
const aci0 = await s.evaluate(() => window.ke.kamera.aci);
await s.mouse.click(683, 384, { button: 'middle' });
const orta = [];
for (let i = 0; i < 12; i++) { await s.waitForTimeout(70); orta.push(+((await s.evaluate(() => window.ke.kamera.aci)) - aci0).toFixed(2)); }
cikti.ortaTus = orta;
console.log(JSON.stringify(cikti, null, 1), hatalar);
await t.close();
