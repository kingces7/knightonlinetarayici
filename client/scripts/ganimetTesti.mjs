// Geliştirme aracı: ganimet kuralının dağılımını sunucu yüzdeleriyle karşılaştırır (örnek: sSid 150).
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
const r = await s.evaluate(async () => {
  const v = { ganimetUret: window.ke.ganimetUret };
  const liste = window.ke.canavarlar.map((c) => c.tur); const tur = liste.find((x) => x.sid === 150) ?? liste[0];
  const N = 20000, say = {}; let para = 0, enAz = 1e9, enCok = 0;
  for (let i = 0; i < N; i++) { const g = v.ganimetUret(tur); para += g.altin; enAz = Math.min(enAz, g.altin); enCok = Math.max(enCok, g.altin); for (const e of g.esyalar) say[e.ad] = (say[e.ad] ?? 0) + 1; }
  return { canavar: tur.ad, sid: tur.sid, para: tur.para, ortPara: +(para / N).toFixed(2), enAz, enCok, esyaOrani: Object.fromEntries(Object.entries(say).map(([k, c]) => [k, +(c / N * 100).toFixed(1) + '%'])) };
});
console.log(JSON.stringify({ r, hatalar }, null, 1));
await t.close();
