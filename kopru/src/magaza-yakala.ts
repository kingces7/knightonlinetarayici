// Geliştirme aracı: bir NPC mağazasından alım/satım isteği yollar, cevapları kaydeder (protokol/ornekler/myko-magaza.json). Yalnız kotest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { npcListesi } from '../protokol/paketler.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const bayt = (h: string) => Uint8Array.from(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const A = await girisYap('oyuncu', hesap, sifre); const o = A.o;
console.log(`giriş: ${A.benim.ad} (${A.benim.x}, ${A.benim.z}) altın ${A.benim.altin}`);
const pp = (m: number) => Math.round(m * 10);
o.gonder(WIZ.HAREKET, new PaketYazici().u16(pp(305)).u16(pp(342)).u16(87).i16(0).u8(0).u16(pp(305)).u16(pp(342)).u16(87).baytlar()); await bekle(3000); // Moradon şehir noktası
const npcler = o.kayit.filter((k) => k.opcode === WIZ.NPC_LISTESI).flatMap((k) => npcListesi(bayt(k.hex)).npcler).filter((n) => n.tur === 2 && n.satisGrubu > 0);
{ const t = new Map<string, number>(); for (const k of o.kayit.filter((k) => k.opcode === WIZ.NPC_LISTESI)) for (const n of npcListesi(bayt(k.hex)).npcler) t.set(n.tur + '/grup' + (n.satisGrubu > 0), (t.get(n.tur + '/grup' + (n.satisGrubu > 0)) ?? 0) + 1); console.log('NPC dağılımı', [...t]); }
console.log('mağaza NPC:', npcler.slice(0, 6).map((n) => `${n.id}:sid${n.protoNo}:grup${n.satisGrubu}@${n.x},${n.z}`).join(' '));
const n = npcler[0]; if (!n) { console.log('mağaza NPC yok'); process.exit(1); }
const magaza = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../donusturulmus/web/magaza/magaza.json'), 'utf8'));
const sayfa0: number[] = magaza.gruplar[String(n.satisGrubu)][0]; const sira = sayfa0.findIndex(Boolean); const esya = sayfa0[sira];
console.log('satın alınacak:', esya, 'sıra', sira);
const p = (m: number) => Math.round(m * 10);
o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(n.x + 1)).u16(p(n.z)).u16(87).i16(0).u8(0).u16(p(n.x + 1)).u16(p(n.z)).u16(87).baytlar()); await bekle(1500);
const bos = A.benim.envanter.findIndex((e, i) => i >= 14 && !e.no) - 14;
o.asama = 'al'; o.gonder(WIZ.ESYA_ALIM_SATIM, new PaketYazici().u8(1).i32(n.satisGrubu).u16(n.id).u8(1).i32(esya).u8(bos).u16(1).u8(0).u8(sira).baytlar()); await bekle(1000);
console.log('alım:', o.kayit.filter((k) => k.asama === 'al' && [0x21, 0x54, 0x3d].includes(k.opcode)).map((k) => `0x${k.opcode.toString(16)}:${k.hex}`).join(' '));
o.asama = 'sat'; o.gonder(WIZ.ESYA_ALIM_SATIM, new PaketYazici().u8(2).i32(n.satisGrubu).u16(n.id).u8(1).i32(esya).u8(bos).u16(1).baytlar()); await bekle(1000);
console.log('satım:', o.kayit.filter((k) => k.asama === 'sat' && [0x21, 0x54, 0x3d].includes(k.opcode)).map((k) => `0x${k.opcode.toString(16)}:${k.hex}`).join(' '));
o.asama = 'hata'; o.gonder(WIZ.ESYA_ALIM_SATIM, new PaketYazici().u8(1).i32(n.satisGrubu).u16(n.id).u8(1).i32(esya).u8(bos).u16(60000).u8(0).u8(sira).baytlar()); await bekle(1000);
console.log('hata:', o.kayit.filter((k) => k.asama === 'hata' && k.opcode === 0x21).map((k) => k.hex).join(' '));
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', 'myko-magaza.json'), JSON.stringify({ aciklama: 'Moradon mağaza NPC alım/satım (Myko GameServer, 0x21)', kayit: o.kayit.filter((k) => ['al', 'sat', 'hata'].includes(k.asama) && [0x21, 0x54].includes(k.opcode)) }, null, 1));
o.kapat(); setTimeout(() => process.exit(0), 300);
