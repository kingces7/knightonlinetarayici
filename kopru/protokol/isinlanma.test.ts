import test from 'node:test';
import assert from 'node:assert/strict';
import { PaketYazici } from './ikili.ts';
import { bolgeIsinlanmasi, isinlanmaPaketi, kapiSecimiIstegi, nesneOlayiIstegi } from './isinlanma.ts';

test('istekler', () => {
  assert.deepEqual([...nesneOlayiIstegi(4014)], [0xae, 0x0f, 0, 0]);
  assert.deepEqual([...kapiSecimiIstegi(4014, 2111)], [0xae, 0x0f, 0x3f, 0x08]);
});
test('kapı listesi', () => {
  const g = new PaketYazici().u8(1).u16(2).u16(2111).yazi('Luf').yazi('Go').u16(1).u16(0).u32(5000).u16(2116).yazi('Ard').yazi('Go2').u16(72).u16(0).u32(3000).baytlar();
  const p = isinlanmaPaketi(g);
  assert.equal(p.tur, 'liste');
  if (p.tur === 'liste') { assert.equal(p.kapilar.length, 2); assert.deepEqual(p.kapilar[0], { no: 2111, ad: 'Luf', duyuru: 'Go', bolge: 1, azamiOyuncu: 0, ucret: 5000 }); assert.equal(p.kapilar[1].bolge, 72); }
});
test('sonuç ve bölge ışınlanması', () => {
  assert.deepEqual(isinlanmaPaketi(new PaketYazici().u8(2).u8(2).u8(20).baytlar()), { tur: 'sonuc', kod: 2, enDusukSeviye: 20 });
  const g = new PaketYazici().u8(3).u16(1).u16(4410).u16(16250).u16(0).u8(1).u8(0).baytlar();
  assert.deepEqual(bolgeIsinlanmasi(g), { bolge: 1, x: 441, z: 1625, ulus: 1 });
  assert.equal(bolgeIsinlanmasi(new PaketYazici().u8(2).baytlar()), null);
});
