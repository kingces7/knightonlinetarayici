import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { kameraOku } from './kamera.ts';

test('DefaultCamera.N3Camera: görüş açısı ve düzlemler', () => {
  const od = new OyunDosyalari();
  const k = kameraOku(od.oku('Data/DefaultCamera.N3Camera'));
  od.kapat();
  assert.equal(k.ad, 'DefaultCamera');
  assert.deepEqual(k.goz, [15, 5, -15]);
  assert.deepEqual(k.bak, [0, 0, 0]);
  assert.deepEqual(k.yukari, [0, 1, 0]);
  assert.ok(Math.abs((k.fov * 180) / Math.PI - 55) < 1e-3); // görüş açısı tam 55°
  assert.ok(Math.abs(k.yakin - 0.7) < 1e-6);
  assert.equal(k.uzak, 512);
});
