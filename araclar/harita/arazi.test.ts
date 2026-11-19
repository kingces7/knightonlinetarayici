import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gtdOku } from './arazi.ts';
import { OYUN_DIZINI } from '../ortak/yollar.ts';

const zones = path.join(OYUN_DIZINI, 'Zones');

// İkinci başlık biçimi: int32 sürüm, int32 ad uzunluğu, düz ASCII ad, int32 N (ad XOR'lu eski biçimde değil).
const YENI_BASLIKLI: [string, string, number][] = [
  ['clanfight.gtd', 'clanfight', 65],
  ['clanfight_c.gtd', 'clanfight_c', 65],
  ['elmorad_start.gtd', 'elmorad_start', 513],
  ['karus_start.gtd', 'karus_start', 513],
  ['freezone.gtd', 'freezone', 257],
  ['freezone_new.gtd', 'freezone_new', 513],
];

for (const [dosya, ad, n] of YENI_BASLIKLI) {
  test(`gtd: ${dosya} (ikinci başlık biçimi) okunuyor`, { skip: !fs.existsSync(path.join(zones, dosya)) && 'oyun dosyaları yok' }, () => {
    const a = gtdOku(fs.readFileSync(path.join(zones, dosya)));
    assert.equal(a.ad, ad);
    assert.equal(a.boyut, n);
    assert.equal(a.yukseklik.length, n * n);
    assert.ok(a.karolar.length > 0 && a.karolar.length <= 1024);
    assert.ok(a.karolar.every((k) => /\.gtt$/i.test(k.kaynak)), 'karo kaynakları .gtt olmalı');
    let gecersiz = 0, sonsuz = 0;
    for (let i = 0; i < n * n; i++) {
      if (!Number.isFinite(a.yukseklik[i])) sonsuz++;
      if (a.doku1[i] !== 1023 && a.doku1[i] >= a.karolar.length) gecersiz++;
    }
    assert.equal(sonsuz, 0, 'yükseklikte NaN/sonsuz olmamalı');
    assert.equal(gecersiz, 0, 'doku1 indeksleri karo listesi içinde olmalı');
    assert.ok(a.bitis! <= fs.statSync(path.join(zones, dosya)).size, 'okuma dosya sonunu aşmamalı');
  });
}

test('gtd: eski başlık biçimi (karus2004, XOR\'lu ad) bozulmadı', { skip: !fs.existsSync(path.join(zones, 'karus2004.gtd')) && 'oyun dosyaları yok' }, () => {
  const a = gtdOku(fs.readFileSync(path.join(zones, 'karus2004.gtd')));
  assert.equal(a.ad, 'karus2004');
  assert.equal(a.boyut, 513);
  assert.equal(a.karolar.length, 275);
});
