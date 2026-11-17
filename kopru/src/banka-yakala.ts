// Geliştirme aracı: NPC bankası (WIZ_WAREHOUSE 0x45) açma/yatırma/çekme paketlerini kaydeder (protokol/ornekler/myko-banka.json). Yalnız kotest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { npcGirisCikis, npcListesi } from '../protokol/paketler.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const bayt = (h: string) => Uint8Array.from(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const A = await girisYap('oyuncu', hesap, sifre); const o = A.o;
console.log(`giriş: altın ${A.benim.altin}; envanter:`, A.benim.envanter.map((e, i) => (e.no && i >= 14 ? `${i - 14}:${e.no}x${e.adet}` : '')).filter(Boolean).join(' '));
const p = (m: number) => Math.round(m * 10);
const git = (x: number, z: number) => o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x)).u16(p(z)).u16(87).i16(0).u8(0).u16(p(x)).u16(p(z)).u16(87).baytlar());
git(399, 395); await bekle(3500);
const tumNpc = [...o.kayit.filter((k) => k.opcode === WIZ.NPC_LISTESI).flatMap((k) => npcListesi(bayt(k.hex)).npcler), ...o.kayit.filter((k) => k.opcode === WIZ.NPC_GIRIS_CIKIS).map((k) => npcGirisCikis(bayt(k.hex)).npc).filter((x) => x)] as import('../protokol/paketler.ts').NpcBilgisi[];
const n = tumNpc.find((x) => x.tur === 2 && x.protoNo === 16096);
console.log('NPC sayısı', tumNpc.length);
if (!n) { console.log('banka NPC yok'); process.exit(1); }
console.log('banka NPC', n.id, 'sid', n.protoNo, 'tip', n.tip, n.x, n.z);
git(n.x + 1.5, n.z); await bekle(1500);
const iste = async (ad: string, y: Uint8Array) => { o.asama = ad; o.gonder(WIZ.BANKA, y); await bekle(900); const r = o.kayit.filter((k) => k.asama === ad && k.opcode === WIZ.BANKA); console.log(ad, r.map((k) => `${k.hex.length / 2}b:${k.hex.slice(0, 60)}`).join(' ') || '(cevap yok)'); };
o.asama = 'hedef'; o.gonder(WIZ.HEDEF_CAN, new PaketYazici().u16(n.id).u8(1).baytlar()); await bekle(600);
await iste('ac', new PaketYazici().u8(1).baytlar());
const ALTIN = 900000000;
await iste('altin_yatir', new PaketYazici().u8(2).u16(n.id).u32(ALTIN).u8(0).u8(0).u8(0).u32(5).baytlar());
await iste('altin_cek', new PaketYazici().u8(3).u16(n.id).u32(ALTIN).u8(0).u8(0).u8(0).u32(5).baytlar());
const esya = A.benim.envanter.findIndex((e, i) => i >= 14 && e.no); const e = A.benim.envanter[esya];
await iste('esya_yatir', new PaketYazici().u8(2).u16(n.id).u32(e.no).u8(0).u8(esya - 14).u8(0).u32(1).baytlar());
await iste('esya_cek', new PaketYazici().u8(3).u16(n.id).u32(e.no).u8(0).u8(0).u8(esya - 14).u32(1).baytlar());
const ham = o.kayit.find((k) => k.asama === 'ac' && k.opcode === WIZ.BANKA);
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', 'myko-banka.json'), JSON.stringify({ aciklama: 'Moradon banka (Inn Hostess) acma/yatirma/cekme (Myko GameServer, 0x45); acma cevabinin ilk 200 bayti', ac: ham?.hex.slice(0, 400), diger: o.kayit.filter((k) => k.asama !== 'ac' && k.opcode === WIZ.BANKA).map((k) => ({ asama: k.asama, hex: k.hex })) }, null, 1));
o.kapat(); setTimeout(() => process.exit(0), 300);
