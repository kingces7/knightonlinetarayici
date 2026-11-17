import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beceriIstegi, beceriPaketi, manaDegisti, BECERI_KOMUTU } from './beceri.ts';

const bayt = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

test('skill isteği: komut, skill no, kullanan, hedef + 7 veri (toplam 21 bayt)', () => {
  const b = beceriIstegi(BECERI_KOMUTU.ETKI, 201001, 1, 8211);
  assert.equal(b.length, 1 + 4 + 2 + 2 + 14);
  assert.deepEqual([...b.slice(0, 9)], [3, 0x29, 0x11, 3, 0, 1, 0, 0x13, 0x20]);
});

test('sunucunun gerçek skill cevabı (myko-beceri.json): Stroke etkisi ve ret', () => {
  const etki = beceriPaketi(bayt('0329110300010013200000000000000000000000000000'));
  assert.deepEqual([etki.komut, etki.no, etki.kullanan, etki.hedef], [3, 201001, 1, 8211]);
  const ret = beceriPaketi(bayt('0429110300010013200000000000009aff000000000000'));
  assert.equal(ret.komut, BECERI_KOMUTU.BASARISIZ); assert.equal(ret.veri[3], -102); // ret kodu veri[3]: -102 = combo bitti (bekleme dolmadan ikinci kullanım)
  assert.equal(beceriPaketi(bayt('042a1103000100010000000000000099ff000000000000')).veri[3], -103); // Sprint reddi (-103)
});

test('mana: 18 00 16 00 = azami 24, mana 22', () => assert.deepEqual(manaDegisti(bayt('18001600')), { enCok: 24, mana: 22 }));
