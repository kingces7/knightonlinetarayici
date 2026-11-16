// Geliştirme aracı: Lilith (seviye 65) ile en yakın canavarın yanına gidip saldırır; savaş sırasında gelen BÜTÜN paketleri kaydeder
// (kopru/protokol/ornekler/myko-savas.json). Çalışan Myko sunucusu gerekir. Hesap bilgisi dosyaya yazılmaz.
// Kullanım:  KO_HESAP=... KO_SIFRE=... node src/savas-yakala.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { npcHareket, npcListesi, type NpcBilgisi } from '../protokol/paketler.ts';
import { bekle, girisYap, hex } from './oyunBaglantisi.ts';

const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const bayt = (h: string) => Uint8Array.from(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);

const A = await girisYap('oyuncu', hesap, sifre);
const o = A.o;
console.log(`giriş: ${A.benim.ad} (${A.benim.x}, ${A.benim.z}) seviye ${A.benim.seviye}`);

// Çevredeki canavarlar (0x1D listesi ve sonraki hareketler)
const canavarlar = new Map<number, NpcBilgisi & { x: number; z: number }>();
const isle = () => {
  for (const k of o.kayit) {
    if (k.opcode === WIZ.NPC_LISTESI) for (const n of npcListesi(bayt(k.hex)).npcler) if (n.tur === 1) canavarlar.set(n.id, { ...n });
    if (k.opcode === WIZ.NPC_HAREKET) { const h = npcHareket(bayt(k.hex)); const c = canavarlar.get(h.id); if (c) { c.x = h.x; c.z = h.z; } }
  }
};
const p = (m: number) => Math.round(m * 10);
const isinlan = (x: number, z: number) => o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x)).u16(p(z)).u16(87).i16(0).u8(0).u16(p(x)).u16(p(z)).u16(87).baytlar());
o.asama = 'bolgeye_git';
isinlan(430, 217); // canavar bölgesi (Moradon dışı)
await bekle(2000); isle();
console.log(`çevrede ${canavarlar.size} canavar`);
if (!canavarlar.size) { console.log('canavar yok, çıkılıyor'); o.kapat(); process.exit(1); }
const yakin = () => [...canavarlar.values()].sort((a, b) => Math.hypot(a.x - A.benim.x, a.z - A.benim.z) - Math.hypot(b.x - A.benim.x, b.z - A.benim.z))[0];
const hedef = yakin();
console.log(`hedef: id ${hedef.id}, protoNo ${hedef.protoNo}, seviye ${hedef.seviye}, konum (${hedef.x}, ${hedef.z})`);


o.asama = 'hazirlik';
isinlan(hedef.x + 1.2, hedef.z);
await bekle(1200);
// Hedef seçme (canavar bilgisi): u16 id, u8 yankı
o.asama = 'hedef_sec';
o.gonder(WIZ.HEDEF_CAN, new PaketYazici().u16(hedef.id).u8(1).baytlar());
await bekle(800);

for (let i = 1; i <= Number(process.env.KO_SALDIRI ?? 25) && !o.kapandi; i++) {
  isle();
  const c = canavarlar.get(hedef.id)!;
  if (Math.hypot(c.x - (A.benim.x), c.z - A.benim.z) > 0) { /* konum takibi için aşağıda yeniden taşınıyoruz */ }
  isinlan(c.x + 1.0, c.z); await bekle(150);
  o.asama = `saldiri_${i}`;
  // WIZ_ATTACK: u8 tür (1), u8 sonuç (0), i16 hedef, i16 gecikme, i16 mesafe, u8 bilinmeyen
  o.gonder(WIZ.SALDIRI, new PaketYazici().u8(1).u8(0).i16(hedef.id).i16(3000).i16(10).u8(0).baytlar());
  await bekle(1100);
  const bu = o.kayit.filter((k) => k.asama === o.asama);
  const olu = bu.some((k) => k.opcode === WIZ.OLUM && hex(bayt(k.hex)).startsWith(hedef.id.toString(16).padStart(4, '0').replace(/(..)(..)/, '$2$1')));
  console.log(`saldırı ${i}: ${bu.map((k) => `0x${k.opcode.toString(16)}`).join(' ') || '(cevap yok)'}`);
  if (olu) { console.log('hedef öldü'); break; }
}
await bekle(2500);

const ozet: Record<string, number> = {};
for (const k of o.kayit.filter((k) => k.asama === 'hedef_sec' || k.asama.startsWith('saldiri_'))) { const a = `0x${k.opcode.toString(16)}`; ozet[a] = (ozet[a] ?? 0) + 1; }
console.log('\nSavaş sırasında gelen paketler:', JSON.stringify(ozet));
console.log('Bağlantı açık mı:', !o.kapandi);
const hedefDosya = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', (process.env.KO_CIKTI ?? 'myko-savas.json'));
fs.writeFileSync(hedefDosya, JSON.stringify({
  aciklama: 'Lilith (seviye 65) bir canavara saldirirken gelen paketler (Myko, 2026-11-16). hedefId/protoNo: saldirilan canavar.',
  hedefId: hedef.id, protoNo: hedef.protoNo, lilithSoketNo: A.benim.soketNo,
  paketler: o.kayit.filter((k) => k.asama === 'hedef_sec' || k.asama.startsWith('saldiri_')),
}, null, 1));
console.log('kaydedildi:', hedefDosya);
o.kapat();
setTimeout(() => process.exit(0), 300);
