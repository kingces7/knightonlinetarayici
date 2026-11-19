import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, DEPO_KOKU } from '../ortak/yollar.ts';
import { YU, YV, dikisMaliyeti, haritaYukle, hipC, hipE, hipO, type Don } from './karo-denetim.ts';

test('karo yönü: hipO orijinal tablonun köşe UV\'lerini birebir verir (A=[2], B=[0], C=[1], D=[3])', () => {
  for (let d = 0; d < 8; d++) {
    const kose: [number, number, number][] = [[0, 0, 2], [0, 1, 0], [1, 1, 1], [1, 0, 3]]; // a, b, tablo sütunu
    for (const [a, b, c] of kose) {
      const [u, v] = hipO(d, a, b);
      assert.equal(u, YU[d][c], `yön ${d} köşe (${a},${b}) u`);
      assert.equal(v, YV[d][c], `yön ${d} köşe (${a},${b}) v`);
    }
  }
});

test('karo yönü: client shader\'ındaki YU/YV dizileri orijinal tabloyla aynı (geri dönüş koruması)', () => {
  const kaynak = fs.readFileSync(path.join(DEPO_KOKU, 'client', 'src', 'dunya', 'arazi.ts'), 'utf8');
  const dizi = (ad: string) => {
    const m = kaynak.match(new RegExp(`const float ${ad}\\[32\\] = float\\[32\\]\\(([^)]*)\\)`));
    assert.ok(m, `${ad} shader'da bulunamadı`);
    return m![1].split(',').map((s) => Number(s.trim().replace(/\.$/, '')));
  };
  assert.deepEqual(dizi('YU'), YU.flat());
  assert.deepEqual(dizi('YV'), YV.flat());
  // yonUv tablodan dönüşümsüz örnekler: "u = mix(mix(YU[d+2], YU[d+3], p.x), mix(YU[d], YU[d+1], p.x), p.y)"
  assert.match(kaynak, /return vec2\(u, v\);/);
});

const klasor = (ad: string) => path.join(CIKTI_DIZINI, 'web', 'harita', ad, 'karolar.bin');
const ata = !fs.existsSync(klasor('karus2004')) || !fs.existsSync(klasor('14th_oldmoradon'));
test('karo yönü: gerçek haritalarda orijinal tablo en az dikiş hatasını verir (Luferson, eski Moradon)', { skip: ata && 'dönüştürülmüş harita yok' }, () => {
  for (const ad of ['karus2004', '14th_oldmoradon']) {
    const h = haritaYukle(ad);
    const olc = (f: Don) => { let top = 0, say = 0; for (let x = 0; x < h.k - 1; x += 3) for (let z = 0; z < h.k - 1; z += 3) { const m = dikisMaliyeti(h, [x, z], 0, f); if (m >= 0) { top += m; say++; } } return top / say; };
    const o = olc(hipO), c = olc(hipC), e = olc(hipE);
    assert.ok(o < c && o < e, `${ad}: O ${o.toFixed(2)} C ${c.toFixed(2)} E ${e.toFixed(2)}`);
    // Global dönüşümler (dikey ayna, 180°, yatay ayna) dikişleri bozar: kimlik tek doğru yön olmalı
    for (const g of [(u: number, v: number): [number, number] => [u, 1 - v], (u: number, v: number): [number, number] => [1 - u, v], (u: number, v: number): [number, number] => [1 - u, 1 - v], (u: number, v: number): [number, number] => [v, u]]) {
      assert.ok(o < olc((d, a, b) => { const [u, v] = hipO(d, a, b); return g(u, v); }), `${ad}: kimlik global dönüşümlerden iyi olmalı`);
    }
  }
});
