import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from './crc32.ts';
import { JvSifre, OZEL_ANAHTAR } from './jvSifre.ts';
import { PaketOkuyucu, PaketYazici } from './ikili.ts';
import { CerceveHatasi, PaketKanali, cerceveYap } from './kanal.ts';

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join(' ');
const bayt = (...d: number[]) => Uint8Array.from(d);

test('crc32: standart CRC32 ile uyumlu (son terslemesiz çıkar)', () => {
  const v = new TextEncoder().encode('123456789');
  assert.equal((crc32(v) ^ 0xffffffff) >>> 0, 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0xffffffff); // boş veri: başlangıç değeri aynen döner
});

test('JvSifre: elle hesaplanmış vektörler (anahtar 0 olunca yalnızca rkey/lkey etkili)', () => {
  // açık anahtar = özel anahtar -> tkey = 0. Bir bayt: lkey = 157 (0x9D), rsk = 2157>>8 = 8 -> 0x08^0x9D = 0x95
  const s = new JvSifre(OZEL_ANAHTAR);
  assert.equal(hex(s.donustur(bayt(0))), '95');
  // iki bayt: lkey = 314&255 = 0x3A; rsk0 = 8; rkey1 = 2157*2171 = 4682847 -> rsk1 = 0x74
  assert.equal(hex(s.donustur(bayt(0, 0))), '32 4e');
  // tkey = 0x0102030405060708 (little-endian 08 07 ..): bir baytta ek olarak ^0x08
  const s2 = new JvSifre(OZEL_ANAHTAR ^ 0x0102030405060708n);
  assert.equal(hex(s2.donustur(bayt(0))), '9d');
});

test('JvSifre: aynı işlem şifreler ve çözer; 32 bit taşma uzun veride bile tutarlı', () => {
  const s = new JvSifre(0x1122334455667788n);
  const veri = Uint8Array.from({ length: 3000 }, (_, i) => (i * 31 + 7) & 0xff);
  const sifreli = s.donustur(veri);
  assert.notDeepEqual(sifreli, veri);
  assert.deepEqual(s.donustur(sifreli), veri);
});

test('JvSifre: açık anahtar 0 reddedilir (sunucu 0 verirse düz metin konuşulur)', () => {
  assert.throws(() => new JvSifre(0n));
});

test('PaketYazici/PaketOkuyucu: sayılar, 64 bit, yazılar (1 ve 2 baytlık uzunluk), ANSI', () => {
  const y = new PaketYazici().u8(255).i8(-2).u16(0xbeef).i16(-300).u32(0xdeadbeef).i32(-70000).u64(0x0102030405060708n).f32(1.5)
    .yazi('admin').yazi('Çınar', true);
  const o = new PaketOkuyucu(y.baytlar());
  assert.equal(o.u8(), 255); assert.equal(o.i8(), -2); assert.equal(o.u16(), 0xbeef); assert.equal(o.i16(), -300);
  assert.equal(o.u32(), 0xdeadbeef); assert.equal(o.i32(), -70000); assert.equal(o.u64(), 0x0102030405060708n); assert.equal(o.f32(), 1.5);
  assert.equal(o.yazi(), 'admin'); assert.equal(o.yazi(true), 'Çınar'.replace('ı', '?')); // 'ı' Windows-1252'de yok -> '?'
  assert.equal(o.kalan, 0);
  // bayt düzeni: little-endian, yazı uzunluğu önde
  assert.equal(hex(new PaketYazici().u16(0x1234).yazi('ab').baytlar()), '34 12 02 61 62');
  assert.equal(hex(new PaketYazici().yazi('ab', true).baytlar()), '02 00 61 62');
});

test('PaketOkuyucu: yetmeyen veride hata verir (sessizce 0 dönmez)', () => {
  assert.throws(() => new PaketOkuyucu(bayt(1)).u16(), RangeError);
  assert.throws(() => new PaketOkuyucu(bayt(5, 65)).yazi(), RangeError);
});

test('cerceveYap: AA 55 | uzunluk | veri | 55 AA', () => {
  assert.equal(hex(cerceveYap(bayt(0x01, 0xab))), 'aa 55 02 00 01 ab 55 aa');
  assert.throws(() => cerceveYap(new Uint8Array(0)), CerceveHatasi);
});

test('PaketKanali (düz): paket yap/al, parçalı ve birleşik gelen akış', () => {
  const k = new PaketKanali();
  const a = k.paketYap(0x2b, bayt(1, 2, 3));
  const b = k.paketYap(0x01);
  assert.equal(hex(a), 'aa 55 04 00 2b 01 02 03 55 aa');
  const hepsi = new Uint8Array([...a, ...b]);
  const al = new PaketKanali();
  // 1 baytlık parçalarla: tam iki paket çıkmalı
  const cikan = [];
  for (const x of hepsi) cikan.push(...al.al(bayt(x)));
  assert.equal(cikan.length, 2);
  assert.equal(cikan[0].opcode, 0x2b); assert.equal(hex(cikan[0].govde), '01 02 03');
  assert.equal(cikan[1].opcode, 0x01); assert.equal(cikan[1].govde.length, 0);
  // tek seferde ikisi
  assert.equal(new PaketKanali().al(hepsi).length, 2);
});

test('PaketKanali: bozuk başlık/son işaret/boş paket hata verir', () => {
  assert.throws(() => new PaketKanali().al(bayt(1, 2, 3, 4, 5, 6)), CerceveHatasi);
  assert.throws(() => new PaketKanali().al(bayt(0xaa, 0x55, 1, 0, 9, 0x00, 0x00)), CerceveHatasi);
  assert.throws(() => new PaketKanali().al(bayt(0xaa, 0x55, 0, 0, 0x55, 0xaa)), CerceveHatasi);
});

test('PaketKanali (şifreli): client→sunucu paketi sunucunun doğrulama kuralıyla çözülür (sıra no 1,2,… + CRC)', () => {
  const acik = 0x0badc0de12345678n;
  const k = new PaketKanali();
  k.sifrelemeyiAc(acik);
  const sunucuSifre = new JvSifre(acik);
  for (const sira of [1, 2, 3]) {
    const g = bayt(0x41, 0x42, sira);
    const yapilan = k.paketYap(0xf3, g);
    assert.equal(yapilan[0], 0xaa); assert.equal(yapilan[1], 0x55);
    const n = yapilan[2] | (yapilan[3] << 8);
    assert.equal(n, 4 + 1 + g.length + 4);
    // sunucunun KOSocket::DecryptPacket işlemi: çöz, CRC doğrula, sıra no doğrula
    const d = sunucuSifre.donustur(yapilan.subarray(4, 4 + n));
    const crcSon = new DataView(d.buffer).getUint32(n - 4, true);
    assert.equal(crc32(d.subarray(0, n - 4)), crcSon, 'CRC32');
    assert.equal(new DataView(d.buffer).getUint32(0, true), sira, 'sıra no');
    assert.equal(d[4], 0xf3);
    assert.deepEqual(d.slice(5, n - 4), g);
  }
});

test('PaketKanali (şifreli): sunucu→client paketi (FC 1E başlığı, CRC yok) çözülür; yanlış anahtar reddedilir', () => {
  const acik = 0x1357924680abcdefn;
  const sunucuSifre = new JvSifre(acik);
  const icerik = bayt(0xfc, 0x1e, 0, 0, 0, 0xf3, 7, 8, 9); // başlık(5) + opcode + gövde
  const kare = cerceveYap(sunucuSifre.donustur(icerik));
  const k = new PaketKanali();
  k.sifrelemeyiAc(acik);
  const [p] = k.al(kare);
  assert.equal(p.opcode, 0xf3); assert.equal(hex(p.govde), '07 08 09');
  const yanlis = new PaketKanali(); yanlis.sifrelemeyiAc(acik ^ 1n);
  assert.throws(() => yanlis.al(kare), CerceveHatasi);
});

// ---------- LZF ve sıkıştırılmış paket ----------
import { lzfAc, lzfDuzSar, LzfHatasi } from './lzf.ts';
const hexBayt = (s: string) => Uint8Array.from(s.split(' ').map((x) => parseInt(x, 16)));

test('LZF: düz bölüm ve geri başvuru (elle kurulmuş vektör: "ab" + 6 bayt kopya = "abababab")', () => {
  assert.equal(new TextDecoder().decode(lzfAc(hexBayt('01 61 62 80 01'), 8)), 'abababab');
  assert.deepEqual(lzfAc(lzfDuzSar(hexBayt('01 02 03')), 3), hexBayt('01 02 03'));
  const uzun = Uint8Array.from({ length: 100 }, (_, i) => i);
  assert.deepEqual(lzfAc(lzfDuzSar(uzun), 100), uzun);
  assert.throws(() => lzfAc(hexBayt('01 61 62 80 01'), 9), LzfHatasi); // uzunluk uyuşmuyor
  assert.throws(() => lzfAc(hexBayt('20 01'), 5), LzfHatasi); // çıktı başında geri başvuru
});

test('GERÇEK YAKALAMA: 1298 oyun sunucusunun sürüm kontrol cevabı (sıkıştırılmış, u16 başlıklı) çözülür', () => {
  // 127.0.0.1:15001'e WIZ_VERSION_CHECK (0x2B) gönderilince gelen ham baytlar (resmî 1298 sunucu .exe'si)
  const ham = hexBayt('aa 55 16 00 42 0d 00 0c 00 00 00 00 00 0b 2b 12 05 ae d6 6c e1 84 be 23 29 81 55 aa');
  const [p] = new PaketKanali().al(ham);
  assert.equal(p.opcode, 0x2b);
  const o = new PaketOkuyucu(p.govde);
  assert.equal(o.u16(), 1298);                  // oyun sunucusu sürümü
  assert.equal(o.u64(), 0x2923be84e16cd6aen);   // şifreleme için açık anahtar
  assert.equal(o.u8(), 0x81);
  assert.equal(o.kalan, 0);
});

test('sıkıştırılmış paket: Myko düzeni (u32 başlıklı) da çözülür', () => {
  const ic = Uint8Array.from([0x2b, 1, 2, 3, 4]);
  const veri = lzfDuzSar(ic);
  const govde = new PaketYazici().u32(veri.length).u32(ic.length).u32(0).ham(veri).baytlar();
  const kare = cerceveYap(Uint8Array.from([0x42, ...govde]));
  const [p] = new PaketKanali().al(kare);
  assert.equal(p.opcode, 0x2b); assert.deepEqual(p.govde, Uint8Array.from([1, 2, 3, 4]));
  // bozuk başlık
  assert.throws(() => new PaketKanali().al(cerceveYap(Uint8Array.from([0x42, 1, 2, 3]))), CerceveHatasi);
});

// ---------- GERÇEK YAKALAMA: resmî 1298 oyun sunucusu, klasik özel anahtar ----------
import { OZEL_ANAHTAR_KLASIK, OZEL_ANAHTAR_MYKO } from './jvSifre.ts';

test('JvSifre: iki özel anahtar da seçilebilir (açık = özel → tkey 0 → aynı elle vektör)', () => {
  assert.equal(hex(new JvSifre(OZEL_ANAHTAR_KLASIK, OZEL_ANAHTAR_KLASIK).donustur(bayt(0))), '95');
  assert.equal(hex(new JvSifre(OZEL_ANAHTAR_MYKO, OZEL_ANAHTAR_MYKO).donustur(bayt(0))), '95');
  assert.notEqual(hex(new JvSifre(0x1111n, OZEL_ANAHTAR_KLASIK).donustur(bayt(0, 0, 0))), hex(new JvSifre(0x1111n, OZEL_ANAHTAR_MYKO).donustur(bayt(0, 0, 0))));
});

test('GERÇEK YAKALAMA: sürüm cevabından anahtar alınır, klasik özel anahtarla şifreli giriş cevabı çözülür (opcode 1, sonuç 0 = başarılı)', () => {
  // 127.0.0.1:15001, resmî 1298 Ebenezer.exe; hesap admin/admin (2026-11-16 yakalaması)
  const surum = hexBayt('aa 55 16 00 42 0d 00 0c 00 00 00 00 00 0b 2b 12 05 8c c1 28 11 a5 6a 3b b1 87 55 aa');
  const giris = hexBayt('aa 55 07 00 65 d4 91 58 16 03 65 55 aa');
  const k = new PaketKanali();
  const [sp] = k.al(surum);
  const o = new PaketOkuyucu(sp.govde);
  assert.equal(o.u16(), 1298);
  const acik = o.u64();
  assert.equal(acik, 0xb13b6aa51128c18cn);
  k.sifrelemeyiAc(acik, OZEL_ANAHTAR_KLASIK);
  const [gp] = k.al(giris);
  assert.equal(gp.opcode, 0x01); assert.deepEqual(gp.govde, bayt(0));
  // yanlış özel anahtarla aynı baytlar çözülemez
  const yanlis = new PaketKanali(); yanlis.sifrelemeyiAc(acik, OZEL_ANAHTAR_MYKO);
  assert.throws(() => yanlis.al(giris), CerceveHatasi);
});
