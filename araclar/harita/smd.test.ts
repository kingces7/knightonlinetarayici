import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { smdOku } from './smd.ts';
import { gtdOku } from './arazi.ts';
import { OYUN_DIZINI, SUNUCU_HARITA_DIZINI } from '../ortak/yollar.ts';

const smdYolu = path.join(SUNUCU_HARITA_DIZINI, '1098moradon_0826.smd');
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

test('smd: eski Moradon (old_moradon.smd) çarpışması ve yüksekliği 14th_oldmoradon.gtd ile aynı', { skip: !fs.existsSync(path.join(SUNUCU_HARITA_DIZINI, 'old_moradon.smd')) || !fs.existsSync(path.join(OYUN_DIZINI, 'Zones', '14th_oldmoradon.gtd')) && 'dosyalar yok' }, () => {
  const s = smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, 'old_moradon.smd')));
  const g = gtdOku(fs.readFileSync(path.join(OYUN_DIZINI, 'Zones', '14th_oldmoradon.gtd')));
  assert.equal(s.boyut, 129);
  assert.equal(g.boyut, 129);
  // Yükseklik ızgarası bu haritada x/z yer değiştirmeden aynı (yeni Moradon'da devrik).
  let esit = 0; for (let i = 0; i < g.yukseklik.length; i++) if (Math.abs(g.yukseklik[i] - s.yukseklik[i]) < 0.05) esit++;
  assert.ok(esit / g.yukseklik.length > 0.9, `yükseklik eşleşmesi ${esit}/${g.yukseklik.length}`);
  const N = g.boyut;
  const h = (x: number, z: number) => g.yukseklik[Math.min(N - 1, Math.max(0, Math.round(x / 4))) * N + Math.min(N - 1, Math.max(0, Math.round(z / 4)))];
  let yakin = 0, say = 0;
  for (let i = 0; i < s.yuzler.length; i += 3) {
    const x = s.yuzler[i], y = s.yuzler[i + 1], z = s.yuzler[i + 2];
    if (x < 0 || z < 0 || x > 512 || z > 512) continue;
    say++;
    if (Math.abs(y - h(x, z)) < 6) yakin++;
  }
  assert.ok(yakin / say > 0.6, `köşelerin ${yakin}/${say} kadarı zemine yakın`);
});

test('gtd: moradon_xmas (4096 baytlık bloksuz düzen) okunuyor', { skip: !fs.existsSync(path.join(OYUN_DIZINI, 'Zones', 'moradon_xmas.gtd')) && 'oyun dosyaları yok' }, () => {
  const g = gtdOku(fs.readFileSync(path.join(OYUN_DIZINI, 'Zones', 'moradon_xmas.gtd')));
  assert.equal(g.boyut, 257);
  assert.equal(g.karolar.length, 247);
});
