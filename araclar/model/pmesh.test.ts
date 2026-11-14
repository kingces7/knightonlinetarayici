import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { opdOku, pmeshOku } from './n3.ts';
import { OYUN_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';

const atla = !fs.existsSync(path.join(OYUN_DIZINI, 'Zones', '14th_oldmoradon.opd')) && 'oyun klasörü yok';

test('pmesh: kademeli ağ doğru açılıyor (her köşe kullanılıyor, UV çökmüyor)', { skip: atla }, () => {
  const od = new OyunDosyalari();
  const opd = opdOku(od.oku('Zones/14th_oldmoradon.opd'));
  const adlar = new Set<string>();
  for (const n of opd.nesneler) for (const p of n.parcalar) adlar.add(p.mesh);
  let model = 0, kullanilmayan = 0, alan = 0, bozukUv = 0;
  for (const ad of adlar) {
    const m = pmeshOku(od.oku(ad));
    model++;
    const kose = m.konum.length / 3;
    const kul = new Set(m.indeks);
    kullanilmayan += kose - kul.size;
    for (let t = 0; t < m.indeks.length / 3; t++) {
      const i = [m.indeks[t * 3], m.indeks[t * 3 + 1], m.indeks[t * 3 + 2]];
      assert.ok(i.every((v) => v < kose), `${ad}: geçersiz indeks`);
      const P = i.map((v) => [m.konum[v * 3], m.konum[v * 3 + 1], m.konum[v * 3 + 2]]), U = i.map((v) => [m.uv[v * 2], m.uv[v * 2 + 1]]);
      const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
      const a = Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2;
      const ua = Math.abs((U[1][0] - U[0][0]) * (U[2][1] - U[0][1]) - (U[2][0] - U[0][0]) * (U[1][1] - U[0][1])) / 2;
      alan += a; if (a > 0.05 && ua / a < 1e-5) bozukUv += a;
    }
  }
  assert.ok(model > 300);
  // Çökmeler yanlış uygulanırsa (ör. tersten) kullanılmayan köşeler ve çökmüş UV'ler patlar: 2654 köşe / %14,6 → şimdi 0 / %0,5.
  assert.equal(kullanilmayan, 0, 'tam ayrıntıda her köşe bir üçgende kullanılmalı');
  assert.ok(bozukUv / alan < 0.02, `UV'si çökmüş yüzey oranı ${(bozukUv / alan * 100).toFixed(2)}%`);
});

test('pmesh: değişimi olmayan basit model (iki üçgenli dörtgen) aynen okunuyor', { skip: atla }, () => {
  const od = new OyunDosyalari();
  const opd = opdOku(od.oku('Zones/14th_oldmoradon.opd'));
  const yol = [...new Set(opd.nesneler.flatMap((n) => n.parcalar.map((p) => p.mesh)))].find((a) => /transgate01_fire00/i.test(a))!;
  const m = pmeshOku(od.oku(yol));
  assert.equal(m.konum.length / 3, 4);
  assert.equal(m.indeks.length, 6);
});
