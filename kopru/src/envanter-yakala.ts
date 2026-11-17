// Geliştirme aracı: eşya taşıma (WIZ_ITEM_MOVE 0x1F) isteklerini sunucuya yollar, cevapları kaydeder (protokol/ornekler/myko-envanter.json). Yalnız kotest ile.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const hesap = process.env.KO_HESAP, sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }
const A = await girisYap('oyuncu', hesap, sifre); const o = A.o;
const env = A.benim.envanter;
console.log('envanter (yuva:no x adet):', env.map((e, i) => (e.no ? `${i}:${e.no}x${e.adet}` : '')).filter(Boolean).join(' '));
const iste = async (ad: string, yon: number, no: number, src: number, dst: number) => {
  o.asama = ad; o.gonder(WIZ.ESYA_TASI, new PaketYazici().u8(1).u8(yon).u32(no).u8(src).u8(dst).baytlar()); await bekle(900);
  console.log(ad, o.kayit.filter((k) => k.asama === ad).map((k) => `0x${k.opcode.toString(16)}:${k.hex}`).join(' ') || '(cevap yok)');
};
const giyili = env.findIndex((e, i) => i < 14 && e.no && i === 6); // sağ el
const bos = env.findIndex((e, i) => i >= 14 && !e.no);
const dolu = env.findIndex((e, i) => i >= 14 && e.no);
console.log({ giyili, bos, dolu });
if (giyili >= 0 && bos >= 0) { await iste('cikar', 2, env[giyili].no, giyili, bos - 14); await iste('giy', 1, env[giyili].no, bos - 14, giyili); }
if (dolu >= 0 && bos >= 0) { await iste('tasi', 3, env[dolu].no, dolu - 14, bos - 14); await iste('geri', 3, env[dolu].no, bos - 14, dolu - 14); }
await iste('hata', 3, 123456789, 0, 1);
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', 'myko-envanter.json'), JSON.stringify({ aciklama: 'Seviye 3 savasci esya cikarma/giyme/tasima (Myko GameServer, 0x1F)', kayit: o.kayit.filter((k) => [0x1f, 0x54, 0x4b, 0x3d].includes(k.opcode)) }, null, 1));
o.kapat(); setTimeout(() => process.exit(0), 300);
