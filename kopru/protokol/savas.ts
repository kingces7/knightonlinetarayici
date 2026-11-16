// Savaş paketleri (Aşama 5). Kaynak: GameServer/AttackHandler.cpp (CUser::Attack), User.cpp (SendTargetHP), UserLevelExperienceSystem.cpp, Unit.cpp.
// Hasarı, isabeti ve ölümü SUNUCU belirler; istemci yalnızca saldırı ister ve sonuçları gösterir.
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** `WIZ_ATTACK` tür baytı (kaynakta `LONG_ATTACK` = 1; yakın dövüş saldırısında da 1 kullanılır). */
export const SALDIRI_TURU = 1;

/** Saldırı sonucu (`AttackResult`). */
export const SALDIRI_SONUCU = { ISKA: 0, ISABET: 1, HEDEF_OLDU: 2, HEDEF_OLDU_TAMAM: 3, BUYU_HEDEF_OLDU: 4 } as const;

/**
 * Saldırı isteği (client → sunucu, `WIZ_ATTACK 0x08`): `u8 tür, u8 sonuç (0), i16 hedef, i16 gecikme, i16 mesafe, u8 0`.
 * Sunucu kontrolleri: gecikme ≥ silahın gecikmesi (eşya tablosu `Delay`, ör. 114; elde silah yoksa ≥ 100), mesafe ≤ silahın menzili (`Range`, ör. 10);
 * iki saldırı arası en az 0,9 sn; gerçek uzaklığı sunucu kendi hesaplar. Aksi hâlde istek SESSİZCE yok sayılır.
 */
export function saldiriIstegi(hedefId: number, gecikme: number, mesafe: number): Uint8Array {
  return new PaketYazici().u8(SALDIRI_TURU).u8(0).i16(hedefId).i16(gecikme).i16(mesafe).u8(0).baytlar();
}

/** Hedef bilgisi isteği (client → sunucu, `WIZ_TARGET_HP 0x22`): hedef seçilince yollanır; cevap `hedefCan` ile aynı biçimde gelir. */
export function hedefCanIstegi(hedefId: number, yanki = 1): Uint8Array {
  return new PaketYazici().u16(hedefId).u8(yanki).baytlar();
}

/**
 * `WIZ_ATTACK (0x08)` (sunucu → bölge): bir saldırının sonucu. Oyuncu saldırısında sonda ek bir `u8` vardır, canavar saldırısında yoktur.
 * `saldiran` ve `hedef` oyuncu soket numarası ya da canavar/NPC kimliğidir.
 */
export function saldiriSonucu(govde: Uint8Array): { tur: number; sonuc: number; saldiran: number; hedef: number } {
  const o = new PaketOkuyucu(govde);
  return { tur: o.u8(), sonuc: o.u8(), saldiran: o.u16(), hedef: o.u16() };
}

/**
 * `WIZ_TARGET_HP (0x22)` (sunucu → client): hedefin canı. `hasar` > 0 ise bu istekte alınan hasardır (sunucu eksi işaretli yollar).
 * `hedefTuru`: 1 canavar, 2 NPC, 3 bot, 4 oyuncu.
 */
export function hedefCan(govde: Uint8Array): { id: number; yanki: number; enCok: number; can: number; hasar: number; saldiran: number; hedefTuru: number; kalan: number } {
  const o = new PaketOkuyucu(govde);
  const id = o.u16(), yanki = o.u8(), enCok = o.i32(), can = o.i32(), ham = o.i16(), saldiran = o.u16(), hedefTuru = o.u8();
  return { id, yanki, enCok, can, hasar: ham < 0 ? -ham : 0, saldiran, hedefTuru, kalan: o.kalan };
}

/** `WIZ_HP_CHANGE (0x17)` (sunucu → client): kendi canımız. `saldiran`: vuran canavar/oyuncu kimliği (0xFFFF = kimse, ör. seviye atlama/iyileşme). */
export function canDegisti(govde: Uint8Array): { enCok: number; can: number; saldiran: number } {
  const o = new PaketOkuyucu(govde);
  return { enCok: o.i16(), can: o.i16(), saldiran: o.u16() };
}

/** `WIZ_DEAD (0x11)`: bir canavarın/oyuncunun ölüm animasyonu (bölgeye yayınlanır). */
export function olum(govde: Uint8Array): { id: number } { return { id: new PaketOkuyucu(govde).u16() }; }

/** `WIZ_EXP_CHANGE (0x1A)`: `u8 tür (1), u64 yeni toplam deneyim`. */
export function deneyimDegisti(govde: Uint8Array): { tur: number; deneyim: bigint } {
  const o = new PaketOkuyucu(govde);
  return { tur: o.u8(), deneyim: o.u64() };
}

/** `WIZ_LEVEL_CHANGE (0x1B)` (bölgeye yayınlanır): seviye atlayan oyuncunun yeni değerleri. */
export interface SeviyeDegisimi {
  id: number; seviye: number; bosPuan: number; bosSkillPuani: number; azamiDeneyim: bigint; deneyim: bigint;
  enCokCan: number; can: number; enCokMana: number; mana: number; azamiAgirlik: number; agirlik: number;
}
export function seviyeDegisti(govde: Uint8Array): SeviyeDegisimi & { kalan: number } {
  const o = new PaketOkuyucu(govde);
  const id = o.u16(), seviye = o.u8(), bosPuan = o.i16(), bosSkillPuani = o.u8(), azamiDeneyim = o.u64(), deneyim = o.u64();
  const enCokCan = o.i16(), can = o.i16(), enCokMana = o.i16(), mana = o.i16(), azamiAgirlik = o.u32(), agirlik = o.u32();
  return { id, seviye, bosPuan, bosSkillPuani, azamiDeneyim, deneyim, enCokCan, can, enCokMana, mana, azamiAgirlik, agirlik, kalan: o.kalan };
}

/** `WIZ_ITEM_DROP (0x23)`: ölen canavarın yanında bir ganimet torbası oluştu: `u16 canavar kimliği, u32 torba no, u8 12`. Torba `WIZ_BUNDLE_OPEN_REQ (0x24)` ile açılır. */
export function esyaDustu(govde: Uint8Array): { canavarId: number; torbaNo: number } {
  const o = new PaketOkuyucu(govde);
  return { canavarId: o.u16(), torbaNo: o.u32() };
}

/** `WIZ_WEIGHT_CHANGE (0x54)`: taşınan ağırlık. */
export function agirlikDegisti(govde: Uint8Array): { agirlik: number } { return { agirlik: new PaketOkuyucu(govde).u32() }; }

/** Yeniden doğma isteği (client → sunucu, `WIZ_REGENE 0x12`): `u8 tür` (1 = şehirde doğ). Sunucu canı doldurur (0x17) ve `yenidenDogusCevabi` yollar. */
export function yenidenDogusIstegi(tur = 1): Uint8Array { return new PaketYazici().u8(tur).baytlar(); }

/** `WIZ_REGENE (0x12)` cevabı: yeniden doğduğumuz yer (x, z, y ×10 → metre). */
export function yenidenDogusCevabi(govde: Uint8Array): { x: number; z: number; y: number } {
  const o = new PaketOkuyucu(govde);
  return { x: o.u16() / 10, z: o.u16() / 10, y: o.u16() / 10 };
}
