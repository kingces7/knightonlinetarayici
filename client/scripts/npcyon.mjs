// Geliştirme aracı: NPC bakış yönü yorumlarını çarpışma verisiyle sınar. Her aday için ölçütleri yazar: onBos (önü arkasından boş), dogru (arkası yakın duvar, önü açık), yanlis (önü yakın duvar, arkası açık).
import { chromium } from 'playwright-core';
const harita = process.argv[2] ?? '14th_oldmoradon';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 700, height: 500 } });
await s.goto(`http://localhost:5173/?harita=${harita}`);
await s.waitForFunction(() => window.ke, null, { timeout: 120000 });
await s.waitForTimeout(3000);
const r = await s.evaluate(async (h) => {
  const npc = (await (await fetch(`/harita/${h}/npc.json`)).json()).npc;
  const { arazi } = window.ke, c = arazi.carpisma;
  const serbest = (x, z, a, boy = 14, yuk = 1.3) => {
    const y = arazi.yukseklikAl(x, z) + yuk;
    const k = c.dogruKesisimi(x, y, z, x + Math.cos(a) * boy, y, z + Math.sin(a) * boy);
    return k === null ? boy : k * boy;
  };
  const sonuc = [];
  for (const sg of [1, -1]) for (const ofs of [0, 90, 180, 270]) {
    let iyi = 0, esit = 0, n = 0, fark = 0, dogru = 0, yanlis = 0, tezgahOnde = 0, tezgahArkada = 0;
    for (const p of npc) {
      if (!p.yon && p.yon !== 0) continue;
      const a = sg * p.yon * Math.PI / 180 + ofs * Math.PI / 180;
      const on = serbest(p.x, p.z, a), arka = serbest(p.x, p.z, a + Math.PI);
      const on6 = serbest(p.x, p.z, a, 6, 0.5), arka6 = serbest(p.x, p.z, a + Math.PI, 6, 0.5); // bel hizası: tezgâh/alçak nesne
      if (on6 < 2 && arka6 >= on6 + 2) tezgahOnde++; if (arka6 < 2 && on6 >= arka6 + 2) tezgahArkada++;
      n++; fark += on - arka; if (on < 2.5 && arka >= on + 3) yanlis++; if (arka < 2.5 && on >= arka + 3) dogru++; if (on > arka + 0.5) iyi++; else if (Math.abs(on - arka) <= 0.5) esit++;
    }
    sonuc.push({ isaret: sg, ofset: ofs, n, onBos: iyi, esit, ortFark: +(fark / n).toFixed(2), dogru, yanlis, tezgahOnde, tezgahArkada });
  }
  return sonuc;
}, harita);
for (const x of r) console.log(JSON.stringify(x));
await t.close();
