// Çevrimdışı (giriş yok) test: tarayıcı kilidi (sağ tık/seçim), GM Market NPC'sinin yalnız GM'e görünmesi ve Town noktası.
// Kullanım (npm run dev açıkken; Edge: msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<klasör>): node scripts/tarayiciKilidiTesti.mjs
import { chromium } from 'playwright-core';
const t = await chromium.connectOverCDP(process.env.KO_CDP ?? 'http://127.0.0.1:9333');
const ctx = t.contexts()[0] ?? await t.newContext();
const hatalar = []; let sorun = 0;
const kontrol = (ad, tamam, ayrinti = '') => { console.log(`${tamam ? 'TAMAM' : 'HATA '}  ${ad} ${ayrinti}`); if (!tamam) sorun++; };

for (const [harita, beklenen] of [['14th_oldmoradon', [304, 341]], ['elmo2004', [1600, 412]], ['karus2004', [433, 1629]]]) {
  const s = await ctx.newPage(); await s.setViewportSize({ width: 1280, height: 720 }); s.on('pageerror', (e) => hatalar.push(e.message));
  await s.goto(`http://localhost:5173/?giris=0&harita=${harita}`);
  await s.waitForFunction(() => window.ke?.arayuz?.() && window.ke.npcler?.length >= 0, null, { timeout: 180000 }); await s.waitForTimeout(3000);
  console.log(`-- ${harita}`);
  if (harita === '14th_oldmoradon') {
    const k = await s.evaluate(() => {
      const bos = document.createElement('div'); document.body.appendChild(bos);
      const girdi = document.createElement('input'); document.body.appendChild(girdi);
      const sag = (el) => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; };
      const orta = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 1 }); document.body.dispatchEvent(orta);
      const ctrlS = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }); document.dispatchEvent(ctrlS);
      return { govde: sag(bos), girdi: sag(girdi), orta: orta.defaultPrevented, ctrlS: ctrlS.defaultPrevented, secim: getComputedStyle(document.body).userSelect };
    });
    kontrol('sağ tık menüsü oyun alanında engellendi', k.govde); kontrol('yazı kutusunda sağ tık serbest', !k.girdi);
    kontrol('orta tık engellendi', k.orta); kontrol('Ctrl+S engellendi', k.ctrlS); kontrol('metin seçimi kapalı', k.secim === 'none', k.secim);
  }
  const gm = await s.evaluate(async () => {
    const var_ = () => window.ke.npcler.some((n) => n.tanim.sid === 29990);
    const once = var_(); window.ke.oyuncu.gm = true; await new Promise((r) => setTimeout(r, 600)); const gmken = var_();
    const ad = window.ke.npcler.find((n) => n.tanim.sid === 29990)?.tanim.ad;
    window.ke.oyuncu.gm = false; await new Promise((r) => setTimeout(r, 600)); const sonra = var_();
    return { once, gmken, sonra, ad };
  });
  kontrol('GM Market NPC: GM değilken görünmez', !gm.once); kontrol('GM Market NPC: GM iken görünür', gm.gmken, gm.ad ?? '(NPC bu haritada yok)'); kontrol('GM Market NPC: GM değilse tekrar gizlenir', !gm.sonra);
  const konum = await s.evaluate(async () => { window.ke.arayuz().b.sehreDon(); await new Promise((r) => setTimeout(r, 400)); const k = window.ke.oyuncu.konum; return [Math.round(k.x), Math.round(k.y)]; });
  kontrol('Town noktası', konum[0] === beklenen[0] && konum[1] === beklenen[1], `${konum} (beklenen ${beklenen})`);
  await s.close();
}
console.log(hatalar.length ? `sayfa hataları: ${[...new Set(hatalar)].slice(0, 5).join(' | ')}` : 'sayfa hatası yok');
await t.close();
process.exit(sorun ? 1 : 0);
