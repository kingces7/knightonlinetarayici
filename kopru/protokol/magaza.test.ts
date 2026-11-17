import { test } from 'node:test';
import assert from 'node:assert/strict';
import { magazaCevabi, satinAlmaIstegi, satisIstegi } from './magaza.ts';

const bayt = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

test('gerçek sunucu: alım, satım ve hata cevapları', () => {
  assert.deepEqual(magazaCevabi(bayt('0181b700003f00000000')), { basarili: true, altin: 46977, fiyat: 63 });
  assert.deepEqual(magazaCevabi(bayt('018cb700000b00000000')), { basarili: true, altin: 46988, fiyat: 11 });
  assert.deepEqual(magazaCevabi(bayt('0001')), { basarili: false, hata: 1 });
});

test('istekler: alım = 8 + 9 bayt / eşya, satım = 8 + 7 bayt / eşya', () => {
  assert.equal(satinAlmaIstegi(253000, 8347, [{ no: 389010000, yuva: 3, adet: 1, sayfa: 0, sira: 0 }]).length, 1 + 4 + 2 + 1 + 9);
  assert.equal(satisIstegi(253000, 8347, [{ no: 389010000, yuva: 3, adet: 1 }]).length, 1 + 4 + 2 + 1 + 7);
});
