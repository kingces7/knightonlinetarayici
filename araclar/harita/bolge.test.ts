// bolgeler.json (bolge-tara.ts çıktısı) tutarlılığı. Dönüştürülmüş harita yoksa atlanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';

const dizin = path.join(CIKTI_DIZINI, 'web', 'harita');
const dosya = path.join(dizin, 'bolgeler.json');
const var_ = fs.existsSync(dosya);
const bolgeler = var_ ? (JSON.parse(fs.readFileSync(dosya, 'utf8')) as Record<string, { ad: string; durum: string; baslangic?: number[]; deneyimKaybi: boolean }>) : {};

test('bolgeler.json: elle verilen bölgeler değişmedi (21, 1, 2, 18)', { skip: !var_ }, () => {
  assert.equal(bolgeler['21'].ad, '14th_oldmoradon');
  assert.equal(bolgeler['1'].ad, 'karus2004');
  assert.equal(bolgeler['2'].ad, 'elmo2004');
  assert.equal(bolgeler['18'].ad, 'moradon');
});

test('bolgeler.json: her bölgenin haritası dönüştürülmüş (arazi.json var) ve küçük harfli', { skip: !var_ }, () => {
  for (const [no, b] of Object.entries(bolgeler)) {
    assert.match(no, /^\d+$/);
    assert.equal(b.ad, b.ad.toLowerCase(), `bölge ${no}: harita adı küçük harf olmalı (klasör adı)`);
    assert.ok(fs.existsSync(path.join(dizin, b.ad, 'arazi.json')), `bölge ${no}: ${b.ad}/arazi.json yok (node harita/bolge-tara.ts --donustur)`);
    assert.ok(b.durum === 'tam' || b.durum === 'gorsel');
  }
});

test('bolgeler.json: "tam" bölgelerin haritasında çarpışma + kapı verisi var', { skip: !var_ }, () => {
  for (const [no, b] of Object.entries(bolgeler)) {
    if (b.durum !== 'tam') continue;
    for (const f of ['carpisma.bin', 'sunucu.json']) assert.ok(fs.existsSync(path.join(dizin, b.ad, f)), `bölge ${no} (${b.ad}): ${f} yok`);
  }
});

test('bolgeler.json: başlangıç noktaları harita sınırları içinde', { skip: !var_ }, () => {
  for (const [no, b] of Object.entries(bolgeler)) {
    if (!b.baslangic) continue;
    const a = JSON.parse(fs.readFileSync(path.join(dizin, b.ad, 'arazi.json'), 'utf8')) as { boyut: number; birim?: number };
    const sinir = (a.boyut - 1) * (a.birim ?? 4);
    assert.ok(b.baslangic[0] > 0 && b.baslangic[1] > 0 && b.baslangic[0] < sinir && b.baslangic[1] < sinir, `bölge ${no}: başlangıç ${b.baslangic} harita dışında (sınır ${sinir})`);
  }
});
