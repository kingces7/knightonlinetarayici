import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BICIM, dxtOku, rgbayaCevir, surum7Donustur, tctOku, veriDuzeni, type Doku } from './dxt.ts';
import { OYUN_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';

const oyunVar = fs.existsSync(path.join(OYUN_DIZINI, 'Item', 'item.hdr'));
const atla = !oyunVar && 'oyun klasörü yok';

// Sürüm 3 (şifresiz) kopyası olan sürüm 7 dokular: [sürüm 7 olan, aynı resmin düz kopyası]. İkisi de gerçek oyun dosyası.
const CIFTLER: [string, string][] = [
  ['fx\\object\\z_lv2009_aallll\\dfance_up_silbon_red2.dxt', 'fx\\object\\dfance_up_silbon\\dfance_up_silbon_red2.dxt'], // DXT3 + 16 bit kopya
  ['fx\\billboard\\quest_re_plus\\ja_toy_2009_c04_0000.dxt', 'fx\\billboard\\z_2009_reup\\ja_toy_2009_c04_0000.dxt'], // A8R8G8B8 (satır satır)
  ['fx\\billboard\\caossss_b\\z_spreadmywings_s_0000.dxt', 'fx\\billboard\\newwepon_a01\\z_spreadmywings_s_0000.dxt'], // DXT3 16x16
];

function ntf(b: Buffer): number { return b.indexOf('NTF'); }

test('sürüm 7: anahtar akışının ilk baytları bilinen düz metinle eşleşiyor', () => {
  // Düz metni sıfır olan veriyi "şifrelemek" anahtar akışını verir. Bilinen akış, sürüm 3 kopyası olan
  // dosyalardan (şifreli ^ düz) elde edilmişti: 904d4f1f13a9e5f3f8de11d1f2981a33cade2324524f0325d68c25b3719f0a2c
  const v = new Uint8Array(64);
  surum7Donustur(v, BICIM.DXT3, 16, 16, false);
  assert.equal(Buffer.from(v.subarray(0, 32)).toString('hex'), '904d4f1f13a9e5f3f8de11d1f2981a33cade2324524f0325d68c25b3719f0a2c');
});

test('sürüm 7: şifreleme ile çözme birbirinin tersi (kayıpsız gidiş-dönüş)', () => {
  for (const bicim of [BICIM.DXT1, BICIM.DXT3, BICIM.DXT5, BICIM.A8R8G8B8, BICIM.A1R5G5B5]) {
    const d = veriDuzeni(bicim, 64, 32, true);
    const asil = new Uint8Array(d.toplam).map((_, i) => (i * 31 + 7) & 255);
    const v = Uint8Array.from(asil);
    surum7Donustur(v, bicim, 64, 32, true);
    assert.notDeepEqual(v, asil);
    surum7Donustur(v, bicim, 64, 32, true);
    assert.deepEqual(v, asil);
  }
});

test('veri düzeni: mipmap zinciri 4x4 e kadar, DXT için yarım boyutlu 16 bit kopya var', () => {
  const d = veriDuzeni(BICIM.DXT3, 64, 64, true);
  assert.deepEqual(d.ana.map((p) => p.boy), [4096, 1024, 256, 64, 16]);
  assert.deepEqual(d.yedek.map((p) => p.boy), [2048, 512, 128, 32]);
  assert.equal(d.toplam, 8176);
  const u = veriDuzeni(BICIM.A8R8G8B8, 64, 64, true);
  assert.equal(u.toplam, 21824);
  assert.equal(u.yedek.length, 0);
});

test('gerçek: çözülen sürüm 7 doku, aynı resmin şifresiz (sürüm 3) kopyasıyla bayt bayt aynı', { skip: atla }, () => {
  const od = new OyunDosyalari();
  let karsilastirilan = 0;
  for (const [a, b] of CIFTLER) {
    const A = od.oku(a), B = od.oku(b);
    assert.equal(A[ntf(A) + 3], 7, `${a} sürüm 7 değil`);
    assert.equal(B[ntf(B) + 3], 3, `${b} sürüm 3 değil`);
    const da = dxtOku(A), db = dxtOku(B);
    assert.equal(da.genislik, db.genislik);
    assert.equal(da.bicim, db.bicim);
    assert.ok(Buffer.from(da.veri).equals(Buffer.from(db.veri)), `${a}: çözülen ana seviye düz kopyayla aynı değil`);
    // Bütün veri bölümü (mipmap zinciri + 16 bit kopya)
    const ha = ntf(A), hb = ntf(B);
    const tum = Uint8Array.from(A.subarray(ha + 20));
    surum7Donustur(tum, da.bicim, da.genislik, da.yukseklik, da.mipmap);
    const d = veriDuzeni(da.bicim, da.genislik, da.yukseklik, da.mipmap);
    // 16 bit kopya düz dosyada başka araçla üretilmiş olabilir; ana zincir kesin aynı olmalı
    const anaBoy = d.ana.reduce((x, p) => x + p.boy, 0);
    assert.ok(Buffer.from(tum.subarray(0, anaBoy)).equals(B.subarray(hb + 20, hb + 20 + anaBoy)));
    karsilastirilan++;
  }
  assert.equal(karsilastirilan, CIFTLER.length);
});

test('gerçek: şifreli dokunun PNG için çözümü anlamlı resim veriyor (komşu piksel farkı küçük)', { skip: atla }, () => {
  const od = new OyunDosyalari();
  const d = dxtOku(od.oku('object\\k_tree_smol_2017_tree01.dxt'));
  assert.equal(d.surum, 7);
  assert.equal(d.genislik, 256);
  const px = rgbayaCevir(d);
  assert.ok(roguruk(px, d.genislik, d.yukseklik) < 30);
});

function roguruk(px: Uint8Array, g: number, y: number): number {
  let t = 0, n = 0;
  for (let j = 0; j < y; j++) for (let i = 0; i + 1 < g; i++) for (let k = 0; k < 3; k++) { t += Math.abs(px[(j * g + i) * 4 + k] - px[(j * g + i + 1) * 4 + k]); n++; }
  return t / n;
}

test('gerçek: .tct renk haritası (sürüm 7) 16 parça, 128x128 A1R5G5B5, anlamlı resim', { skip: atla }, () => {
  const od = new OyunDosyalari();
  const ds = tctOku(od.oku('Zones\\14th_oldmoradon.tct'));
  assert.equal(ds.length, 16);
  for (const d of ds) {
    assert.equal(d.surum, 7);
    assert.equal(d.genislik, 128); assert.equal(d.yukseklik, 128);
    assert.equal(d.bicim, BICIM.A1R5G5B5);
  }
  const ort = ds.map((d) => roguruk(rgbayaCevir(d), 128, 128)).reduce((x, z) => x + z, 0) / ds.length;
  // Renk haritası bilerek gürültülü (≈25); yanlış çözülmüş rastgele veri ≈85 verir.
  assert.ok(ort < 40, `ortalama pürüz ${ort}`);
});

test('gerçek: bütün .dxt/.tct dosyalarının sürüm 7 olanları hatasız çözülüyor ve düzen dosya boyuyla tutuyor', { skip: atla }, () => {
  const od = new OyunDosyalari();
  let say = 0;
  const hatalar: string[] = [];
  for (const u of ['.dxt', '.tct']) for (const y of od.listele(u)) {
    const b = od.oku(y); const h = ntf(b);
    if (h < 0 || b[h + 3] !== 7) continue;
    say++;
    try {
      let ds: Doku[];
      if (u === '.tct') ds = tctOku(b);
      else {
        const d = dxtOku(b);
        ds = [d];
        const duzen = veriDuzeni(d.bicim, d.genislik, d.yukseklik, d.mipmap);
        if (b.length - h - 20 !== duzen.toplam) hatalar.push(`${y}: düzen ${duzen.toplam} ≠ ${b.length - h - 20}`);
      }
      for (const d of ds) rgbayaCevir(d);
    } catch (e) { hatalar.push(`${y}: ${(e as Error).message}`); }
  }
  assert.deepEqual(hatalar, []);
  assert.equal(say, 588);
});
