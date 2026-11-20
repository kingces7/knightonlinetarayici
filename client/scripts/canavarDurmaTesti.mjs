// Geliştirme aracı: sunucu modunda canavarların "bir anda durup tekrar yürümesini" ölçer.
// Her 100 ms'de her canavarın konumu/hedefi/hızı/animasyonu örneklenir; 1 sn'den uzun süre konumu değişmeyen ama "yürümesi gereken" (agHedef var, agHiz > 0) ya da
// az önce yürürken ansızın duran canavarlar raporlanır. Kullanım: KO_HESAP=.. KO_SIFRE=.. node scripts/canavarDurmaTesti.mjs [süre sn] [harita]
// Edge: msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<klasör>
import { chromium } from 'playwright-core';
const { KO_HESAP: h, KO_SIFRE: p } = process.env; const sure = Number(process.argv[2] ?? 40), harita = process.argv[3] ?? '';
if (!h || !p) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const t = await chromium.connectOverCDP(process.env.KO_CDP ?? 'http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage(); await s.setViewportSize({ width: 1280, height: 720 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto(`http://localhost:5173/?giris=0${harita ? '&harita=' + harita : ''}`);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2000);
await s.evaluate(async ([h, p]) => { await window.ke.sunucuyaBaglan(h, p, undefined, undefined, async (yuvalar, araclar) => {
  if (!yuvalar.some((y) => y.ad)) { const kod = await araclar.olustur({ yuva: 0, ad: 'KoTestA', irk: 12, sinif: 201, yuz: 1, sac: 1, str: 75, sta: 65, dex: 60, int: 50, cha: 50 }); if (kod !== 0) throw new Error('olusturma kodu ' + kod); await araclar.yenile(); return 'KoTestA'; }
  return yuvalar.find((y) => y.ad)?.ad;
}); }, [h, p]);
await s.waitForTimeout(4000);
const sonuc = await s.evaluate(async (sure) => {
  const ke = window.ke, kayit = new Map(), olaylar = [], paket = [];
  const d0 = ke.sunucuDurumu();
  const bas = performance.now();
  const kareAraliklari = [], paketBosluklari = []; let sonKare = performance.now(), sonPaketSayi = d0.sayac.hareket, sonPaketZaman = performance.now();
  const kare = () => { const n = performance.now(); if (n - sonKare > 500) kareAraliklari.push({ t: +((n - bas) / 1000).toFixed(1), sn: +((n - sonKare) / 1000).toFixed(1) }); sonKare = n; if (n - bas < sure * 1000 + 500) requestAnimationFrame(kare); };
  requestAnimationFrame(kare);
  while (performance.now() - bas < sure * 1000) {
    const simdi = (performance.now() - bas) / 1000;
    const hs = ke.sunucuDurumu().sayac.hareket; if (hs !== sonPaketSayi) { const bosluk = performance.now() - sonPaketZaman; if (bosluk > 1000) paketBosluklari.push({ t: +simdi.toFixed(1), sn: +(bosluk / 1000).toFixed(1) }); sonPaketSayi = hs; sonPaketZaman = performance.now(); }
    for (const c of ke.canavarlar) { const id = c.agKimlik; if (!id || c.olu) continue;
      let k = kayit.get(id); if (!k) { k = { x: c.konum.x, z: c.konum.y, degisti: simdi, hareketliydi: false, ad: c.tur?.ad, durmaBasi: 0, uzun: 0, olaylar: 0 }; kayit.set(id, k); }
      const d = Math.hypot(c.konum.x - k.x, c.konum.y - k.z);
      if (d > 0.02) {
        if (k.durmaBasi && simdi - k.durmaBasi > 1.0 && k.hareketliydi) { olaylar.push({ id, ad: k.ad, sure: +(simdi - k.durmaBasi).toFixed(1), hedefVar: !!c.agHedef, hiz: +c.agHiz.toFixed(1), anim: c.model?.aktifAd, t: +simdi.toFixed(1) }); }
        k.x = c.konum.x; k.z = c.konum.y; k.degisti = simdi; k.hareketliydi = true; k.durmaBasi = 0;
      } else if (!k.durmaBasi && k.hareketliydi) k.durmaBasi = simdi;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const d1 = ke.sunucuDurumu();
  return { kareAraliklari, paketBosluklari, canavar: kayit.size, hareketPaketi: d1?.sayac?.hareket - d0?.sayac?.hareket, olaylar, bolge: ke.oyuncu.konum ? [Math.round(ke.oyuncu.konum.x), Math.round(ke.oyuncu.konum.y)] : null };
}, sure);
console.log(JSON.stringify({ ...sonuc, olayAdedi: sonuc.olaylar.length, ornek: sonuc.olaylar.slice(0, 6).map((o) => `${o.t}s ${o.ad}#${o.id} ${o.sure}sn hedef=${o.hedefVar} hiz=${o.hiz} ${o.anim}`), olaylar: undefined, hatalar: hatalar.slice(0, 3) }, null, 1));
await s.close(); await t.close();
