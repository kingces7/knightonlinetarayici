// Savaş paketleri: gerçek yakalamalarla (ornekler/myko-savas.json: Lilith tek vuruşta öldürür; myko-savas-kotest.json: seviye 1 KoTest karşılıklı savaşır, seviye atlar).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketOkuyucu } from './ikili.ts';

import {
  SALDIRI_SONUCU, yenidenDogusCevabi, yenidenDogusIstegi, agirlikDegisti, canDegisti, deneyimDegisti, esyaDustu, hedefCan, hedefCanIstegi, olum, saldiriIstegi, saldiriSonucu, seviyeDegisti,
} from './savas.ts';

const klasor = path.dirname(fileURLToPath(import.meta.url));
type Kayit = { asama: string; opcode: number; hex: string };
const yukle = (ad: string) => JSON.parse(fs.readFileSync(path.join(klasor, 'ornekler', ad), 'utf8')) as { hedefId: number; lilithSoketNo: number; paketler: Kayit[] };
const bayt = (h: string) => Uint8Array.from(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const lilith = yukle('myko-savas.json'), kotest = yukle('myko-savas-kotest.json');
const tum = (j: { paketler: Kayit[] }, op: number) => j.paketler.filter((p) => p.opcode === op).map((p) => bayt(p.hex));

test('saldırı isteği: tür 1, sonuç 0, hedef, gecikme, mesafe, 0 (9 bayt, little-endian)', () => {
  const g = saldiriIstegi(0x1fae, 3000, 10);
  assert.deepEqual([...g], [1, 0, 0xae, 0x1f, 0xb8, 0x0b, 10, 0, 0]);
  assert.deepEqual([...hedefCanIstegi(0x1fae)], [0xae, 0x1f, 1]);
});

test('Lilith tek vuruşta öldürür: saldırı sonucu 2 (hedef öldü), ölüm, ganimet torbası, deneyim', () => {
  const s = saldiriSonucu(tum(lilith, 0x08)[0]);
  assert.deepEqual(s, { tur: 1, sonuc: SALDIRI_SONUCU.HEDEF_OLDU, saldiran: lilith.lilithSoketNo, hedef: lilith.hedefId });
  assert.deepEqual(olum(tum(lilith, 0x11)[0]), { id: lilith.hedefId });
  const d = esyaDustu(tum(lilith, 0x23)[0]);
  assert.equal(d.canavarId, lilith.hedefId); assert.ok(d.torbaNo > 0);
  const e = deneyimDegisti(tum(lilith, 0x1a)[0]);
  assert.equal(e.tur, 1); assert.equal(e.deneyim, 264885149n); // 264885133 + 16 (seviye 6 canavar)
});

test('hedef bilgisi (0x22): seçince tam can (32/32, hasar yok); vuruştan sonra hasar işaretli gelir', () => {
  const secim = hedefCan(tum(lilith, 0x22)[0]);
  assert.deepEqual([secim.id, secim.enCok, secim.can, secim.hasar, secim.hedefTuru, secim.kalan], [lilith.hedefId, 32, 32, 0, 1, 0]);
  const vurus = tum(kotest, 0x22).map((g) => hedefCan(g));
  assert.deepEqual(vurus.slice(1).map((v) => v.can), [25, 18, 11, 4]); // 32 → 25 → 18 → 11 → 4 (her vuruş 7)
  for (const v of vurus.slice(1)) { assert.equal(v.hasar, 7); assert.equal(v.enCok, 32); assert.equal(v.saldiran, kotest.lilithSoketNo); assert.equal(v.kalan, 0); }
});

test('karşılıklı savaş: oyuncu saldırıları isabet (1) ya da ıska (0); canavar saldırıları ayrı kimlikten gelir', () => {
  const sonuclar = tum(kotest, 0x08).map((g) => saldiriSonucu(g));
  const bizim = sonuclar.filter((s) => s.saldiran === kotest.lilithSoketNo);
  const canavar = sonuclar.filter((s) => s.saldiran === kotest.hedefId);
  assert.equal(bizim[0].sonuc, SALDIRI_SONUCU.ISKA);              // ilk vuruş ıskaladı
  assert.ok(bizim.slice(1, 5).every((s) => s.sonuc === SALDIRI_SONUCU.ISABET && s.hedef === kotest.hedefId));
  assert.equal(bizim.at(-1)!.sonuc, SALDIRI_SONUCU.HEDEF_OLDU);   // son vuruş öldürdü
  assert.ok(canavar.length >= 3 && canavar.every((s) => s.hedef === kotest.lilithSoketNo && s.sonuc === SALDIRI_SONUCU.ISABET));
});

test('kendi canımız (0x17): canavar vurdukça düşer; sonraki seviye atlamada tam dolar (saldıran 0xFFFF)', () => {
  const canlar = tum(kotest, 0x17).map((g) => canDegisti(g));
  assert.deepEqual(canlar.slice(0, 3).map((c) => [c.enCok, c.can, c.saldiran]), [[38, 36, kotest.hedefId], [38, 34, kotest.hedefId], [38, 32, kotest.hedefId]]);
  assert.deepEqual(canlar.at(-1), { enCok: 44, can: 44, saldiran: 0xffff });
});

test('seviye atlama (0x1B): KoTest 1 → 2; paket tamamen tüketilir; azami can/mana ve deneyim yeni değerler', () => {
  const s = seviyeDegisti(tum(kotest, 0x1b)[0]);
  assert.equal(s.kalan, 0);
  assert.deepEqual([s.id, s.seviye, s.bosPuan, s.azamiDeneyim, s.deneyim], [kotest.lilithSoketNo, 2, 3, 13n, 10n]);
  assert.deepEqual([s.enCokCan, s.can, s.enCokMana, s.mana], [44, 44, 24, 24]);
  assert.equal(s.azamiAgirlik, 3100);
});

test('ölüm, torba, ağırlık (kısa paketler)', () => {
  assert.deepEqual(olum(tum(kotest, 0x11)[0]), { id: kotest.hedefId });
  assert.equal(esyaDustu(tum(kotest, 0x23)[0]).torbaNo, 3);
  assert.deepEqual(agirlikDegisti(tum(kotest, 0x54)[0]), { agirlik: 389 });
  assert.throws(() => new PaketOkuyucu(bayt('01')).u16(), RangeError);
});

test('yeniden doğma isteği ve cevabı', () => {
  assert.deepEqual([...yenidenDogusIstegi()], [1]);
  assert.deepEqual(yenidenDogusCevabi(bayt('0811160855 00'.replace(' ', ''))), { x: 436, z: 207, y: 8.5 });
});
