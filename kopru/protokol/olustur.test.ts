import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IRK_MESLEKLERI, irkUlusu, karakterDenetle, sinifKodu, yeniKarakterIstegi } from './olustur.ts';

const temel = { yuva: 0, ad: 'Deneme', irk: 12, sinif: 201, yuz: 1, sac: 1, str: 65, sta: 65, dex: 60, int: 50, cha: 60 };

test('istek biçimi: savaşçı oluşturma (kopru test yardımcısıyla aynı bayt dizisi)', () => {
  const b = yeniKarakterIstegi({ ...temel, ad: 'kingces', str: 60, sta: 60, dex: 60, int: 60, cha: 60 });
  assert.deepEqual([...b], [0, 7, 0, ...Buffer.from('kingces'), 12, 201, 0, 1, 1, 0, 0, 0, 60, 60, 60, 60, 60]);
});
test('ulus ve sınıf kodu', () => {
  assert.equal(irkUlusu(3), 1); assert.equal(irkUlusu(13), 2);
  assert.equal(sinifKodu(2, 4), 104); assert.equal(sinifKodu(12, 3), 203);
  assert.deepEqual(IRK_MESLEKLERI[12], [1, 2, 3, 4]);
});
test('ön denetim: stat toplamı, ırk/sınıf uyumu, ad', () => {
  assert.equal(karakterDenetle(temel), null);
  assert.match(karakterDenetle({ ...temel, cha: 50 })!, /bonus/);
  assert.match(karakterDenetle({ ...temel, irk: 11, sinif: 202 })!, /cannot use/);
  assert.match(karakterDenetle({ ...temel, ad: 'ab' })!, /name/);
  assert.match(karakterDenetle({ ...temel, str: 40, sta: 90 })!, /below 50/);
});
