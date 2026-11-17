// Geçici: iyileştirme testi için hareketsiz robot oyuncu (kotest1); aldığı 0x31 ve 0x17 paketlerini yazar. Kullanım: client/scripts/iyilestirTesti.mjs
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { bekle, girisYap, hex } from './oyunBaglantisi.ts';
const x0 = Number(process.argv[2]), z0 = Number(process.argv[3]), sure = Number(process.argv[4] ?? 60);
const B = await girisYap('robot', 'kotest1', 'kotest1', 'KoTest');
const p = (m: number) => Math.round(m * 10);
B.o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x0)).u16(p(z0)).u16(87).i16(0).u8(0).u16(p(x0)).u16(p(z0)).u16(87).baytlar());
console.log(`HAZIR robot ${B.benim.ad} soket ${B.benim.soketNo}`);
const bitis = Date.now() + sure * 1000; let i = 0;
while (Date.now() < bitis && !B.o.kapandi) {
  while (i < B.o.kayit.length) { const k = B.o.kayit[i++]; if (k.opcode === 0x31 || k.opcode === 0x17) console.log('PAKET 0x' + k.opcode.toString(16), k.hex.slice(0, 60)); }
  await bekle(200);
}
B.o.kapat(); setTimeout(() => process.exit(0), 200);
