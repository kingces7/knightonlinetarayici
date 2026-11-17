import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOHBET_TURU, sohbetIstegi, sohbetPaketi } from './sohbet.ts';

const bayt = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

test('gerçek sunucu: genel ve bağırma sohbeti cevabı', () => {
  const g = sohbetPaketi(bayt('01020200096b6f746573746b61720a0048656c6c6f2074657374ff00'));
  assert.deepEqual(g, { tur: 1, ulus: 2, gonderenId: 2, gonderen: 'kotestkar', mesaj: 'Hello test', rutbe: -1, sistem: 0 });
  assert.equal(sohbetPaketi(bayt('05020200096b6f746573746b61720a0048656c6c6f2074657374ff00')).tur, SOHBET_TURU.BAGIRMA);
});

test('sohbet isteği: tür + u16 uzunluklu metin, 128 karaktere kısalır', () => {
  assert.deepEqual([...sohbetIstegi(1, 'Hi')], [1, 2, 0, 0x48, 0x69]);
  assert.equal(sohbetIstegi(1, 'x'.repeat(300)).length, 1 + 2 + 128);
});
