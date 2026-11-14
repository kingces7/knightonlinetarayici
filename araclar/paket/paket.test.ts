import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PaketArsivi, hdrOku, hdrYaz, klasoruPaketle } from './paket.ts';
import { OYUN_DIZINI } from '../ortak/yollar.ts';

test('hdr yaz/oku birbirinin tersi', () => {
  const g = [{ ad: 'a.dxt', ofset: 0, uzunluk: 5 }, { ad: 'alt\\b.n3pmesh', ofset: 5, uzunluk: 7 }];
  assert.deepEqual(hdrOku(hdrYaz(g)), g);
});

test('klasör paketlenip geri okunabilir (alt klasör, büyük/küçük harf duyarsız)', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paket-'));
  fs.mkdirSync(path.join(d, 'kaynak', 'Alt'), { recursive: true });
  fs.writeFileSync(path.join(d, 'kaynak', 'bir.txt'), 'merhaba');
  fs.writeFileSync(path.join(d, 'kaynak', 'Alt', 'iki.bin'), Buffer.from([1, 2, 3]));
  klasoruPaketle(path.join(d, 'kaynak'), path.join(d, 'x.hdr'), path.join(d, 'x.src'));
  const a = new PaketArsivi(path.join(d, 'x.hdr'), path.join(d, 'x.src'));
  assert.equal(a.oku('BIR.TXT').toString(), 'merhaba');
  assert.deepEqual([...a.oku('alt/iki.bin')], [1, 2, 3]);
  a.kapat();
  fs.rmSync(d, { recursive: true, force: true });
});

const oyunVar = fs.existsSync(path.join(OYUN_DIZINI, 'Item', 'item.hdr'));
test('gerçek: Item arşivi okunur ve girdiler .src içinde kalır', { skip: !oyunVar && 'oyun klasörü yok' }, () => {
  const g = hdrOku(fs.readFileSync(path.join(OYUN_DIZINI, 'Item', 'item.hdr')));
  const boy = fs.statSync(path.join(OYUN_DIZINI, 'Item', 'item.src')).size;
  assert.ok(g.length > 1000);
  assert.ok(g.every((x) => x.ofset + x.uzunluk <= boy));
});
