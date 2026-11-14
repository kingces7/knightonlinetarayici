// Tablo aracı testleri. Çalıştırma: araclar/ klasöründe `npm test`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OYUN_DIZINI } from '../ortak/yollar.ts';
import { jsonaCevir, jsondanOku, metaOlustur, tbldenOku, tblyeYaz, type Tablo } from './tablo.ts';
import { csvdenTablo, csvyeCevir } from './csv.ts';
import { varsayilanKodSayfasi } from './kodlama.ts';
import { desCoz, desSifrele } from './des.ts';
import type { SifreTuru } from './sifreleme.ts';

const KS = 'windows-1254' as const;

function ornekTablo(sifreleme: SifreTuru): Tablo {
  return {
    sifreleme,
    onek: sifreleme === 'usko-cift' ? Uint8Array.of(0xa5, 0x4e, 0x00, 0x07, 0x07) : new Uint8Array(0),
    sutunTurleri: ['DWORD', 'CHAR', 'BYTE', 'SHORT', 'WORD', 'INT', 'STRING', 'FLOAT', 'DOUBLE', 'INT64'],
    satirlar: [
      [1, -5, 200, -300, 60000, -70000, 'Sarı Ejderhanın Kükremesi', 1.5, 2.25, '-9007199254740993'],
      [2, 127, 0, 32767, 0, 2147483647, '', '#f32:7fc00000', '#f64:0000000000000080', 42],
      [4294967295, -128, 255, -32768, 65535, -2147483648, 'Çatal | ğüşiöç', 0.1, -1e300, 0],
    ],
    artik: new Uint8Array(0),
    kuyruk: new Uint8Array(0),
  };
}

for (const tur of ['usko-cift', 'xor-eski', 'xor-0418'] as const) {
  test(`yapay tablo kayıpsız gidip gelir (${tur})`, () => {
    const t = ornekTablo(tur);
    const dosya = tblyeYaz(t, KS);
    const okunan = tbldenOku(dosya, KS);
    assert.equal(okunan.sifreleme, tur);
    assert.deepEqual(okunan.sutunTurleri, t.sutunTurleri);
    // FLOAT 0.1 tek duyarlıklı sayıya yuvarlanır; karşılaştırmayı bit düzeyinde yapmak için tekrar yazıyoruz
    const json = jsonaCevir(okunan, 'deneme.tbl', KS);
    const { tablo } = jsondanOku(json);
    assert.deepEqual(Buffer.from(tblyeYaz(tablo, KS)), Buffer.from(dosya));
    assert.equal(okunan.satirlar[0][6], 'Sarı Ejderhanın Kükremesi');
    assert.equal(okunan.satirlar[0][9], '-9007199254740993');
    assert.equal(okunan.satirlar[1][7], '#f32:7fc00000');
  });
}

test('JSON üzerinde yapılan değişiklik .tbl dosyasına işlenir', () => {
  const dosya = tblyeYaz(ornekTablo('usko-cift'), KS);
  const json = jsonaCevir(tbldenOku(dosya, KS), 'deneme.tbl', KS);
  const { tablo } = jsondanOku(json);
  tablo.satirlar[0][6] = 'Yeni İsim';
  tablo.satirlar.push([5, 0, 0, 0, 0, 0, 'Eklenen satır', 0, 0, 7]);
  const yeni = tbldenOku(tblyeYaz(tablo, KS), KS);
  assert.equal(yeni.satirlar.length, 4);
  assert.equal(yeni.satirlar[0][6], 'Yeni İsim');
  assert.equal(yeni.satirlar[3][6], 'Eklenen satır');
});

test('CSV: tırnak, virgül ve satır sonu içeren metinler kayıpsız gidip gelir', () => {
  const t = ornekTablo('usko-cift');
  t.satirlar[1][6] = 'virgül, "tırnak"\r\nyeni satır ';
  const meta = JSON.parse(JSON.stringify(metaOlustur(t, 'deneme.tbl', KS)));
  const { tablo } = csvdenTablo(csvyeCevir(t), meta);
  assert.deepEqual(Buffer.from(tblyeYaz(tablo, KS)), Buffer.from(tblyeYaz(t, KS)));
});

test('CSV: düzenleme işlenir, yanlış sütun sayısı reddedilir', () => {
  const t = ornekTablo('xor-eski');
  const meta = JSON.parse(JSON.stringify(metaOlustur(t, 'deneme.tbl', KS)));
  const csv = csvyeCevir(t).replace('Sarı Ejderhanın Kükremesi', 'Iron Bow');
  assert.equal(csvdenTablo(csv, meta).tablo.satirlar[0][6], 'Iron Bow');
  assert.throws(() => csvdenTablo(csv.replace('\n1,', '\n1,9,'), meta), /CSV satır 2/);
});

test('kod sayfası: İngilizce tablolar 1252, Türkçe tablolar 1254', () => {
  assert.equal(varsayilanKodSayfasi('Data/Item_Org_us.tbl'), 'windows-1252');
  assert.equal(varsayilanKodSayfasi('Data/Item_Org_tk.tbl'), 'windows-1254');
  assert.equal(varsayilanKodSayfasi('Zones/Zones.tbl'), 'windows-1252');
});

test('hatalı değer anlaşılır bir hata verir', () => {
  const t = ornekTablo('xor-eski');
  t.satirlar[0][2] = 300; // BYTE en fazla 255
  assert.throws(() => tblyeYaz(t, KS), /Satır 1, sütun 3: BYTE/);
});

test('DES şifrele/çöz birbirinin tersidir', () => {
  const veri = Uint8Array.from({ length: 64 }, (_, i) => (i * 37) & 255);
  const kopya = Uint8Array.from(veri);
  const anahtar = Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8);
  desSifrele(kopya, anahtar);
  assert.notDeepEqual(kopya, veri);
  desCoz(kopya, anahtar);
  assert.deepEqual(kopya, veri);
});

// ---- Gerçek oyun dosyaları (oyun klasörü yoksa atlanır) ----
const oyunVar = fs.existsSync(path.join(OYUN_DIZINI, 'Data'));
const oku = (g: string) => fs.readFileSync(path.join(OYUN_DIZINI, g));

test('gerçek: ACHIEVE_com.tbl (çift şifre) beklenen yapıda', { skip: !oyunVar && 'oyun klasörü yok' }, () => {
  const t = tbldenOku(oku('Data/ACHIEVE_com.tbl'), KS);
  assert.equal(t.sifreleme, 'usko-cift');
  assert.deepEqual(t.sutunTurleri, ['DWORD', 'BYTE', 'INT', 'INT']);
  assert.equal(t.satirlar.length, 68);
});

test('gerçek: Player_experience.tbl INT64 sütunu içerir', { skip: !oyunVar && 'oyun klasörü yok' }, () => {
  const t = tbldenOku(oku('Data/Player_experience.tbl'), KS);
  assert.ok(t.sutunTurleri.includes('INT64'));
});

test('gerçek: Item_Org_us.tbl İngilizce adları içerir (Raptor, Iron Bow)', { skip: !oyunVar && 'oyun klasörü yok' }, () => {
  const t = tbldenOku(oku('Data/Item_Org_us.tbl'), 'windows-1252');
  const adlar = new Set(t.satirlar.flat());
  assert.ok(adlar.has('Raptor') && adlar.has('Iron Bow'));
});

test('gerçek: npcs.tbl eski XOR, MOB.tbl 0x0418 XOR ile açılır', { skip: !oyunVar && 'oyun klasörü yok' }, () => {
  assert.equal(tbldenOku(oku('Data/npcs.tbl'), KS).sifreleme, 'xor-eski');
  assert.equal(tbldenOku(oku('Data/MOB.tbl'), KS).sifreleme, 'xor-0418');
});

test('gerçek: Item_Org_tk.tbl Türkçe metinleri doğru okur ve birebir geri yazılır', { skip: !oyunVar && 'oyun klasörü yok' }, () => {
  const orijinal = oku('Data/Item_Org_tk.tbl');
  const t = tbldenOku(orijinal, KS);
  assert.ok(t.satirlar.some((s) => s.includes('Çatal')));
  const { tablo, ks } = jsondanOku(jsonaCevir(t, 'Data/Item_Org_tk.tbl', KS));
  assert.ok(Buffer.from(tblyeYaz(tablo, ks)).equals(orijinal));
});
