// Geliştirme aracı: Moradon canavar slotlarının birbirine uzaklığını açar (slot mantığı korunur: aynı slot, aynı sayı/yarıçap; yalnız merkez kayar).
// Slotlar çakışmayacak biçimde en az MESAFE m aralıkla itilir; yeni konumlar arazi/çarpışma verisiyle (zemin eğimi, duvar) doğrulanır. Çıktı: E:/tmp/slots_yeni.json. Kullanım: node scripts/canavarYayilim.mjs [mesafe=34]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const MESAFE = Number(process.argv[2] ?? 34);
const slots = fs.readFileSync('E:/tmp/slots.csv', 'utf8').split(/\r?\n/).filter((x) => /^\d/.test(x)).map((x) => { const f = x.split(','); return { id: +f[0], ad: f[2], x: +f[3], z: +f[4], n: +f[5], r: +f[6] }; });
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 800, height: 600 } });
await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.arazi, null, { timeout: 120000 }); await s.waitForTimeout(3000);
const sonuc = await s.evaluate(([slots, MESAFE]) => {
  const arazi = window.ke.arazi, c = arazi.carpisma;
  const gecerli = (x, z) => { // slotun 11×11 alanında örnek noktalar: zemin var, eğim yumuşak, duvar yok
    for (const [dx, dz] of [[0, 0], [-5, -5], [5, -5], [-5, 5], [5, 5], [0, 5], [0, -5], [5, 0], [-5, 0]]) {
      const px = x + dx, pz = z + dz; if (px < 8 || pz < 8 || px > arazi.genislik - 8 || pz > arazi.genislik - 8) return false;
      const y = arazi.yukseklikAl(px, pz); if (!Number.isFinite(y)) return false;
      if (c) { const g = c.zeminBilgi(px, pz, y + 1.6); if (g && g.egim < 0.9) return false; const [qx, qz] = c.duvarlardanIt(px, pz, y, 0.6); if (Math.hypot(qx - px, qz - pz) > 0.05) return false; }
    }
    return true;
  };
  const sabit = (a) => a.n === 1 && a.r === 0; // tek canavarlık özel slotlar yerinde kalır
  const p = slots.map((a) => ({ ...a, ox: a.x, oz: a.z }));
  const baslangicGecerli = p.filter((a) => gecerli(a.x, a.z)).length;
  for (let tur = 0; tur < 400; tur++) {
    let itildi = false;
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const a = p[i], b = p[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 0.01;
      if (d >= MESAFE) continue;
      const it = (MESAFE - d) / 2, nx = dx / d, nz = dz / d;
      const ha = sabit(a), hb = sabit(b); if (ha && hb) continue;
      const pa = ha ? 0 : hb ? 1 : 0.5, pb = hb ? 0 : ha ? 1 : 0.5;
      for (const [q, k, sg] of [[a, pa, -1], [b, pb, 1]]) { if (!k) continue; const yx = q.x + sg * nx * it * 2 * k, yz = q.z + sg * nz * it * 2 * k; if (gecerli(yx, yz) && Math.hypot(yx - q.ox, yz - q.oz) <= 30) { q.x = yx; q.z = yz; itildi = true; } }
    }
    if (!itildi) break;
  }
  const yakin = p.map((a, i) => Math.min(...p.filter((_, j) => j !== i).map((b) => Math.hypot(a.x - b.x, a.z - b.z)))).sort((a, b) => a - b);
  const once = slots.map((a, i) => Math.min(...slots.filter((_, j) => j !== i).map((b) => Math.hypot(a.x - b.x, a.z - b.z)))).sort((a, b) => a - b);
  return { p: p.map((a) => ({ id: a.id, ad: a.ad, x: Math.round(a.x), z: Math.round(a.z), ox: a.ox, oz: a.oz })), baslangicGecerli, toplam: p.length, once: [once[0], once[once.length >> 1]], sonra: [yakin[0], yakin[yakin.length >> 1]], kaymaEnCok: Math.max(...p.map((a) => Math.hypot(a.x - a.ox, a.z - a.oz))), gecersiz: p.filter((a) => !gecerli(Math.round(a.x), Math.round(a.z))).length };
}, [slots, MESAFE]);
fs.writeFileSync('E:/tmp/slots_yeni.json', JSON.stringify(sonuc.p));
console.log({ ...sonuc, p: undefined });
await t.close();
