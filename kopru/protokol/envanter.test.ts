import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESYA_YONU, esyaTasimaCevabi, esyaTasimaIstegi } from './envanter.ts';

const bayt = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

test('taşıma isteği: 1 + yön + u32 eşya + kaynak + hedef (8 bayt)', () => {
  const b = esyaTasimaIstegi(ESYA_YONU.YUVADAN_CANTAYA, 120110001, 6, 3);
  assert.deepEqual([...b.slice(0, 2), ...b.slice(6)], [1, 2, 6, 3]); assert.equal(new DataView(b.buffer, b.byteOffset).getUint32(2, true), 120110001);
  assert.equal(b.length, 8);
});

test('gerçek sunucu: başarılı taşıma cevabı (özet) ve hata', () => {
  const c = esyaTasimaCevabi(bayt('010104004600e40c0000000047003300000000000000000000000000000000000000000000000000000000000000000000000000000000004b07000047003300'));
  assert.deepEqual(c, { basarili: true, hasar: 4, savunma: 70, azamiAgirlik: 3300, azamiCan: 71, azamiMana: 51, statEk: [0, 0, 0, 0, 0], can: 71, mana: 51 });
  assert.deepEqual(esyaTasimaCevabi(bayt('0100')), { basarili: false });
});

import { esyaSilmeCevabi, esyaSilmeIstegi } from './envanter.ts';
test('eşya silme: istek 6 bayt, cevap 1 = başarılı', () => {
  const b = esyaSilmeIstegi(false, 3, 389010000); assert.equal(b.length, 6); assert.deepEqual([...b.slice(0, 2)], [0, 3]);
  assert.equal(esyaSilmeCevabi(Uint8Array.of(1)), true); assert.equal(esyaSilmeCevabi(Uint8Array.of(0)), false);
});

import { esyaAdediDegisti } from './envanter.ts';
test('gerçek sunucu: ok atınca yığın adedi (200 → 199)', () => {
  assert.deepEqual(esyaAdediDegisti(bayt('01000101d0564e17c700000000a00f00000000000000000000')), [{ yuva: 1, no: 391010000, adet: 199 }]);
});

import { dayanimDegisti, esyaTamirIstegi, esyaTamirCevabi, tamirUcreti } from './envanter.ts';
test('dayanıklılık paketi, tamir isteği/cevabı ve ücret formülü', () => {
  assert.deepEqual(dayanimDegisti(bayt('06e803')), { yuva: 6, dayanim: 1000 });
  assert.deepEqual([...esyaTamirIstegi(1, 6, 0x2001, 120110000)], [1, 6, 0x01, 0x20, ...[...Buffer.from([0, 0, 0, 0])].map((_, i) => Buffer.alloc(4).fill(0) && (120110000 >> (8 * i)) & 255)]);
  assert.deepEqual(esyaTamirCevabi(bayt('01e8030000')), { basarili: true, altin: 1000 });
  assert.equal(tamirUcreti(1000, 8000, 8000), 0);
  assert.ok(tamirUcreti(1000, 8000, 4000) > 0);
});
