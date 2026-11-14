import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { smdOku } from './smd.ts';
import { gtdOku } from './arazi.ts';
import { OYUN_DIZINI, SUNUCU_HARITA_DIZINI } from '../ortak/yollar.ts';

const smdYolu = path.join(SUNUCU_HARITA_DIZINI, 'moradon_0826.smd');
const gtdYolu = path.join(OYUN_DIZINI, 'Zones', 'moradon.gtd');
const atla = (!fs.existsSync(smdYolu) || !fs.existsSync(gtdYolu)) && 'server/oyun dosyaları yok';

test('smd: Moradon sunucu haritası tüm bölümleriyle okunuyor (dosya sonuna kadar tutarlı)', { skip: atla }, () => {
  const s = smdOku(fs.readFileSync(smdYolu));
  assert.equal(s.boyut, 257);
  assert.equal(s.birim, 4);
  assert.ok(s.yuzler.length / 9 > 10000, 'çarpışma üçgenleri okunmalı');
  assert.ok(s.hucreler.size > 1000);
  assert.equal(s.nesneOlaylari.length, 29);
  assert.equal(s.karoOlay.length, 257 * 257);
  // Kapılar: Moradon'dan bilinen bölgelere (Folk Village, Luferson Castle…)
  assert.ok(s.kapilar.length >= 10);
  assert.ok(s.kapilar.some((k) => k.ad === 'Luferson Castle' && k.bolge === 1));
  assert.ok(s.kapilar.some((k) => k.ad === 'El Morad Castle' && k.bolge === 2));
});

test('smd: çarpışma köşeleri istemci arazisiyle (gtd) aynı dünya koordinatında', { skip: atla }, () => {
  const s = smdOku(fs.readFileSync(smdYolu));
  const g = gtdOku(fs.readFileSync(gtdYolu));
  const N = g.boyut;
  const h = (x: number, z: number) => g.yukseklik[Math.min(N - 1, Math.max(0, Math.round(x / 4))) * N + Math.min(N - 1, Math.max(0, Math.round(z / 4)))];
  let yakin = 0, say = 0;
  for (let i = 0; i < s.yuzler.length; i += 3) {
    const x = s.yuzler[i], y = s.yuzler[i + 1], z = s.yuzler[i + 2];
    if (x < 0 || z < 0 || x > 1024 || z > 1024) continue;
    say++;
    if (Math.abs(y - h(x, z)) < 6) yakin++;
  }
  // (x,z) sırası doğruysa köşelerin çoğu zemine yakındır; yer değiştirmiş (z,x) olsaydı ~%30 olurdu.
  assert.ok(yakin / say > 0.6, `köşelerin ${yakin}/${say} kadarı zemine yakın`);
});
