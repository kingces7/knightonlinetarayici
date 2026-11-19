// Geliştirme aracı: (1) GM olmayan karakterde /statsıfırla ve /skillsıfırla gerçekten sıfırlıyor mu, yazı başka oyuncuya sızıyor mu;
// (2) GM test karakterinde 0 coin ile Aurora'dan alma, iki ele çift elli silah, elde görünüm, sınıf rengi çerçevesi, coin ipucu.
// Kullanım: Edge `msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<klasör>`, köprü, sunucu ve `npm run dev` açıkken:
//   KO_HESAP=kotest KO_SIFRE=<şifre> KO_HESAP2=kotest2 KO_SIFRE2=<şifre> node scripts/gmTesti.mjs <klasör>     (yalnız TEST hesapları; sonra araclar/sunucu/test-karakter-sil.sql)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
const klasor = process.argv[2] ?? '.';
const { KO_HESAP: h, KO_SIFRE: p, KO_HESAP2: h2, KO_SIFRE2: p2 } = process.env;
if (!h || !p || !h2 || !p2) { console.log('KO_HESAP, KO_SIFRE, KO_HESAP2, KO_SIFRE2 gerekli'); process.exit(1); }
const sql = (q) => execFileSync('sqlcmd', ['-S', '.\\SQLEXPRESS', '-E', '-C', '-d', 'LILITH_MYKO', '-h', '-1', '-W', '-s', '|', '-Q', `SET NOCOUNT ON; ${q}`], { encoding: 'utf8' }).trim();
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = t.contexts()[0] ?? await t.newContext();
const hatalar = [];
const sayfa = async (w, hh) => { const s = await ctx.newPage(); await s.setViewportSize({ width: w, height: hh }); s.on('pageerror', (e) => hatalar.push(e.message)); await s.goto('http://localhost:5173/?giris=0&harita=14th_oldmoradon'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2000); return s; };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
/** Karakter yoksa oluşturur (ulus ilk karakterde belirlenir: El Morad İnsan Savaşçı), sonra bağlanır. */
const baglan = (s, hesap, sifre, ad) => s.evaluate(async ([hs, sf, ad]) => {
  await window.ke.sunucuyaBaglan(hs, sf, undefined, undefined, async (yuvalar, araclar) => {
    if (!yuvalar.some((y) => y.ad && y.ad.toLowerCase() === ad.toLowerCase())) {
      const yuva = yuvalar.findIndex((y) => !y.ad);
      const kod = await araclar.olustur({ yuva, ad, irk: 12, sinif: 201, yuz: 1, sac: 1, str: 75, sta: 65, dex: 60, int: 50, cha: 50 });
      if (kod !== 0) throw new Error(`olusturma ${ad} kod ${kod}`);
      await araclar.yenile();
    }
    return ad;
  });
  await new Promise((r) => setTimeout(r, 2500));
  const b = window.ke.benimBilgi, o = window.ke.oyuncu;
  return { ad: o.ad, gm: o.gm, seviye: o.seviye, altin: o.altin, bosPuan: b.bosPuan, statlar: Object.values(b.statlar).map((v) => v.deger).join('/'), skill: JSON.stringify(b.skillPuanlari) };
}, [hesap, sifre, ad]);
const yaz = async (s, m) => { await s.evaluate(() => document.querySelector('[data-id=edit0] input').focus()); await s.keyboard.type(m); await s.keyboard.press('Enter'); await s.waitForTimeout(700); };
const cik = async (s) => { await s.close(); await bekle(6000); };

// ------------------------------------------------------------------ 0) hazırlık (karakterleri oluştur, test durumunu ayarla)
{ const s = await sayfa(1280, 720); await baglan(s, h, p, 'KoTestA'); await cik(s); }
{ const s = await sayfa(1280, 720); await baglan(s, h, p, 'KoGm'); await cik(s); }
{ const s = await sayfa(1280, 720); await baglan(s, h2, p2, 'KoObs'); await cik(s); }
sql("UPDATE USERDATA SET Level = 30, Strong = 120, Sta = 100, Dex = 90, Intel = 60, Cha = 50, Points = 0, strSkill = CAST(0x00000000000A0A000000 AS varchar(10)) WHERE strUserID = 'KoTestA'");
sql("UPDATE USERDATA SET Authority = 0, Level = 80, Class = 206, Strong = 255, Sta = 255, Dex = 255, Intel = 255, Cha = 255, Points = 0, Gold = 0, strSkill = CAST(0x00000000005050500500 AS varchar(10)) WHERE strUserID = 'KoGm'");

// ------------------------------------------------------------------ 1) /statsıfırla ve /skillsıfırla (GM olmayan) + sızıntı kontrolü
if (!process.env.KO_ATLA_SIFIRLA) {
const gozlemci = await sayfa(1280, 720);
console.log('gözlemci:', JSON.stringify(await baglan(gozlemci, h2, p2, 'KoObs')));
await gozlemci.evaluate(() => { window.__sohbet = []; const a = window.ke.arayuz(); const o = a.sohbetYaz.bind(a); a.sohbetYaz = (m, r) => { window.__sohbet.push(m); o(m, r); }; });
const komutDene = async (komut) => {
  let s = await sayfa(1280, 720);
  const once = await baglan(s, h, p, 'KoTestA');
  await yaz(s, komut);
  await s.waitForTimeout(9000); // sayfa yenilenir (sunucu eski bağlantıyı kapatıp kaydeder)
  await s.close(); await bekle(3000);
  s = await sayfa(1280, 720);
  const sonra = await baglan(s, h, p, 'KoTestA');
  await cik(s);
  return { once, sonra };
};
const st = await komutDene('/statsıfırla');
console.log('/statsıfırla: önce', st.once.statlar, 'boşPuan', st.once.bosPuan, '→ sonra', st.sonra.statlar, 'boşPuan', st.sonra.bosPuan);
const sk = await komutDene('/skillsıfırla');
console.log('/skillsıfırla: önce skill', sk.once.skill, '→ sonra', sk.sonra.skill);
console.log('gözlemcinin gördüğü sohbet:', JSON.stringify(await gozlemci.evaluate(() => window.__sohbet)));
await cik(gozlemci);
}

// ------------------------------------------------------------------ 2) GM: 0 coin ile Aurora, iki ele çift elli silah, elde görünüm
const s = await sayfa(1366, 768);
console.log('GM:', JSON.stringify(await baglan(s, h, p, 'KoGm')));
await s.evaluate(() => { window.__m = []; const o = window.ke.hud.mesaj.bind(window.ke.hud); window.ke.hud.mesaj = (m, tur) => { window.__m.push(m); o(m, tur); }; });
const npc = await s.evaluate(() => { const n = window.ke.npcler.find((n) => n.tanim.sid === 29990); if (!n) return null; window.ke.sunucuIsinla(n.konum.x + 2, n.konum.y); return { ad: n.ad }; });
console.log('Aurora:', JSON.stringify(npc)); if (!npc) process.exit(1);
await s.waitForTimeout(4500);
const secim = await s.evaluate(async () => {
  const n = window.ke.npcler.find((n) => n.tanim.sid === 29990); window.ke.npcTikla(n);
  await new Promise((r) => setTimeout(r, 900));
  [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'I want to trade.')?.click(); // konuşma menüsü: alışveriş
  await new Promise((r) => setTimeout(r, 700));
  const m = await (await fetch('/magaza/magaza.json')).json(); const sb = await (await fetch('/silah/silah.json')).json();
  const hepsi = [...new Set(m.gruplar['999000'].flat().filter(Boolean))].map((no) => m.esyalar[String(no)]).filter(Boolean);
  const iki = hepsi.filter((e) => e.tur === 'silah' && e.yuva === 3);
  const yedekli = iki.find((e) => sb[String(e.no)]?.glb) ?? iki[0];                 // modeli yedekten gelen (oyun dosyalarında olmayan) silah
  const b = iki.filter((e) => e.no !== yedekli.no).sort((x, y) => (y.gerekSeviye ?? 0) - (x.gerekSeviye ?? 0))[0]; // en yüksek seviye şartlı
  return { a: { no: yedekli.no, ad: yedekli.ad, gerek: yedekli.gerekSeviye, yedekModel: sb[String(yedekli.no)]?.glb ?? null, sinifDerece: yedekli.sinifDerece }, b: { no: b.no, ad: b.ad, gerek: b.gerekSeviye, sinif: b.sinif, sinifDerece: b.sinifDerece }, aE: { ...yedekli, simge: '' }, bE: { ...b, simge: '' } };
});
console.log('seçilen:', JSON.stringify({ a: secim.a, b: secim.b }));
await s.waitForTimeout(1500);
for (const e of [secim.aE, secim.bE]) { await s.evaluate((x) => window.ke.arayuz().b.magazaSatinAl(x), e); await s.waitForTimeout(1800); }
console.log('coin', await s.evaluate(() => window.ke.oyuncu.altin), '| envanter', JSON.stringify(await s.evaluate(() => window.ke.oyuncu.envanter.map((e, i) => (e ? [i, e.ad] : null)).filter(Boolean))), '| mesaj', JSON.stringify(await s.evaluate(() => window.__m.splice(0).slice(-3))));
for (let k = 0; k < 2; k++) {
  const i = await s.evaluate(([n1, n2]) => window.ke.oyuncu.envanter.findIndex((e) => e && (e.no === n1 || e.no === n2)), [secim.a.no, secim.b.no]);
  if (i < 0) break;
  await s.evaluate((i) => window.ke.hud.esyaKusan(i), i); await s.waitForTimeout(2000);
}
const eller = await s.evaluate(() => ({ sag: window.ke.oyuncu.ekipman[6]?.ad ?? null, sol: window.ke.oyuncu.ekipman[8]?.ad ?? null, plug: [...window.ke.oyuncu.model.plugler.keys()], mesaj: window.__m.splice(0).slice(-3) }));
console.log('eller:', JSON.stringify(eller));
// beyaz kral pelerini görünümü (sunucu yalnız "admin" GM'ine gönderir; burada istemci çizimi doğrudan denenir)
await s.evaluate(() => window.ke.oyuncu.model.pelerinTak(12, 99)); await s.waitForTimeout(1500);
console.log('pelerin modeli:', await s.evaluate(() => window.ke.oyuncu.model.pelerin?.anahtar ?? null));
await s.keyboard.press('KeyI'); await s.waitForTimeout(1200);
await s.screenshot({ path: `${klasor}/gm_eller_envanter.png` });
await s.keyboard.press('KeyI'); await s.waitForTimeout(500);
await s.evaluate(() => { const k = window.ke.kamera; if (k && 'yaw' in k) k.yaw += Math.PI; });
await s.waitForTimeout(800); await s.screenshot({ path: `${klasor}/gm_pelerin_arka.png` });
console.log('hatalar', JSON.stringify(hatalar));
await cik(s);
await t.close();
