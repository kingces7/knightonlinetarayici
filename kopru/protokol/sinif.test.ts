import { test } from 'node:test';
import assert from 'node:assert/strict';
import { altinDegisti, sinifDegisti } from './sinif.ts';

test('terfi (gerçek sunucu örneği 06 cd00 0200): El Morad novice savaşçı 205, kimlik 2', () => {
  assert.deepEqual(sinifDegisti(Uint8Array.from([6, 0xcd, 0, 2, 0])), { alt: 6, sinif: 205, id: 2 });
});
test('Noah değişimi (örnek 02 b80b0000 edab0000): 3000 harcandı, kalan 44013', () => {
  assert.deepEqual(altinDegisti(Uint8Array.from([2, 0xb8, 0x0b, 0, 0, 0xed, 0xab, 0, 0])), { tur: 2, degisim: 3000, toplam: 44013 });
});
