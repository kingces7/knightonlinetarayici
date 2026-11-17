// Geliştirme aracı: envanter / banka / mağaza pencerelerinin arka planının ne kadar saydam olduğunu, arkadaki sahneyle kıyaslayarak ölçer. Kullanım: node scripts/saydamlikOlc.mjs
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
const kare = async () => (await s.screenshot()).toString('base64');
const ort = (b64, kutular) => s.evaluate(async ([b64, kutular]) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return kutular.map(([x, y, w, h]) => { const d = g.getImageData(x, y, w, h).data; let r = 0, gg = 0, b = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } return [Math.round(r / n), Math.round(gg / n), Math.round(b / n)]; }); }, [b64, kutular]);
// alanlar: pencere sağ üstte; boş yuvaların arası dahil geniş kutular
const alanlar = { 'üst alan (mağaza ızgarası / envanter ekipman)': [940, 260, 280, 40], 'alt alan (çanta ızgarası)': [930, 360, 280, 150] };
await s.evaluate(() => { for (const a of ['depo']) window.ke.arayuz().ac(a, false); });
const bos = await kare();
await s.keyboard.press('i'); await s.waitForTimeout(800); const env = await kare(); await s.keyboard.press('i'); await s.waitForTimeout(500);
await s.evaluate(() => window.ke.arayuz().depoAc()); await s.waitForTimeout(1200); const depo = await kare();
await s.evaluate(() => window.ke.arayuz().ac('depo', false)); await s.waitForTimeout(300);
await s.evaluate(() => window.ke.npcTikla(window.ke.npcler.find((x) => x.tanim.satis === 253000))); await s.waitForTimeout(1500); const mag = await kare();
const K = Object.values(alanlar);
for (const [ad, b] of [['sahne', bos], ['envanter', env], ['banka', depo], ['mağaza', mag]]) console.log(ad.padEnd(9), JSON.stringify(await ort(b, K)));
for (const op of ["0.66"]) { await s.evaluate((op) => window.ke.arayuz().magazaYeni.p.el.querySelectorAll(".ui-t4").forEach((r) => { if (r.style.display !== "none" && r.style.backgroundImage.includes("person")) r.style.opacity = op; }), op); await s.waitForTimeout(200); console.log("mağaza üst opaklık", op, JSON.stringify(await ort(await kare(), K))); }
await t.close();
