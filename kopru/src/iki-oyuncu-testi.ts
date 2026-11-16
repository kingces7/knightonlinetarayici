// Geliştirme aracı: İKİ oyuncuyla canlı dünya testi (docs/protokol.md §14). Çalışan Myko sunucusuna doğrudan TCP ile bağlanır.
//   Gözlemci (kotest1) önce girer ve Lilith'in yanına taşınır; sonra Lilith girip yürür.
//   Doğrulanan: (1) hareket paketlerimiz sunucuca kabul edilir (atılmayız, şehre geri gönderilmeyiz),
//               (2) gözlemci Lilith'in giriş (0x07) ve hareket (0x06) paketlerini alır.
// Gerçek paketler kopru/protokol/ornekler/myko-iki-oyuncu.json dosyasına kaydedilir (testlerde kullanılır).
// Kullanım:  KO_HESAP=<Lilith'in hesabı> KO_SIFRE=... node src/iki-oyuncu-testi.ts   (gözlemci hesabı kotest1/kotest1 kodda sabit, yerel test)
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketKanali, type Paket } from '../protokol/kanal.ts';
import { PaketOkuyucu, PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { HareketGonderici } from '../protokol/hareket.ts';
import { benimBilgim, karakterListesi, karakterSecCevabi, oyunGirisCevabi } from '../protokol/paketler.ts';

import { Oyun, bekle, girisYap, tumOyunlar } from './oyunBaglantisi.ts';
void tumOyunlar;

const hesapA = process.env.KO_HESAP, sifreA = process.env.KO_SIFRE;
if (!hesapA || !sifreA) { console.log('KO_HESAP ve KO_SIFRE gerekli'); process.exit(1); }

// Roller: Lilith bir GM'dir (yetki 0) ve sunucu GM'leri görünmez yapar; bu yüzden hareket eden KoTest (normal oyuncu, B),
// izleyen Lilith (A). B önce girer ve Lilith'in doğacağı yere taşınır; sonra A girer; sonra B yürür.
console.log('1) KoTest (yürüyecek, normal oyuncu) giriyor…');
const B = await girisYap('B', 'kotest1', 'kotest1', 'KoTest');
console.log(`   B: ${B.benim.ad} soket ${B.benim.soketNo}, konum (${B.benim.x}, ${B.benim.z}), bölge ${B.sec.bolge}, klan ${B.benim.klan ? B.benim.klan.ad : '-'}, yetki ${B.benim.yetki}`);

// B'yi Lilith'in yanına taşı: "durdu" + varış = şimdiki konum (durağan paket; sunucu konumu buna ayarlar)
const hedefX = 455, hedefZ = 288;
const p = (m: number) => Math.round(m * 10);
B.o.asama = 'B_tasi';
B.o.gonder(WIZ.HAREKET, new PaketYazici().u16(p(hedefX)).u16(p(hedefZ)).u16(87).i16(0).u8(0).u16(p(hedefX)).u16(p(hedefZ)).u16(87).baytlar());
await bekle(1000);
if (B.o.kapandi) throw new Error('B bağlantısı koptu (taşıma sonrası)');

console.log('2) Lilith (izleyici, GM) giriyor…');
const A = await girisYap('A', hesapA, sifreA);
console.log(`   A: ${A.benim.ad} soket ${A.benim.soketNo}, konum (${A.benim.x}, ${A.benim.z}), yetki ${A.benim.yetki} (0 = GM)`);
await bekle(1000);

console.log('3) KoTest yürüyor (3 sn gerçek zamanlı) ve duruyor…');
A.o.asama = 'B_yuruyor';
const gonderilen: number[] = [];
const g = new HareketGonderici((govde, yanki) => { gonderilen.push(yanki); B.o.gonder(WIZ.HAREKET, govde); });
let x = hedefX, z = hedefZ;
const dt = 1 / 30;
g.guncelle(x, z, 8.7, dt);
for (let i = 0; i < 90; i++) { x += 4.5 * dt; g.guncelle(x, z, 8.7, dt); await bekle(33); }
for (let i = 0; i < 15; i++) { g.guncelle(x, z, 8.7, dt); await bekle(33); } // dur
await bekle(1200);

const aGitti = A.o.kapandi, bGitti = B.o.kapandi;
const ham = (h: string) => Uint8Array.from(h.match(/../g)!.map((v) => parseInt(v, 16)));
const gozlenen = A.o.kayit.filter((k) => k.asama === 'B_yuruyor' && k.opcode === WIZ.HAREKET).map((k) => { const r = new PaketOkuyucu(ham(k.hex)); return { id: r.u16(), vx: r.u16() / 10, vz: r.u16() / 10, vy: r.u16() / 10, hiz: r.i16(), yanki: r.u8() }; });
const kullaniciPaketleri = A.o.kayit.filter((k) => k.opcode === WIZ.KULLANICI_GIRIS_CIKIS || k.opcode === WIZ.KULLANICI_LISTESI);
console.log('\n--- SONUÇ');
const ozet: Record<string, number> = {};
for (const k of A.o.kayit) { const a = `${k.asama}:0x${k.opcode.toString(16)}`; ozet[a] = (ozet[a] ?? 0) + 1; }
console.log('Lilith\'in (izleyici) aldığı paketler (aşama:opcode → adet):', JSON.stringify(ozet));
console.log(`KoTest'in gönderdiği hareket paketleri: ${gonderilen.join(',')}`);
console.log(`Lilith'in aldığı KoTest hareketleri (0x06): ${gozlenen.length} adet, yankılar: ${gozlenen.map((v) => v.yanki).join(',')}`);
if (gozlenen[0]) console.log(`  ilk: soket ${gozlenen[0].id}, varış (${gozlenen[0].vx}, ${gozlenen[0].vz}), hız ${gozlenen[0].hiz}; son: (${gozlenen.at(-1)!.vx}, ${gozlenen.at(-1)!.vz})`);
console.log(`Lilith'in aldığı kullanıcı paketleri (0x07/0x16): ${kullaniciPaketleri.map((k) => `${k.asama}:0x${k.opcode.toString(16)}(${k.hex.length / 2}b)`).join(' ')}`);
console.log(`Bağlantılar açık mı: KoTest ${!bGitti}, Lilith ${!aGitti}`);

const hedef = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', 'myko-iki-oyuncu.json');
fs.mkdirSync(path.dirname(hedef), { recursive: true });
const bBenim = B.o.kayit.find((k) => k.opcode === WIZ.BENIM_BILGIM)?.hex;
fs.writeFileSync(hedef, JSON.stringify({
  aciklama: 'Izleyici (Lilith, GM) gozunden: KoTest (normal oyuncu) giris yapip yururken gelen paketler (2026-11-16). kotestBenimBilgim = KoTest\'in kendi WIZ_MYINFO paketi (klan uyesi).',
  kotestBenimBilgim: bBenim, kotestSoketNo: B.benim.soketNo, lilithSoketNo: A.benim.soketNo,
  paketler: A.o.kayit.filter((k) => k.asama === 'oyun_baslat_1' || k.asama === 'oyun_baslat_2' || k.asama === 'B_yuruyor'),
}, null, 1));
console.log(`kaydedildi: ${hedef}`);
A.o.kapat(); B.o.kapat();
setTimeout(() => process.exit(0), 300);
