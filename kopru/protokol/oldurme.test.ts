import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaketYazici } from './ikili.ts';
import { oldurmeBildirimi } from './oldurme.ts';

test('yeni öldürme: seri sayısı ve ad', () => {
  const g = new PaketYazici().u8(1).u8(1).u32(1).yazi('kingces').u8(1).u32(3).baytlar();
  assert.deepEqual(oldurmeBildirimi(g), { tur: 1, alt: 1, ad: 'kingces', sayi: 3 });
});
test('sayaç sıfırlandı', () => { assert.deepEqual(oldurmeBildirimi(Uint8Array.from([1, 2])), { tur: 1, alt: 2 }); });
test('parti bildirimi: toplam öldürme', () => {
  const g = new PaketYazici().u8(1).u8(3).u32(1).yazi('kingces').u8(2).u32(10).baytlar();
  assert.deepEqual(oldurmeBildirimi(g), { tur: 1, alt: 3, ad: 'kingces', sayi: 10 });
});
