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
