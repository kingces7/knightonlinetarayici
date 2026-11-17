// PvP deneme robotu: gerçek bir oyuncu karakteri (kotest1 hesabı, PvPRobot; Karus savaşçı, 1501 can, 600 savunma) Moradon'da durur ve oyuncuların saldırısını bekler.
// Kukla değildir: sunucuya normal oyuncu gibi bağlıdır; ölünce kendiliğinden yeniden doğar, bağlantı koparsa yeniden girer.
//   node src/pvp-robotu.ts [x] [z]      (varsayılan 272, 300: oyuncunun doğduğu noktanın yanı). Durdurmak: kopru/pvp-robotu-durdur.ps1
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { olum, yenidenDogusIstegi } from '../protokol/savas.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const X = Number(process.argv[2] ?? 272), Z = Number(process.argv[3] ?? 300);
const HESAP = process.env.ROBOT_HESAP ?? 'kotest1', SIFRE = process.env.ROBOT_SIFRE ?? 'kotest1', KARAKTER = process.env.ROBOT_KARAKTER ?? 'PvPRobot';
const p = (m: number) => Math.round(m * 10);
/** Konuma "durağan" hareket paketiyle yerleşir (varış = şimdiki konum). */
const yerlesti = (o: { gonder: (op: number, g?: Uint8Array) => void }) => o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(X)).u16(p(Z)).u16(87).i16(0).u8(0).u16(p(X)).u16(p(Z)).u16(87).baytlar());

async function oturum(): Promise<void> {
  const B = await girisYap('pvp-robot', HESAP, SIFRE, undefined, KARAKTER);
  yerlesti(B.o);
  console.log(`[${new Date().toLocaleTimeString()}] ${B.benim.ad} hazır: soket ${B.benim.soketNo}, Moradon (${X}, ${Z}), can ${B.benim.azamiCan}, savunma ${B.benim.toplamSavunma}`);
  let i = 0, sonYerlesme = Date.now();
  while (!B.o.kapandi) {
    while (i < B.o.kayit.length) {
      const k = B.o.kayit[i++];
      if (k.opcode === WIZ.OLUM) { const id = olum(Uint8Array.from(Buffer.from(k.hex, 'hex'))).id; if (id === B.benim.soketNo) { console.log(`[${new Date().toLocaleTimeString()}] öldü: 4 sn sonra yeniden doğacak`); await bekle(4000); B.o.gonder(WIZ.YENIDEN_DOGUS, yenidenDogusIstegi()); await bekle(1500); yerlesti(B.o); } }
    }
    if (Date.now() - sonYerlesme > 20000) { yerlesti(B.o); sonYerlesme = Date.now(); } // konumu zaman zaman tazele (bağlantıyı canlı tutar)
    await bekle(300);
  }
  throw new Error('bağlantı koptu');
}

for (;;) {
  try { await oturum(); } catch (e) { console.log(`[${new Date().toLocaleTimeString()}] ${(e as Error).message}; 8 sn sonra yeniden denenecek`); await bekle(8000); }
}
