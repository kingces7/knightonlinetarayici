import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { HareketGonderici } from '../protokol/hareket.ts';
import { npcHareket, npcListesi, npcBolgesi, kimlikIstegi, npcGirisCikis } from '../protokol/paketler.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';
const B = await girisYap('m', 'kotest1', 'kotest1', 'KoTest');
const g = new HareketGonderici((d) => B.o.gonder(WIZ.HAREKET, d), 67);
const konum = new Map<number, { x: number; z: number; t: number; hedefX: number; hedefZ: number; hiz: number }>();
const kayit: string[] = []; let okunan = 0; const t0 = Date.now();
const isle = () => { while (okunan < B.o.kayit.length) { const k = B.o.kayit[okunan++]; const b = Buffer.from(k.hex, 'hex'); const t = (Date.now() - t0) / 1000;
  try {
    if (k.opcode === WIZ.NPC_BOLGESI) { const ids = npcBolgesi(b); B.o.gonder(WIZ.NPC_LISTESI, kimlikIstegi(ids)); }
    else if (k.opcode === WIZ.NPC_LISTESI) for (const n of npcListesi(b).npcler) konum.set(n.id, { x: n.x, z: n.z, t, hedefX: n.x, hedefZ: n.z, hiz: 0 });
    else if (k.opcode === WIZ.NPC_GIRIS_CIKIS) { const r = npcGirisCikis(b); if (r.npc) konum.set(r.id, { x: r.npc.x, z: r.npc.z, t, hedefX: r.npc.x, hedefZ: r.npc.z, hiz: 0 }); }
    else if (k.opcode === WIZ.NPC_HAREKET) { const r = npcHareket(b); const o = konum.get(r.id); if (o) { const mesafe = Math.hypot(r.x - o.hedefX, r.z - o.hedefZ); kayit.push(`${r.id} t=${t.toFixed(2)} oncekiPaketten=${(t - o.t).toFixed(2)}s varacagiMesafe=${mesafe.toFixed(1)} hiz=${r.hiz} gerekenSure=${r.hiz ? (mesafe / r.hiz).toFixed(2) : '-'}`); o.t = t; o.hedefX = r.x; o.hedefZ = r.z; o.hiz = r.hiz; } } }
  catch {} } };
for (let i = 0; i < 40 * 30; i++) { g.guncelle(266, 304, 8.7, 1 / 30); isle(); await bekle(33); }
const sayi = new Map<string, number>(); for (const s of kayit) { const id = s.split(' ')[0]; sayi.set(id, (sayi.get(id) ?? 0) + 1); }
const sec = [...sayi.entries()].sort((a, b) => b[1] - a[1])[0][0];
console.log(kayit.filter((s) => s.startsWith(sec + ' ')).slice(0, 25).join('\n'));
B.o.kapat(); setTimeout(() => process.exit(0), 200);
