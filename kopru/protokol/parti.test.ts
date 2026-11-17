import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partiDavetiIstegi, partiDavetCevabi, partiPaketi } from './parti.ts';
import { PaketYazici } from './ikili.ts';

test('davet isteği: kaynaktaki örnek paketle aynı (01 0D00 <ad> FF)', () => {
  const b = partiDavetiIstegi('HumanMagecian', false);
  assert.deepEqual([...b.slice(0, 3)], [1, 13, 0]);
  assert.equal(new TextDecoder().decode(b.slice(3, 16)), 'HumanMagecian');
  assert.equal(b[16], 0xff);
  assert.equal(partiDavetiIstegi('A', true)[0], 3); // zaten liderse: PARTY_INSERT
});

test('davet cevabı: kabul 02 01, ret 02 00', () => {
  assert.deepEqual([...partiDavetCevabi(true)], [2, 1]);
  assert.deepEqual([...partiDavetCevabi(false)], [2, 0]);
});

test('gelen paket: davet, hata kodu, başarılı üye', () => {
  const davet = partiPaketi(new PaketYazici().u8(2).u16(77).yazi('Leader').baytlar());
  assert.deepEqual(davet, { tur: 'davet', kimlik: 77, ad: 'Leader' });
  const hata = partiPaketi(new PaketYazici().u8(3).i16(-3).baytlar());
  assert.equal(hata.tur, 'hata');
  if (hata.tur === 'hata') { assert.equal(hata.kod, -3); assert.match(hata.metin, /other nation/); }
  assert.equal(partiPaketi(new PaketYazici().u8(3).u16(12).u8(1).baytlar()).tur, 'diger');
});

import { partiPaketi as pp } from './parti.ts';
const hex = (s: string) => Uint8Array.from(s.split(' ').map((x) => parseInt(x, 16)));
test('PARTY_INSERT: gerçek sunucu paketi (lider kotestkar)', () => {
  const p = pp(hex('03 01 00 01 09 00 6b 6f 74 65 73 74 6b 61 72 ae 10 68 0b 3c cd 00 9a 10 9a 10 02 00 ff ff ff ff'));
  assert.deepEqual(p, { tur: 'uye', uye: { id: 1, ad: 'kotestkar', enCokCan: 4270, can: 2920, seviye: 60, sinif: 205, enCokMana: 4250, mana: 4250, ulus: 2 } });
});
test('PARTY_HPCHANGE: gerçek sunucu paketi', () => {
  assert.deepEqual(pp(hex('06 02 00 d9 03 40 00 c5 03 7a 00')), { tur: 'can', id: 2, enCokCan: 985, can: 64, enCokMana: 965, mana: 122 });
});
test('parti hatası hâlâ hata olarak ayrılır', () => {
  assert.equal(pp(hex('03 fd ff')).tur, 'hata');
});
