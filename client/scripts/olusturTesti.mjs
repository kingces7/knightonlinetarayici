// Geliştirme aracı: karakter oluşturma ekranı uçtan uca (boş test hesabı). Kullanım: KO_HESAP=... KO_SIFRE=... node scripts/olusturTesti.mjs <klasör> <irk-düğmesi> <meslek-düğmesi> <ad>
import { chromium } from 'playwright-core';
const [klasor, irk = 'btn_race_el_rm', meslek = 'btn_class_rogue', ad = 'RogTest1'] = process.argv.slice(2);
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1280, height: 800 } });
const h = []; s.on('pageerror', (e) => h.push(e.message)); s.on('console', (m) => { if (m.type() === 'error') h.push(m.text().slice(0, 120)); });
await s.goto('http://localhost:5173/?giris=1'); await s.waitForSelector('[data-id=Edit_ID] input', { timeout: 120000 }); await s.waitForTimeout(1500);
await s.fill('[data-id=Edit_ID] input', process.env.KO_HESAP); await s.fill('[data-id=Edit_PW] input', process.env.KO_SIFRE); await s.keyboard.press('Enter');
await s.waitForTimeout(4000);
if (!(await s.$('[data-id=edit_name] input')) && !(await s.$('text=Choose your nation'))) { await s.evaluate(() => [...document.querySelectorAll('[data-id=btn_create]')].find((x) => x.offsetParent)?.click()); await s.waitForTimeout(1500); } // dolu hesap: seçim ekranından Create
await s.waitForSelector('[data-id=edit_name] input', { timeout: 30000 }).catch(() => {}); await s.waitForTimeout(1500);
// ulus sorusu varsa El Morad seç
const ulus = await s.$('text=Choose your nation'); if (ulus) { await s.click('button:has-text("El Morad")'); await s.waitForSelector('[data-id=edit_name] input', { timeout: 20000 }); await s.waitForTimeout(3000); }
await s.screenshot({ path: `${klasor}/olustur0.png` });
const tikla = (id) => s.evaluate((id) => { const e = [...document.querySelectorAll(`[data-id="${id}"]`)].find((x) => x.offsetParent); e?.click(); return !!e; }, id);
console.log('ırk', await tikla(irk), 'meslek', await tikla(meslek));
for (let i = 0; i < 9; i++) await tikla('btn_dex_right'); await tikla('btn_int_right');
await s.fill('[data-id=edit_name] input', ad); await s.waitForTimeout(1200);
await s.screenshot({ path: `${klasor}/olustur1.png` });
await tikla('btn_create'); await s.waitForTimeout(3500);
console.log('hatalar', JSON.stringify(h));
await s.screenshot({ path: `${klasor}/olustur2.png` });
await t.close();
