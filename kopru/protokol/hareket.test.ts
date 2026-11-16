import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HareketGonderici, YANKI } from './hareket.ts';
import { PaketOkuyucu } from './ikili.ts';

interface Cozulmus { vx: number; vz: number; vy: number; hiz: number; yanki: number; x: number; z: number; y: number }
const coz = (g: Uint8Array): Cozulmus => { const o = new PaketOkuyucu(g); return { vx: o.u16(), vz: o.u16(), vy: o.u16(), hiz: o.i16(), yanki: o.u8(), x: o.u16(), z: o.u16(), y: o.u16() }; };

/** Sunucunun MoveProcess doğrulamasının aynası: kuralı çiğneyen paket olursa mesaj döndürür. */
class SunucuDogrulayici {
  oncekiYanki = -1; ihlal: string[] = [];
  kontrol(p: Cozulmus, azamiHiz = 45): void {
    if (![0, 1, 3].includes(p.yanki)) this.ihlal.push(`yanlış yankı ${p.yanki} (bağlantı kesilir)`);
    const durağan = p.vx === p.x && p.vz === p.z && p.vy === p.y;
    if (!durağan && ((p.yanki !== 0 && p.hiz === 0) || (this.oncekiYanki === 0 && p.yanki === 0))) this.ihlal.push(`şüpheli paket: yankı ${p.yanki}, hız ${p.hiz}, önceki yankı ${this.oncekiYanki}`);
    if (Math.abs(p.hiz) > azamiHiz) this.ihlal.push(`hız ${p.hiz} > ${azamiHiz} (bağlantı kesilir)`);
    // Aynı yankı 0 art arda iki kez: durağan olsa bile istenmez (gereksiz)
    this.oncekiYanki = p.yanki;
  }
}

function simule(adimlar: Array<{ sure: number; hiz: number; yonX?: number; yonZ?: number }>, azamiHiz10 = 45, fps = 60) {
  const paketler: Cozulmus[] = []; const d = new SunucuDogrulayici();
  const g = new HareketGonderici((govde) => { const p = coz(govde); paketler.push(p); d.kontrol(p, azamiHiz10); }, azamiHiz10);
  let x = 100, z = 200; const dt = 1 / fps;
  g.guncelle(x, z, 5, dt);
  for (const a of adimlar) {
    const n = Math.round(a.sure * fps);
    for (let i = 0; i < n; i++) { x += (a.yonX ?? 1) * a.hiz * dt; z += (a.yonZ ?? 0) * a.hiz * dt; g.guncelle(x, z, 5, dt); }
  }
  return { paketler, ihlal: d.ihlal, son: { x, z } };
}

test('düz yürüyüş: başla (1) → saniyede bir sürüyor (3) → dur (0); sunucu kuralları çiğnenmez', () => {
  const { paketler, ihlal } = simule([{ sure: 3.2, hiz: 4.5 }, { sure: 1, hiz: 0 }]);
  assert.deepEqual(ihlal, []);
  const yankilar = paketler.map((p) => p.yanki);
  assert.equal(yankilar[0], YANKI.BASLADI);
  assert.equal(yankilar.at(-1), YANKI.DURDU);
  assert.ok(yankilar.slice(1, -1).every((y) => y === YANKI.SURUYOR));
  const sureyen = yankilar.filter((y) => y === YANKI.SURUYOR).length;
  assert.ok(sureyen >= 2 && sureyen <= 4, `sürüyor sayısı ${sureyen}`); // ~3,2 sn → saniyede bir
  assert.equal(paketler[0].hiz, 45);
  const son = paketler.at(-1)!; assert.equal(son.hiz, 0); assert.deepEqual([son.vx, son.vz], [son.x, son.z]); // durunca varış = şimdiki konum
});

test('varış noktası, yürüme yönünde yaklaşık 1 sn ilerisidir (×10 tam sayı)', () => {
  const { paketler } = simule([{ sure: 1.5, hiz: 4.5 }]);
  const p = paketler[0];
  assert.ok(Math.abs((p.vx - p.x) - 45) <= 2, `fark ${p.vx - p.x}`); // 4,5 m = 45 birim
  assert.ok(Math.abs(p.vz - p.z) <= 1);
});

test('dur-kalk-dur: art arda iki "durdu" paketi asla yollanmaz', () => {
  const { paketler, ihlal } = simule([{ sure: 1, hiz: 4.5 }, { sure: 2, hiz: 0 }, { sure: 1, hiz: 4.5 }, { sure: 1, hiz: 0 }, { sure: 1, hiz: 0 }]);
  assert.deepEqual(ihlal, []);
  const yankilar = paketler.map((p) => p.yanki);
  for (let i = 1; i < yankilar.length; i++) assert.ok(!(yankilar[i] === 0 && yankilar[i - 1] === 0), `art arda durdu: ${yankilar.join(',')}`);
  assert.equal(yankilar.filter((y) => y === YANKI.BASLADI).length, 2);
  assert.equal(yankilar.filter((y) => y === YANKI.DURDU).length, 2);
});

test('yön değişince beklemeden "sürüyor" yollanır', () => {
  const { paketler, ihlal } = simule([{ sure: 0.4, hiz: 4.5, yonX: 1, yonZ: 0 }, { sure: 0.4, hiz: 4.5, yonX: 0, yonZ: 1 }]);
  assert.deepEqual(ihlal, []);
  assert.deepEqual(paketler.map((p) => p.yanki), [YANKI.BASLADI, YANKI.SURUYOR]); // 0,8 sn'de saniyelik aralık dolmadan yön değişimiyle
});

test('hız sınırı: normal sınıfta en çok 45, savaşçıda 67 (koşu + sprint)', () => {
  const normal = simule([{ sure: 1, hiz: 6.75 }], 45);
  assert.deepEqual(normal.ihlal, []);
  assert.ok(normal.paketler.every((p) => Math.abs(p.hiz) <= 45));
  const savasci = simule([{ sure: 1, hiz: 6.7 }], 67);
  assert.deepEqual(savasci.ihlal, []);
  assert.equal(savasci.paketler[0].hiz, 67);
});

test('yavaş yürüme (yürü modu ~2,25 m/sn): hız ~22, yankı ≠ 0 iken hız hiç 0 olmaz', () => {
  const { paketler, ihlal } = simule([{ sure: 2.5, hiz: 2.25 }, { sure: 0.5, hiz: 0 }]);
  assert.deepEqual(ihlal, []);
  assert.ok(Math.abs(paketler[0].hiz - 22) <= 1, `hız ${paketler[0].hiz}`);
});

test('yerinde dururken hiç paket yollanmaz; ilk kare yalnızca konumu kaydeder', () => {
  const { paketler } = simule([{ sure: 3, hiz: 0 }]);
  assert.equal(paketler.length, 0);
});

test('titreme/tek kare duraksama "durdu" üretmez', () => {
  const paketler: number[] = [];
  const g = new HareketGonderici((_g, y) => paketler.push(y));
  let x = 0; const dt = 1 / 60;
  g.guncelle(x, 0, 0, dt);
  for (let i = 0; i < 20; i++) { x += 4.5 * dt; g.guncelle(x, 0, 0, dt); }
  g.guncelle(x, 0, 0, dt); g.guncelle(x, 0, 0, dt); // 2 kare duraksama (33 ms)
  for (let i = 0; i < 20; i++) { x += 4.5 * dt; g.guncelle(x, 0, 0, dt); }
  assert.deepEqual(paketler, [YANKI.BASLADI]);
});
