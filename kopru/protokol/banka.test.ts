import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALTIN_NO, BANKA_ISLEMI, bankaAcIstegi, bankaCevabi, bankaIslemIstegi } from './banka.ts';

const bayt = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

test('gerçek sunucu: işlem onayı', () => {
  assert.deepEqual(bankaCevabi(bayt('0201')), { islem: 2, basarili: true });
  assert.deepEqual(bankaCevabi(bayt('0300')), { islem: 3, basarili: false });
});

test('gerçek sunucu: açılış cevabı = 6 + 192 × 17 bayt (boş banka)', () => {
  const b = new Uint8Array(6 + 192 * 17); b[0] = 1; b[1] = 1; b[2] = 0x10; // 16 Noah
  b.set([0x00, 0xe9, 0xa4, 0x35, 0, 0, 5, 0], 6 + 17 * 2); // 3. yuvada 5 Noah'lık eşya numarası (örnek)
  const c = bankaCevabi(b);
  assert.equal(c.altin, 16); assert.equal(c.yuvalar!.length, 192); assert.equal(c.yuvalar![0], null);
  assert.deepEqual(c.yuvalar![2], { no: ALTIN_NO, adet: 5 });
});

test('istekler', () => {
  assert.deepEqual([...bankaAcIstegi()], [1]);
  assert.equal(bankaIslemIstegi(BANKA_ISLEMI.YATIR, 8016, ALTIN_NO, 0, 0, 0, 5).length, 1 + 2 + 4 + 3 + 4);
});
