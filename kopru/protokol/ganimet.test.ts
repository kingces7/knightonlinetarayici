import { test } from 'node:test';
import assert from 'node:assert/strict';
import { almaCevabi, esyaAlmaIstegi, kutuAcmaIstegi, kutuIcerigi, ALTIN_NO } from './ganimet.ts';
import { esyaDustu } from './savas.ts';

const bayt = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

test('gerçek sunucu: ganimet düştü (0x23)', () => {
  assert.deepEqual(esyaDustu(bayt('c120100000000c')), { canavarId: 0x20c1, torbaNo: 16 });
});

test('gerçek sunucu: kutu içeriği (0x24) = 8 Noah + 1 eşya', () => {
  const k = kutuIcerigi(bayt('100000000100e9a4350800c99e8e0f0100' + '0'.repeat(6 * 6 * 2)));
  assert.equal(k.torbaNo, 16); assert.equal(k.dolu, true);
  assert.deepEqual(k.yuvalar, [{ yuva: 0, no: ALTIN_NO, adet: 8 }, { yuva: 1, no: 261005001, adet: 1 }]);
});

test('gerçek sunucu: altın ve eşya alma cevabı (0x26)', () => {
  const altin = almaCevabi(bayt('0110000000ff00e9a435080058c300000000'));
  assert.deepEqual(altin, { kod: 1, torbaNo: 16, cantaYuvasi: -1, no: ALTIN_NO, adet: 8, altin: 50008, kutuYuvasi: 0 });
  const esya = almaCevabi(bayt('011000000000c99e8e0f010058c300000100'));
  assert.deepEqual(esya, { kod: 1, torbaNo: 16, cantaYuvasi: 0, no: 261005001, adet: 1, altin: 50008, kutuYuvasi: 1 });
  assert.deepEqual(almaCevabi(bayt('06')), { kod: 6 });
});

test('istekler: kutu açma 4 bayt, alma 10 bayt', () => {
  assert.deepEqual([...kutuAcmaIstegi(16)], [16, 0, 0, 0]);
  assert.deepEqual([...esyaAlmaIstegi(16, ALTIN_NO, 0)], [16, 0, 0, 0, 0x00, 0xe9, 0xa4, 0x35, 0, 0]);
});
