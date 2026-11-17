import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaketYazici } from './ikili.ts';
import { npcOlayiIstegi, secimCevabi, secimMesaji } from './diyalog.ts';

test('NPC tıklama isteği: 1, u16 kimlik, i32 -1', () => {
  assert.deepEqual([...npcOlayiIstegi(0x1234)], [1, 0x34, 0x12, 0xff, 0xff, 0xff, 0xff]);
});
test('menü: sid, bayrak, görev, konuşma, 12 düğme, lua adı', () => {
  const y = new PaketYazici().i16(18004).u8(2).i32(-1).i32(4064);
  const d = [4062, 404, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]; for (const x of d) y.i32(x);
  y.yazi('18004_Kaisan.lua', false);
  const m = secimMesaji(y.baytlar());
  assert.equal(m.npcSid, 18004); assert.equal(m.bayrak, 2); assert.equal(m.gorevNo, -1); assert.equal(m.baslik, 4064);
  assert.deepEqual(m.dugmeler, d); assert.equal(m.lua, '18004_Kaisan.lua');
});
test('seçim cevabı: düğme, lua adı, ödül -1 (sunucu örneği 01 12 … FF)', () => {
  const b = secimCevabi(1, '18004_Kaisan.lua');
  assert.equal(b[0], 1); assert.equal(b[1], 16); assert.equal(b[b.length - 1], 0xff); assert.equal(b.length, 1 + 1 + 16 + 1);
});
