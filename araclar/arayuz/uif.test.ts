import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lilithOku, UI_TUR, type UiDugum } from './uif.ts';
import { lilithOtomatikCoz } from './lilith.ts';
import { OYUN_DIZINI } from '../ortak/yollar.ts';

const dizin = path.join(OYUN_DIZINI, 'LilithACS');
const atla = !fs.existsSync(dizin) && 'oyun klasörü yok';

function bul(d: UiDugum, id: string): UiDugum | null {
  if (d.id === id) return d;
  for (const c of d.cocuklar) { const r = bul(c, id); if (r) return r; }
  return null;
}

test('lilith: şifre çözme (4 baytlık başlık + 31/32 baytlık RC4 blokları); doku yolu düz metin çıkıyor', { skip: atla }, () => {
  const c = lilithOtomatikCoz(fs.readFileSync(path.join(dizin, 're_el_page_state.lilith')));
  assert.ok(c.toString('latin1').includes('ui_el_myinfo.dxt'));
});

test('uif: karakter durumu penceresi (U) tam okunuyor; beklenen metin alanları ve düğmeler var', { skip: atla }, () => {
  const k = lilithOku(fs.readFileSync(path.join(dizin, 're_el_page_state.lilith')));
  assert.equal(k.id, 'page_state');
  for (const id of ['Text_Level', 'Text_Strength', 'Text_BonusPoint', 'Text_Exp', 'Text_HP']) assert.equal(bul(k, id)?.tur, UI_TUR.string, id);
  const btn = bul(k, 'btn_str')!;
  assert.equal(btn.tur, UI_TUR.button);
  assert.equal(btn.cocuklar.filter((c) => c.tur === UI_TUR.image).length, 4, 'düğme 4 durum resmi içermeli');
});

test('uif: skill (K) ve envanter (I) pencereleri okunuyor', { skip: atla }, () => {
  const s = lilithOku(fs.readFileSync(path.join(dizin, 're_el_skill.lilith')));
  assert.ok(bul(s, 'btn_public') && bul(s, 'string_list_0'));
  const e = lilithOku(fs.readFileSync(path.join(dizin, 're_el_inventory.lilith')));
  assert.ok(bul(e, 'text_gold'));
});

test('uif: .lilith dosyalarının büyük çoğunluğu dosya sonuna kadar tutarlı okunuyor', { skip: atla }, () => {
  const dosyalar = fs.readdirSync(dizin).filter((f) => f.endsWith('.lilith'));
  let tamam = 0;
  for (const f of dosyalar) { try { lilithOku(fs.readFileSync(path.join(dizin, f))); tamam++; } catch { /* 14'ten büyük (yeni) öğe türleri */ } }
  assert.ok(tamam >= dosyalar.length - 4, `${tamam}/${dosyalar.length}`);
});
