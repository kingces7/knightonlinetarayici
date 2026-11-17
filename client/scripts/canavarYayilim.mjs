// Geliştirme aracı: Moradon canavar slotlarının İÇİNDE canavarlar birbirinden uzak dursun: slot merkezi aynı kalır, slotun doğma alanı (iRange: merkez ±iRange m kare) genişletilir.
// Sunucu her canavarı slot karesinde rastgele noktada doğurur; kare büyüyünce aynı slottaki canavarlar (ör. bulcanlar) birbirinden uzaklaşır. Alan, komşu slota taşmayacak ve zemin/duvar açısından geçerli kalacak kadar büyütülür.
// Çıktı: E:/tmp/slots_alan.json. Kullanım: node scripts/canavarYayilim.mjs [enBuyukAlan=14]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const EN_BUYUK = Number(process.argv[2] ?? 14);
const slots = fs.readFileSync('E:/tmp/slots.csv', 'utf8').split(/\r?\n/).filter((x) => /^\d/.test(x)).map((x) => { const f = x.split(','); return { id: +f[0], ad: f[2], x: +f[3], z: +f[4], n: +f[5], r: +f[6] }; });
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 800, height: 600 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arazi, null, { timeout: 120000 }); await s.waitForTimeout(3000);
const sonuc = await s.evaluate(([slots, EN_BUYUK]) => {
  const arazi = window.ke.arazi, c = arazi.carpisma;
  const nokta = (px, pz) => { if (px < 6 || pz < 6 || px > arazi.genislik - 6 || pz > arazi.genislik - 6) return false; const y = arazi.yukseklikAl(px, pz); if (!Number.isFinite(y)) return false; if (c) { const g = c.zeminBilgi(px, pz, y + 1.6); if (g && g.egim < 0.9) return false; const [qx, qz] = c.duvarlardanIt(px, pz, y, 0.6); if (Math.hypot(qx - px, qz - pz) > 0.05) return false; } return true; };
  const alanGecerli = (x, z, r) => { let toplam = 0, iyi = 0; for (let dx = -r; dx <= r; dx += 2) for (let dz = -r; dz <= r; dz += 2) { toplam++; if (nokta(x + dx, z + dz)) iyi++; } return iyi / toplam >= 0.97; };
  const sonuc = slots.map((a) => {
    if (a.r === 0) return { id: a.id, ad: a.ad, onceki: a.r, yeni: a.r };
    const komsu = Math.min(...slots.filter((b) => b.id !== a.id).map((b) => Math.hypot(a.x - b.x, a.z - b.z)));
    let r = Math.min(EN_BUYUK, Math.floor(komsu / 2 - 1));
    while (r > a.r && !alanGecerli(a.x, a.z, r)) r--;
    return { id: a.id, ad: a.ad, onceki: a.r, yeni: Math.max(a.r, r) };
  });
  return sonuc;
}, [slots, EN_BUYUK]);
fs.writeFileSync('E:/tmp/slots_alan.json', JSON.stringify(sonuc));
const dagilim = {}; for (const a of sonuc) dagilim[a.yeni] = (dagilim[a.yeni] ?? 0) + 1;
console.log('yeni alan yarıçapı dağılımı', dagilim, 'ortalama', (sonuc.filter((a) => a.onceki > 0).reduce((t, a) => t + a.yeni, 0) / sonuc.filter((a) => a.onceki > 0).length).toFixed(1));
await t.close();
