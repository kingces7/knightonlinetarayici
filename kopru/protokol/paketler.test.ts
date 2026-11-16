// Gerçek Myko sunucusundan yakalanan paketlerle (ornekler/myko-oyuna-giris.json) çözümleyici testleri.
// Beklenen değerler veritabanındaki (USERDATA) karakter satırıyla karşılaştırıldı (2026-11-16): seviye 65, deneyim 264885133, altın 2087207, …
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ENVANTER_TOPLAM, benimBilgim, karakterListesi, karakterSecCevabi, oyunGirisCevabi, oyunHavasi, oyunSaati } from './paketler.ts';

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

test('WIZ_MYINFO: kısaltılmış paket hata verir (sessizce sıfır dönmez); klan üyesi henüz desteklenmiyor', () => {
  assert.throws(() => benimBilgim(al(0x0e).subarray(0, 1000)), RangeError);
  const klanli = Uint8Array.from(al(0x0e));
  klanli[1 + 1 + 1 + 6 + 6 + 1 + 1 + 2 + 1 + 4 + 1 + 1 + 1 + 1 + 1 + 2 + 8 + 8 + 4 + 4] = 5; // klan no'nun düşük baytı (konum hesabı: başlık alanlarının toplamı)
  assert.throws(() => benimBilgim(klanli), /Klan/);
});

test('oyun saati ve hava', () => {
  assert.deepEqual(oyunSaati(al(0x13)), { yil: 2026, ay: 11, gun: 16, saat: 19, dakika: 39 });
  assert.deepEqual(oyunHavasi(al(0x14)), { tur: 1, miktar: 100 });
});
