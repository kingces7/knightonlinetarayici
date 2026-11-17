import { test } from 'node:test';
import assert from 'node:assert/strict';
import { durumPaketi, oturmaIstegi, statArtirmaIstegi, statCevabi } from './karakter.ts';

const bayt = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

test('gerçek sunucu: STR puanı harcama cevabı', () => {
  assert.deepEqual(statCevabi(bayt('013d00470033000400160d000047003300')), { statNo: 1, deger: 61, azamiCan: 71, azamiMana: 51, vurus: 4, azamiAgirlik: 3350, can: 71, mana: 51 });
  assert.deepEqual([...statArtirmaIstegi(3)], [3]);
});

test('gerçek sunucu: otur/kalk yayını ve isteği', () => {
  assert.deepEqual(durumPaketi(bayt('02000102000000')), { id: 2, tur: 1, durum: 2 });
  assert.deepEqual([...oturmaIstegi(true)], [1, 2, 0, 0, 0]);
  assert.deepEqual([...oturmaIstegi(false)], [1, 1, 0, 0, 0]);
});
