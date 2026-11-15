// Geliştirme aracı: NPC bakış yönü yorumlarını tüm sunucu haritalarındaki dost NPC'lerle sınar.
//   node scripts/npcyonAnaliz.mjs <npc_tum.json>   (JSON: bölge, smd, x, z, yon — araclar/sunucu'daki SQL ile üretilir)
// Her aday yorum için, NPC'nin önünün arkasından daha açık olduğu (baş hizasında ışın) NPC sayısı ve ortalama fark yazılır.
import fs from 'node:fs';
import path from 'node:path';
import { Carpisma } from '../src/dunya/carpisma.ts';
import { smdOku } from '../../araclar/harita/smd.ts';

const SMD_DIZINI = path.resolve('../oyun-dosyalari/kaynak/LILITH_Game-Server/Depo/Map');
const npc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
const gruplar = new Map();
// yön = 0 olanlar "yön verilmemiş" demektir; bilgi taşımadığı için çıkarılır
for (const n of npc.filter((q) => q.yon !== 0)) (gruplar.get(n.smd) ?? gruplar.set(n.smd, []).get(n.smd)).push(n);
const adaylar = [];
for (const sg of [1, -1]) for (const ofs of [0, 90, 180, 270]) adaylar.push({ sg, ofs, n: 0, on: 0, arka: 0, fark: 0, dogru: 0, yanlis: 0 });
for (const [dosya, liste] of gruplar) {
  const yol = path.join(SMD_DIZINI, dosya);
  if (!fs.existsSync(yol)) continue;
  let smd;
  try { smd = smdOku(fs.readFileSync(yol)); } catch { continue; }
  if (!smd.yuzler.length) continue;
  // Dejenere/dev üçgenleri ele (sonsuz, harita dışı ya da 150 m'den büyük)
  const temiz = [];
  const hy = smd.boyut * smd.birim;
  for (let t = 0; t < smd.yuzler.length; t += 9) {
    const v = smd.yuzler.subarray(t, t + 9);
    if (v.some((q) => !Number.isFinite(q))) continue;
    const xs = [v[0], v[3], v[6]], zs = [v[2], v[5], v[8]];
    if (Math.min(...xs) < -50 || Math.max(...xs) > hy + 50 || Math.min(...zs) < -50 || Math.max(...zs) > hy + 50) continue;
    if (Math.max(...xs) - Math.min(...xs) > 150 || Math.max(...zs) - Math.min(...zs) > 150) continue;
    temiz.push(...v);
  }
  const c = new Carpisma(new Float32Array(temiz), hy);
  const serbest = (x, y, z, a, boy) => { const k = c.dogruKesisimi(x, y, z, x + Math.cos(a) * boy, y, z + Math.sin(a) * boy); return k === null ? boy : k * boy; };
  for (const p of liste) {
    // zemin yüksekliği: ızgaradan
    const gx = Math.min(smd.boyut - 1, Math.max(0, Math.round(p.x / smd.birim))), gz = Math.min(smd.boyut - 1, Math.max(0, Math.round(p.z / smd.birim)));
    const y0 = smd.yukseklik[gz * smd.boyut + gx];
    const y = (Number.isFinite(y0) ? y0 : 0) + 1.3;
    for (const a of adaylar) {
      const ang = (a.sg * p.yon * Math.PI) / 180 + (a.ofs * Math.PI) / 180;
      const on = serbest(p.x, y, p.z, ang, 12), arka = serbest(p.x, y, p.z, ang + Math.PI, 12);
      a.n++; a.fark += on - arka;
      if (on > arka + 0.5) a.on++; else if (arka > on + 0.5) a.arka++;
      if (arka < 2.5 && on >= arka + 3) a.dogru++; if (on < 2.5 && arka >= on + 3) a.yanlis++;
    }
  }
}
console.log('harita sayısı', gruplar.size);
for (const a of adaylar) console.log(`işaret ${a.sg > 0 ? '+' : '-'} ofset ${String(a.ofs).padStart(3)}: n=${a.n} önüAçık=${a.on} arkasıAçık=${a.arka} ortFark=${(a.fark / Math.max(1, a.n)).toFixed(2)} doğru(arka duvar)=${a.dogru} yanlış(ön duvar)=${a.yanlis}`);
