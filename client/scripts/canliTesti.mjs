// Geliştirme aracı (Aşama 5): tarayıcı oyuncusu sunucuya bağlanır, yanında yürüyen robot oyuncuyu (kopru/src/yuruyen-oyuncu.ts) görür mü?
// Kullanım:  KO_HESAP=... KO_SIFRE=... node scripts/canliTesti.mjs <klasör>
// Önkoşul: köprü, Myko sunucusu, `npm run dev` açık. Robot, bu betik bağlandıktan SONRA başlatılır (kendi konumunu stdout'a yazar).
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1100, height: 720 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const sonuc = await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [hesap, sifre]);
const konum = await s.evaluate(() => [window.ke.oyuncu.konum.x, window.ke.oyuncu.konum.y]);
console.log('KONUM ' + JSON.stringify(konum));
// Robotun girmesini ve yürümesini bekle (dışarıdan başlatılır): en çok 60 sn
let gordu = null;
for (let i = 0; i < 120 && !gordu; i++) { await s.waitForTimeout(500); gordu = await s.evaluate(() => window.ke.digerOyuncular.length ? window.ke.digerOyuncular[0].ad : null); }
const konumlar = () => s.evaluate(() => window.ke.digerOyuncular.map((d) => [d.kimlik, d.ad, +d.konum.x.toFixed(1), +d.konum.y.toFixed(1), d.model?.aktifAd]));
const k1 = await konumlar(); await s.waitForTimeout(3000); const k2 = await konumlar();
const durum = await s.evaluate(() => window.ke.sunucuDurumu());
// Görsel: yerel oyuncuyu robotun 3 m yanına taşı (yalnızca istemci tarafı), kamerayı yaklaştır
await s.evaluate(() => { const d = window.ke.digerOyuncular[0]; if (d) window.ke.oyuncu.isinla(d.konum.x - 3, d.konum.y, window.ke.arazi); window.ke.kamera.uzaklik = 9; window.ke.kamera.egim = 0.45; });
await s.waitForTimeout(1500);
await s.screenshot({ path: `${klasor}/canli_oyuncu.png` });
console.log(JSON.stringify({ gordu, k1, k2, durum, hatalar }, null, 1));
await t.close();
