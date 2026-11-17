// Geliştirme aracı: bir sunucu canavarına skill (WIZ_MAGIC_PROCESS 0x31) kullanıp gelen BÜTÜN paketleri kaydeder (kopru/protokol/ornekler/myko-beceri.json).
// Kullanım:  KO_HESAP=... KO_SIFRE=... [KO_BECERI=201001] node src/beceri-yakala.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { npcHareket, npcListesi, type NpcBilgisi } from '../protokol/paketler.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const beceri = Number(process.env.KO_BECERI ?? 201001);
const bayt = (h: string) => Uint8Array.from(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const A = await girisYap('oyuncu', hesap, sifre);
const o = A.o;
console.log(`giriş: ${A.benim.ad} seviye ${A.benim.seviye} soket ${A.benim.soketNo}`);
const p = (m: number) => Math.round(m * 10);
const isinlan = (x: number, z: number) => o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x)).u16(p(z)).u16(87).i16(0).u8(0).u16(p(x)).u16(p(z)).u16(87).baytlar());
o.asama = 'bolge'; isinlan(430, 217); await bekle(2500);
const can = new Map<number, NpcBilgisi & { x: number; z: number }>();
for (const k of o.kayit) {
  if (k.opcode === WIZ.NPC_LISTESI) for (const n of npcListesi(bayt(k.hex)).npcler) if (n.tur === 1) can.set(n.id, { ...n });
  if (k.opcode === WIZ.NPC_HAREKET) { const h = npcHareket(bayt(k.hex)); const c = can.get(h.id); if (c) { c.x = h.x; c.z = h.z; } }
}
const hedef = [...can.values()][0]; if (!hedef) { console.log('canavar yok'); process.exit(1); }
console.log('hedef', hedef.id, hedef.protoNo, hedef.x, hedef.z);
o.asama = 'yaklas'; isinlan(hedef.x + 1.0, hedef.z); await bekle(1200);
o.asama = 'hedef'; o.gonder(WIZ.HEDEF_CAN, new PaketYazici().u16(hedef.id).u8(1).baytlar()); await bekle(600);
if (process.env.KO_ONCE) { const y0 = new PaketYazici().u8(3).u32(Number(process.env.KO_ONCE)).u16(A.benim.soketNo).u16(hedef.id); for (let k = 0; k < 7; k++) y0.u16(0); o.asama = 'once'; o.gonder(WIZ.BECERI, y0.baytlar()); await bekle(1500); }
await bekle(Number(process.env.KO_BEKLE ?? 0)); // göz kırpma (yeniden doğma/giriş sonrası 10 sn) bitsin: buff skill'leri o sürede -103 ile reddedilir
for (let i = 1; i <= 3; i++) {
  o.asama = `beceri_${i}`;
  const hedefId = process.env.KO_HEDEF === 'ben' ? A.benim.soketNo : hedef.id; const y = new PaketYazici().u8(3).u32(beceri).u16(A.benim.soketNo).u16(hedefId); for (let k = 0; k < 7; k++) y.u16(0);
  if (process.env.KO_MOD === 'once-cast') { const c = new PaketYazici().u8(1).u32(beceri).u16(A.benim.soketNo).u16(hedefId); for (let k = 0; k < 7; k++) c.u16(0); o.gonder(WIZ.BECERI, c.baytlar()); await bekle(900); }
  o.gonder(WIZ.BECERI, y.baytlar()); await bekle(1500);
  console.log(`beceri ${i}:`, o.kayit.filter((k) => k.asama === o.asama).map((k) => `0x${k.opcode.toString(16)}(${k.hex.length / 2}b)`).join(' ') || '(cevap yok)');
}
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', process.env.KO_CIKTI ?? 'myko-beceri.json'), JSON.stringify({ aciklama: 'Seviye 2 savasci Stroke vb. skill kullanirken gelen paketler (Myko, 2026-11-17).', beceri, hedefId: hedef.id, paketler: o.kayit.filter((k) => /^(hedef|beceri_)/.test(k.asama)) }, null, 1));
o.kapat(); setTimeout(() => process.exit(0), 300);
