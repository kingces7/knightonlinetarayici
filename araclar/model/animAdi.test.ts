import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animAdi } from './karakterGlb.ts';

test('animAdi: özgün ad bilinen bir aileye düşüyorsa standart ad verilir, tekrarlar ailedeki sıradaki ada gider', () => {
  const kullanilan: string[] = [];
  const ver = (ozgun: string, sira: number) => { const a = animAdi(ozgun, sira, kullanilan); kullanilan.push(a); return a; };
  assert.equal(ver('breath', 0), 'bekle');
  assert.equal(ver('walk', 1), 'yuru');
  assert.equal(ver('run', 2), 'kos');
  assert.equal(ver('attack0', 4), 'saldir0');
  assert.equal(ver('attack0', 5), 'saldir1'); // iki "attack0" olan modeller
  assert.equal(ver('struck0', 6), 'darbe0');
  assert.equal(ver('struck1', 7), 'darbe1');
  assert.equal(ver('dead0', 10), 'olum0');
  assert.equal(ver('dead0', 11), 'olum1');
});

test('animAdi: oturma animasyonları tanınır (oyuncu iskeletlerinde SitDown / SitDown_Breath / StandUp)', () => {
  assert.equal(animAdi('SitDown', 11, []), 'oturBasla');
  assert.equal(animAdi('SitDown_Breath', 12, []), 'otur');
  assert.equal(animAdi('breath_sit', 12, []), 'otur');
  assert.equal(animAdi('StandUp', 13, []), 'kalk');
});

test('animAdi: bilinmeyen ad eski sıra tablosuna, o da doluysa benzersiz bir ada düşer', () => {
  assert.equal(animAdi('foo', 3, []), 'geri');
  assert.equal(animAdi('foo', 3, ['geri']), '3_foo');
  assert.equal(animAdi('foo', 99, ['99_foo']), '99_foo_');
});
