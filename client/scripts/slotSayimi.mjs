// Geliştirme aracı (yalnız kotest): her canavar slotuna ışınlanıp client'ta görünen canavarları sayar. Çıktı: client/scripts/_slot.out
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const slot = fs.readFileSync('scripts/_slotlar.txt', 'utf8').trim().split(/\r?\n/).map((l) => l.split('|')).map((a) => ({ id: +a[0], npc: +a[1], ad: a[2], x: +a[3], z: +a[4], n: +a[5], r: +a[6] }));
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
const s = await t.newPage({ viewport: { width: 1000, height: 600 } });
await s.goto('http://localhost:5180/?giris=0'); await s.waitForFunction(() => window.ke, null, { timeout: 120000 }); await s.waitForTimeout(2500);
await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]);
if (await s.evaluate(() => window.ke.oyuncu.olu)) { await s.evaluate(() => window.ke.hud.yenidenDog()); await s.waitForTimeout(2500); }
const sat = [];
for (const k of slot) {
  await s.evaluate(([x, z]) => window.ke.sunucuIsinla(x, z + 8), [k.x, k.z]); await s.waitForTimeout(10000);
  const r = await s.evaluate(([npc, x, z, rr]) => { const l = window.ke.canavarlar.filter((c) => c.tur.sid === npc && Math.hypot(c.konum.x - x, c.konum.y - z) < rr + 14); return { canli: l.filter((c) => !c.olu).length, olu: l.filter((c) => c.olu).length, toplamCanavar: window.ke.canavarlar.length, olduMu: window.ke.oyuncu.olu }; }, [k.npc, k.x, k.z, k.r]);
  sat.push(`${k.id} ${k.ad} (${k.x},${k.z}) beklenen ${k.n} canlı ${r.canli} ölü ${r.olu} (ekranda toplam ${r.toplamCanavar}${r.olduMu ? ', OYUNCU ÖLÜ' : ''})`);
  fs.writeFileSync('scripts/_slot.out', sat.join('\n'));
  if (r.olduMu) { await s.evaluate(() => window.ke.hud.yenidenDog()); await s.waitForTimeout(2500); }
}
await t.close();
