// Geliştirme aracı: canavar öldürüp ganimet akışını (0x23 düşme, 0x24 kutu açma, 0x26 alma) sunucudan kaydeder (kopru/protokol/ornekler/myko-ganimet.json).
// Kullanım:  KO_HESAP=... KO_SIFRE=... node src/ganimet-yakala.ts      (kotest hesabıyla; admin226'ya dokunma)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { npcHareket, npcListesi, type NpcBilgisi } from '../protokol/paketler.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const bayt = (h: string) => Uint8Array.from(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const A = await girisYap('oyuncu', hesap, sifre); const o = A.o;
console.log(`giriş: ${A.benim.ad} seviye ${A.benim.seviye} soket ${A.benim.soketNo}`);
const p = (m: number) => Math.round(m * 10);
const isinlan = (x: number, z: number) => o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x)).u16(p(z)).u16(87).i16(0).u8(0).u16(p(x)).u16(p(z)).u16(87).baytlar());
o.asama = 'dirilt'; o.gonder(WIZ.YENIDEN_DOGUS, new PaketYazici().u8(1).baytlar()); await bekle(2500); // test karakteri ölü kalmış olabilir
o.asama = 'bolge'; isinlan(430, 217); await bekle(2500);
const can = new Map<number, NpcBilgisi & { x: number; z: number }>();
const isle = () => { for (const k of o.kayit) {
  if (k.opcode === WIZ.NPC_LISTESI) for (const n of npcListesi(bayt(k.hex)).npcler) if (n.tur === 1 && !can.has(n.id)) can.set(n.id, { ...n });
  if (k.opcode === WIZ.NPC_HAREKET) { const h = npcHareket(bayt(k.hex)); const c = can.get(h.id); if (c) { c.x = h.x; c.z = h.z; } }
} };
isle();
const hedef = [...can.values()].sort((a, b) => a.seviye - b.seviye)[0]; if (!hedef) { console.log('canavar yok'); process.exit(1); }
console.log('hedef', hedef.id, hedef.protoNo, 'seviye', hedef.seviye);
o.asama = 'yaklas'; isinlan(hedef.x + 1.0, hedef.z); await bekle(1000);
o.gonder(WIZ.HEDEF_CAN, new PaketYazici().u16(hedef.id).u8(1).baytlar()); await bekle(500);
for (let i = 1; i <= 40 && !o.kayit.some((k) => k.opcode === WIZ.ESYA_DUSTU); i++) {
  isle(); const c = can.get(hedef.id)!; isinlan(c.x + 1.0, c.z); await bekle(150);
  o.asama = `saldiri_${i}`;
  o.gonder(WIZ.SALDIRI, new PaketYazici().u8(1).u8(0).i16(hedef.id).i16(3000).i16(10).u8(0).baytlar()); await bekle(1100);
}
await bekle(1500);
const h = new Map<number, number>(); for (const k of o.kayit) h.set(k.opcode, (h.get(k.opcode) ?? 0) + 1); console.log([...h].map(([a, b]) => '0x' + a.toString(16) + 'x' + b).join(' '));
const dus = o.kayit.find((k) => k.opcode === WIZ.ESYA_DUSTU);
console.log('0x23:', dus?.hex ?? '(düşmedi)');
if (dus) {
  const g = bayt(dus.hex); const torba = (g[2] | g[3] << 8 | g[4] << 16 | g[5] << 24) >>> 0;
  o.asama = 'kutu_ac'; o.gonder(0x24, new PaketYazici().u32(torba).baytlar()); await bekle(800);
  const icerik = o.kayit.find((k) => k.asama === 'kutu_ac' && k.opcode === 0x24);
  console.log('0x24:', icerik?.hex);
  if (icerik) {
    const b = bayt(icerik.hex);
    for (let s = 0; s < 8; s++) {
      const dv = new DataView(b.buffer, b.byteOffset + 5 + s * 6, 6), id = dv.getUint32(0, true);
      if (!id) continue;
      o.asama = `al_${s}`; o.gonder(0x26, new PaketYazici().u32(torba).u32(id).u16(s).baytlar()); await bekle(800);
      console.log(`0x26 yuva ${s} (eşya ${id}):`, o.kayit.filter((k) => k.asama === o.asama).map((k) => `0x${k.opcode.toString(16)}:${k.hex}`).join(' '));
    }
  }
}
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', 'myko-ganimet.json'), JSON.stringify({ aciklama: 'Seviye 2 savasci canavar oldurup ganimeti acar/alirken gelen paketler (Myko GameServer, 0x23/0x24/0x26)', kayit: o.kayit.filter((k) => [0x23, 0x24, 0x26, 0x4a, 0x54, 0x3d, 0x1a].includes(k.opcode)) }, null, 1));
o.kapat(); setTimeout(() => process.exit(0), 300);
