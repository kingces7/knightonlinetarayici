// Gerçek Myko sunucusundan yakalanan paketlerle (ornekler/myko-oyuna-giris.json) çözümleyici testleri.
// Beklenen değerler veritabanındaki (USERDATA) karakter satırıyla karşılaştırıldı (2026-11-16): seviye 65, deneyim 264885133, altın 2087207, …
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GIRIS_CIKIS, ENVANTER_TOPLAM, benimBilgim, karakterListesi, karakterSecCevabi, oyunGirisCevabi, oyunHavasi, oyunSaati } from './paketler.ts';

const klasor = path.dirname(fileURLToPath(import.meta.url));
const ornek = JSON.parse(fs.readFileSync(path.join(klasor, 'ornekler', 'myko-oyuna-giris.json'), 'utf8')) as { paketler: Array<{ asama: string; opcode: number; hex: string }> };
const bayt = (h: string) => Uint8Array.from(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const al = (opcode: number, asama?: string) => {
  const p = ornek.paketler.find((x) => x.opcode === opcode && (!asama || x.asama === asama));
  assert.ok(p, `örnekte 0x${opcode.toString(16)} yok`);
  return bayt(p.hex);
};

test('oyun girişi cevabı: ulus kodu (2 = El Morad)', () => {
  assert.deepEqual(oyunGirisCevabi(al(0x01)), { basarili: true, ulus: 2 });
  assert.deepEqual(oyunGirisCevabi(Uint8Array.of(0xff)), { basarili: false, ulus: -1 });
});

test('karakter listesi: 4 yuva, ilkinde Lilith; paket tamamen tüketilir', () => {
  const { yuvalar, kalan } = karakterListesi(al(0x0c));
  assert.equal(kalan, 0);
  assert.equal(yuvalar.length, 4);
  assert.deepEqual({ ad: yuvalar[0].ad, irk: yuvalar[0].irk, sinif: yuvalar[0].sinif, seviye: yuvalar[0].seviye, yuz: yuvalar[0].yuz, sac: yuvalar[0].sac, bolge: yuvalar[0].bolge },
    { ad: 'Lilith', irk: 13, sinif: 206, seviye: 65, yuz: 6, sac: 85852415, bolge: 21 });
  assert.equal(yuvalar[0].esyalar.length, 8);
  assert.deepEqual(yuvalar.slice(1).map((y) => y.ad), ['', '', '']);
});

test('karakter seçimi cevabı: Moradon (21), konum /10, ulus 2', () => {
  assert.deepEqual(karakterSecCevabi(al(0x04)), { basarili: true, kod: 1, bolge: 21, x: 453.3, z: 285, y: 8.7, ulus: 2 });
  assert.deepEqual(karakterSecCevabi(Uint8Array.of(3)), { basarili: false, kod: 3 });
});

test('WIZ_MYINFO: gerçek paket 1596 bayttır ve tam tüketilir; değerler veritabanıyla birebir', () => {
  const ham = al(0x0e);
  assert.equal(ham.length, 1596);
  const m = benimBilgim(ham);
  assert.equal(m.kalan, 0, 'paketin tamamı çözülmeli');
  assert.equal(m.ad, 'Lilith');
  assert.deepEqual([m.x, m.z, m.y], [453.3, 285, 8.7]);
  assert.deepEqual([m.ulus, m.irk, m.sinif, m.yuz, m.sac], [2, 13, 206, 6, 85852415]);
  assert.equal(m.seviye, 65);
  assert.equal(m.deneyim, 264885133n);
  assert.equal(m.azamiDeneyim, 505247349n);
  assert.equal(m.ulusPuani, 501);
  assert.equal(m.klanNo, 0);
  assert.deepEqual([m.can, m.azamiCan, m.mana, m.azamiMana], [4960, 4960, 4940, 4940]);
  assert.equal(m.altin, 2087207);
  assert.equal(m.bosPuan, 255);
  for (const k of ['str', 'sta', 'dex', 'int', 'cha'] as const) assert.equal(m.statlar[k].deger, 255, k);
  assert.equal(m.statlar.str.bonus, 120); // eşya bonusu
  assert.deepEqual(m.skillPuanlari.slice(5), [83, 83, 83, 21]); // veritabanında strSkill = "SSS" + …
  assert.equal(m.envanter.length, ENVANTER_TOPLAM);
  const dolu = m.envanter.map((e, i) => [i, e.no, e.adet] as const).filter(([, no]) => no !== 0);
  assert.deepEqual(dolu, [[1, 206003020, 1], [4, 206001020, 1], [6, 156210050, 1], [10, 206002020, 1], [12, 206004020, 1], [13, 206005020, 1]]);
  assert.deepEqual(m.premium, []);
});

test('WIZ_MYINFO: kısaltılmış paket hata verir (sessizce sıfır dönmez); klansız karakterde klan boştur', () => {
  assert.throws(() => benimBilgim(al(0x0e).subarray(0, 1000)), RangeError);
  assert.equal(benimBilgim(al(0x0e)).klan, null);
});

test('oyun saati ve hava', () => {
  assert.deepEqual(oyunSaati(al(0x13)), { yil: 2026, ay: 11, gun: 16, saat: 19, dakika: 39 });
  assert.deepEqual(oyunHavasi(al(0x14)), { tur: 1, miktar: 100 });
});

// ---------- canlı dünya: NPC/canavar paketleri (20 sn'lik gerçek yakalama: ornekler/myko-oyun-ici.json) ----------
import { npcGirisCikis, npcHareket, npcListesi } from './paketler.ts';
const canli = JSON.parse(fs.readFileSync(path.join(klasor, 'ornekler', 'myko-oyun-ici.json'), 'utf8')) as { paketler: Array<{ asama: string; opcode: number; hex: string }> };
const hepsi = (opcode: number) => canli.paketler.filter((p) => p.opcode === opcode).map((p) => bayt(p.hex));

test('NPC listesi (0x1D): gerçek paketler tamamen tüketilir; kayıtlar makul', () => {
  const paketler = hepsi(0x1d);
  assert.ok(paketler.length >= 2);
  let toplam = 0;
  for (const p of paketler) {
    const { npcler, kalan } = npcListesi(p);
    assert.equal(kalan, 0, 'paketin tamamı çözülmeli');
    toplam += npcler.length;
    for (const n of npcler) {
      assert.ok(n.tur === 1 || n.tur === 2, `tür ${n.tur}`);
      assert.ok(n.x > 0 && n.z > 0 && n.x < 2048 && n.z < 2048, `konum ${n.x},${n.z}`);
      assert.ok(n.seviye <= 83 && n.boyut > 0);
    }
  }
  assert.ok(toplam > 10, `toplam ${toplam}`);
  const ilk = npcListesi(paketler[0]).npcler[0];
  assert.deepEqual([ilk.id, ilk.protoNo, ilk.tur, ilk.resimNo], [0x1fa0, 0x2f3, 1, 700]); // ham: a0 1f | f3 02 | 01 | bc 02
});

test('NPC giriş/çıkış (0x0A): giriş kaydı tam çözülür, çıkış yalnızca kimlik taşır', () => {
  const paketler = hepsi(0x0a);
  const girisler = paketler.map((p) => npcGirisCikis(p));
  assert.ok(girisler.some((g) => g.tur === GIRIS_CIKIS.GIRIS) && girisler.some((g) => g.tur === GIRIS_CIKIS.CIKIS));
  for (const g of girisler) {
    assert.equal(g.kalan, 0);
    if (g.tur === GIRIS_CIKIS.CIKIS) assert.equal(g.npc, null); else assert.ok(g.npc && g.npc.id === g.id);
  }
  const ilkGiris = girisler.find((g) => g.tur === GIRIS_CIKIS.GIRIS)!;
  assert.deepEqual([ilkGiris.npc!.protoNo, ilkGiris.npc!.tur, ilkGiris.npc!.resimNo, ilkGiris.npc!.seviye, ilkGiris.npc!.x, ilkGiris.npc!.z], [0x2f2, 1, 700, 6, 385, 223]);
});

test('NPC hareketi (0x0B): 130 gerçek paket; ilki (430, 217), hız 2,7 m/sn', () => {
  const paketler = hepsi(0x0b);
  assert.ok(paketler.length > 100);
  for (const p of paketler) assert.equal(npcHareket(p).kalan, 0);
  const h = npcHareket(paketler[0]);
  assert.deepEqual({ id: h.id, x: h.x, z: h.z, y: h.y, hiz: h.hiz }, { id: 0x1fa0, x: 430, z: 217, y: 0, hiz: 2.7 });
});

// ---------- diğer oyuncular (iki oyunculu gerçek yakalama: ornekler/myko-iki-oyuncu.json) ----------
import { kullaniciHareketi, kullaniciListesi } from './paketler.ts';
const iki = JSON.parse(fs.readFileSync(path.join(klasor, 'ornekler', 'myko-iki-oyuncu.json'), 'utf8')) as {
  kotestBenimBilgim: string; kotestSoketNo: number; lilithSoketNo: number; paketler: Array<{ asama: string; opcode: number; hex: string }>;
};

test('oyuncu listesi (0x16): izleyici Lilith, bölgedeki KoTest\'i görür; kayıt tamamen tüketilir', () => {
  const dolu = iki.paketler.filter((p) => p.opcode === 0x16).map((p) => kullaniciListesi(bayt(p.hex))).find((r) => r.oyuncular.length > 0);
  assert.ok(dolu, 'KoTest\'li liste yok');
  assert.equal(dolu.kalan, 0);
  const k = dolu.oyuncular[0];
  assert.deepEqual([k.id, k.ad, k.ulus, k.irk, k.sinif, k.seviye, k.yetki], [iki.kotestSoketNo, 'KoTest', 2, 12, 201, 1, 1]);
  assert.deepEqual([k.klanNo, k.klan?.ad, k.fame], [15001, 'Human', 5]); // yeni karakter otomatik klana katılır
  assert.ok(k.x > 400 && k.x < 520 && k.z > 250 && k.z < 320, `konum ${k.x},${k.z}`);
  assert.equal(k.esyalar.govde.no, 201001001); assert.equal(k.esyalar.sagEl.no, 120110001); assert.equal(k.esyalar.omuz.no, 0);
  assert.equal(k.bolge, 21);
});

test('başka oyuncunun hareketi (0x06): yankı sırası 1, 3, 3, 0; hız 4,5 m/sn; 3 sn\'de ~13,5 m ilerler', () => {
  const hareketler = iki.paketler.filter((p) => p.asama === 'B_yuruyor' && p.opcode === 0x06).map((p) => kullaniciHareketi(bayt(p.hex)));
  assert.deepEqual(hareketler.map((h) => h.yanki), [1, 3, 3, 0]);
  for (const h of hareketler) { assert.equal(h.kalan, 0); assert.equal(h.id, iki.kotestSoketNo); }
  assert.equal(hareketler[0].hiz, 4.5); assert.equal(hareketler.at(-1)!.hiz, 0);
  const ilerleme = hareketler.at(-1)!.x - 455;
  assert.ok(ilerleme > 12 && ilerleme < 15, `ilerleme ${ilerleme}`);
});

test('KoTest\'in kendi WIZ_MYINFO paketi (klan üyesi): klan bloğu çözülür, paket tamamen tüketilir', () => {
  const m = benimBilgim(bayt(iki.kotestBenimBilgim));
  assert.equal(m.kalan, 0);
  assert.deepEqual([m.ad, m.seviye, m.irk, m.sinif, m.altin, m.yetki], ['KoTest', 1, 12, 201, 50000, 1]);
  assert.deepEqual([m.klanNo, m.klan?.ad], [15001, 'Human']);
});
