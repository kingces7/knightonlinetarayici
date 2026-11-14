import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chrOku } from './karakter.ts';
import { OYUN_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';

const atla = !fs.existsSync(path.join(OYUN_DIZINI, 'Data', 'NPC_Looks.tbl')) && 'oyun klasörü yok';
const ad = (yol: string) => yol.toLowerCase().replaceAll(String.fromCharCode(92), '/').split('/').pop();

test('n3chr: NPC "Hera" montaj dosyasından iskelet, 5 parça ve animasyon okunuyor', { skip: atla }, () => {
  const c = chrOku(new OyunDosyalari().oku('chr/npc_mo_hera.n3chr'));
  assert.equal(c.ad, 'npc_mo_hera');
  assert.equal(ad(c.iskelet), 'npc_mo_hera.n3joint');
  assert.deepEqual(c.parcalar.map(ad), ['npc_mo_hera_hair.n3cpart', 'npc_mo_hera_face.n3cpart', 'npc_mo_hera_upper.n3cpart', 'npc_mo_hera_lower.n3cpart', 'npc_mo_hera_handfeet.n3cpart']);
  assert.equal(ad(c.animasyon), 'npc_mo_hera.n3anim');
});

test('n3chr: bozuk veri anlamlı hata veriyor', () => {
  assert.throws(() => chrOku(Buffer.alloc(64)), /iskelet adı bulunamadı/);
});
