import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ESLESME_ESIGI, SUNUCU_HARITASI, eslesmeGuvenilir, eslesmeNedeni, yukseklikEslesmesi } from './eslesme.ts';
import { bozukYuzMu, saglamYuzler, smdOku } from './smd.ts';
import { gtdOku } from './arazi.ts';
import { OYUN_DIZINI, SUNUCU_HARITA_DIZINI } from '../ortak/yollar.ts';

const izgara = (N: number, f: (x: number, z: number) => number) => {
  const yukseklik = new Float32Array(N * N);
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) yukseklik[x * N + z] = f(x, z);
  return { boyut: N, yukseklik };
};

test('eşleşme: aynı ızgara %100, aynı sıra', () => {
  const g = izgara(17, (x, z) => x * 3 + z * 0.5);
  const e = yukseklikEslesmesi(g, izgara(17, (x, z) => x * 3 + z * 0.5));
  assert.equal(e.boyutAyni, true);
  assert.equal(e.oran, 1);
  assert.equal(e.yon, 'ayni');
  assert.ok(eslesmeGuvenilir(e));
});

test('eşleşme: x/z yer değiştirmiş ızgara (Moradon gibi) devrik olarak bulunur', () => {
  const g = izgara(17, (x, z) => x * 7 + z * 0.5);
  const s = izgara(17, (x, z) => z * 7 + x * 0.5); // smd[z*N+x] == gtd[x*N+z]
  const e = yukseklikEslesmesi(g, s);
  assert.equal(e.yon, 'devrik');
  assert.equal(e.oran, 1);
  assert.ok(e.ayniSira < 0.2);
});

test('eşleşme: boyut farklıysa güvenilmez ve neden boyutu söyler', () => {
  const e = yukseklikEslesmesi(izgara(129, () => 1), izgara(513, () => 1));
  assert.equal(e.boyutAyni, false);
  assert.equal(e.oran, 0);
  assert.equal(eslesmeGuvenilir(e), false);
  assert.match(eslesmeNedeni(e), /129.*513/);
});

test('eşleşme: farklı yüksekliklerde benzerlik eşiğin altında kalır', () => {
  const e = yukseklikEslesmesi(izgara(33, (x, z) => x * 10 + z), izgara(33, (x, z) => (x * 37 + z * 11) % 400));
  assert.ok(e.oran < ESLESME_ESIGI);
  assert.equal(eslesmeGuvenilir(e), false);
  assert.match(eslesmeNedeni(e), /%/);
});

test('smd: bozuk üçgen filtresi NaN, sonsuz ve 1e5 üstü köşeleri atar, indeksleri korumaz', () => {
  const y = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, // sağlam
    0, 0, 0, NaN, 0, 0, 0, 1, 0, // NaN
    0, 0, 0, 1, 0, 0, 3.4e38, 1, 0, // çok büyük
    5, 5, 5, 6, 5, 5, 5, 6, 5, // sağlam
    0, 0, 0, Infinity, 0, 0, 0, 1, 0, // sonsuz
  ]);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => bozukYuzMu(y, i)), [false, true, true, false, true]);
  const s = saglamYuzler(y);
  assert.equal(s.atlanan, 3);
  assert.equal(s.yuzler.length, 18);
  assert.deepEqual(Array.from(s.yuzler.subarray(9, 12)), [5, 5, 5]); // ikinci sağlam üçgen birinciyi izliyor
});

const klasorVar = fs.existsSync(SUNUCU_HARITA_DIZINI) && fs.existsSync(path.join(OYUN_DIZINI, 'Zones'));
const smdAta = (ad: string) => !fs.existsSync(path.join(SUNUCU_HARITA_DIZINI, ad)) && `${ad} yok`;

test('smd: freezone_a ailesinde tam 1586 bozuk üçgen var, sağlam 9733 üçgen kalıyor', { skip: smdAta('1098freezone_a.smd') }, () => {
  const s = smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, '1098freezone_a.smd')));
  assert.equal(s.yuzler.length / 9, 11319);
  assert.equal(s.bozukYuz, 1586);
  const { yuzler, atlanan } = saglamYuzler(s.yuzler);
  assert.equal(atlanan, 1586);
  assert.equal(yuzler.length / 9, 9733);
  for (let i = 0; i < yuzler.length; i++) assert.ok(Number.isFinite(yuzler[i]) && Math.abs(yuzler[i]) <= 1e5);
});

test('smd: sağlam dosyalarda bozuk üçgen yok (Moradon, Luferson, El Morad)', { skip: smdAta('1098moradon_0826.smd') || smdAta('1098karus2004.smd') || smdAta('1098elmo2004.smd') }, () => {
  for (const ad of ['1098moradon_0826.smd', '1098karus2004.smd', '1098elmo2004.smd']) {
    assert.equal(smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, ad))).bozukYuz, 0, ad);
  }
});

test('eşleşme: tablodaki doğrulanmış eşleşmeler eşiğin üstünde, Delos Basement (dungeonD) uyuşmuyor', { skip: !klasorVar && 'dosyalar yok' }, () => {
  const gtd = (ad: string) => gtdOku(fs.readFileSync(path.join(OYUN_DIZINI, 'Zones', `${ad}.gtd`)));
  const smd = (ad: string) => smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, ad)));
  for (const [harita, ad] of Object.entries(SUNUCU_HARITASI)) {
    const g = path.join(OYUN_DIZINI, 'Zones', `${harita}.gtd`);
    if (!fs.existsSync(g) || !fs.existsSync(path.join(SUNUCU_HARITA_DIZINI, ad))) continue;
    const e = yukseklikEslesmesi(gtd(harita), smd(ad));
    assert.ok(eslesmeGuvenilir(e), `${harita} ↔ ${ad}: ${eslesmeNedeni(e)}`);
  }
  if (fs.existsSync(path.join(OYUN_DIZINI, 'Zones', 'dungeonD.gtd')) && fs.existsSync(path.join(SUNUCU_HARITA_DIZINI, 'dungeond.smd'))) {
    const e = yukseklikEslesmesi(gtd('dungeonD'), smd('dungeond.smd')); // sunucu dosyası Luferson'un kopyası (513), client 129
    assert.equal(e.boyutAyni, false);
    assert.equal(eslesmeGuvenilir(e), false);
  }
});
