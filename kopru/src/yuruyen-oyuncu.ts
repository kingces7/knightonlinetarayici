// Geliştirme aracı: "robot oyuncu" — test hesabıyla (kotest1/KoTest, normal oyuncu) girer, verilen noktaya taşınır ve sürekli bir kare çizerek yürür.
// Tarayıcıdaki oyuncunun başka bir oyuncuyu görmesini/yürürken izlemesini denemek için. Çalışan Myko sunucusu gerekir.
// Kullanım:  node src/yuruyen-oyuncu.ts <x> <z> <süre sn>      (hazır olunca "HAZIR" yazar)
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { HareketGonderici } from '../protokol/hareket.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const x0 = Number(process.argv[2] ?? 455), z0 = Number(process.argv[3] ?? 288), sure = Number(process.argv[4] ?? 40);
const B = await girisYap('robot', 'kotest1', 'kotest1', 'KoTest');
const p = (m: number) => Math.round(m * 10);
// Başlangıç konumuna taşı: "durdu" + varış = şimdiki konum (durağan paket)
B.o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x0)).u16(p(z0)).u16(87).i16(0).u8(0).u16(p(x0)).u16(p(z0)).u16(87).baytlar());
await bekle(1200);
console.log(`HAZIR: robot ${B.benim.ad} (soket ${B.benim.soketNo}) (${x0}, ${z0}) noktasında; ${sure} sn yürüyecek`);

const g = new HareketGonderici((govde) => B.o.gonder(WIZ.HAREKET, govde));
let x = x0, z = z0;
const dt = 1 / 30;
const yonler: Array<[number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]];
let yonNo = 0, adim = 0;
g.guncelle(x, z, 8.7, dt);
const bitis = Date.now() + sure * 1000;
while (Date.now() < bitis && !B.o.kapandi) {
  const [yx, yz] = yonler[yonNo];
  x += yx * 4.5 * dt; z += yz * 4.5 * dt; adim += 4.5 * dt;
  g.guncelle(x, z, 8.7, dt);
  if (adim >= 8) { adim = 0; yonNo = (yonNo + 1) % 4; } // 8 m'de bir köşe dön
  await bekle(33);
}
for (let i = 0; i < 12; i++) { g.guncelle(x, z, 8.7, dt); await bekle(33); } // dur
console.log(B.o.kapandi ? 'BAĞLANTI KOPTU' : 'bitti (bağlantı açık kaldı)');
B.o.kapat();
setTimeout(() => process.exit(0), 200);
