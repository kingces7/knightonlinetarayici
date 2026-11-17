import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaketYazici } from './ikili.ts';
import { gorevPaketi, gorevSecimiIstegi } from './gorev.ts';

test('görev listesi (alt 1)', () => {
  const g = gorevPaketi(new PaketYazici().u8(1).u16(2).u16(71).u8(1).u16(72).u8(4).baytlar());
  assert.deepEqual(g.durumlar, [{ gorev: 71, durum: 1 }, { gorev: 72, durum: 4 }]);
});
test('görev durumu (alt 2)', () => { assert.deepEqual(gorevPaketi(new PaketYazici().u8(2).u16(71).u8(2).baytlar()).durumlar, [{ gorev: 71, durum: 2 }]); });
test('NPC konuşması (alt 7): gerçek sunucu örneği 07 93000000 5446 = metin 147, NPC 18004', () => {
  const g = gorevPaketi(Uint8Array.from([7, 0x93, 0, 0, 0, 0x54, 0x46]));
  assert.equal(g.metinNo, 147); assert.equal(g.npcSid, 18004);
});
test('seçim isteği: 3, u32 satır', () => { assert.deepEqual([...gorevSecimiIstegi(4061)], [3, 0xdd, 0x0f, 0, 0]); });
