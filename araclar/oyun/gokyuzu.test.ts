import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { gokyuzuJson, gokyuzuOku } from './gokyuzu.ts';

test('moradon.n3sky: 43 anahtar, dosya tamamen tükeniyor; öğle gökyüzü/sis renkleri', () => {
  const od = new OyunDosyalari();
  const g = gokyuzuOku(od.oku('Misc/sky/moradon.n3sky'));
  od.kapat();
  assert.equal(g.kayitlar.length, 43);
  assert.ok(/sundisk.bmp$/i.test(g.dokular[0]));
  const j = gokyuzuJson(g);
  assert.deepEqual(j.anahtar.gokyuzu.find((k) => k[0] === 21600), [21600, 24, 74, 112]);
  assert.deepEqual(j.anahtar.sis.find((k) => k[0] === 21600), [21600, 112, 205, 186]);
});
