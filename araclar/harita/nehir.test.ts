import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { gtdOku } from './arazi.ts';
import { nehirleriOku } from './nehir.ts';

test('14th_oldmoradon: 4 şerit (kanal, ana nehir, 2 dere) ve 2 deniz ızgarası okunur', () => {
  const od = new OyunDosyalari();
  const b = od.oku('Zones/14th_oldmoradon.gtd');
  const a = gtdOku(b);
  const r = nehirleriOku(b.subarray(a.bitis!));
  assert.equal(r.length, 6);
  assert.deepEqual(r.map((x) => x.koseler.length), [136, 160, 132, 64, 225, 225]);
  assert.equal(r.filter((x) => x.tur === 'izgara').length, 2);
  assert.ok(r.every((x) => x.doku.toLowerCase() === 'z_nomaldark512_k07.dxt'));
  // kanal (y ≈ 6,8) plazanın doğusunda: x 300–450, z 334–470 (mini haritadaki kanalla çakışır)
  const kanal = r[0].koseler;
  assert.ok(Math.abs(kanal[0].y - 6.83) < 0.01 && kanal.every((k) => k.x > 295 && k.x < 455 && k.z > 330 && k.z < 475));
});
