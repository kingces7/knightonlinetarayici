// Karakter oluşturma (WIZ_NEW_CHAR 0x02) ve ulus seçimi (WIZ_SEL_NATION 0x05). Kaynak: GameServer/CharacterSelectionHandler.cpp (NewCharToAgent, NewCharValid), shared/globals.h (NEWCHAR_*),
// Veritabanı CREATE_NEW_CHAR. Gerçek Myko sunucusuyla doğrulandı (savaşçı oluşturma; ırk/sınıf kuralları sunucu kaynağından).
import { PaketYazici } from './ikili.ts';

/** Irk → ulus: 1–4 (ve 6) Karus, 11–14 El Morad. */
export const irkUlusu = (irk: number): 1 | 2 => (irk > 10 ? 2 : 1);
/** Sınıf kodu = ulus × 100 + meslek (1 Warrior, 2 Rogue, 3 Mage, 4 Priest). */
export const sinifKodu = (irk: number, meslek: 1 | 2 | 3 | 4): number => irkUlusu(irk) * 100 + meslek;
/** Sunucunun izin verdiği ırk/meslek eşleşmeleri (`NewCharValid`): Kurian/Portu bu sürümde yok. */
export const IRK_MESLEKLERI: Record<number, number[]> = { 1: [1], 2: [2, 4], 3: [3], 4: [3, 4], 11: [1], 12: [1, 2, 3, 4], 13: [1, 2, 3, 4] };
export const IRK_ADI: Record<number, string> = { 1: 'Arch Tuarek', 2: 'Tuarek', 3: 'Wrinkle Tuarek', 4: 'Puri Tuarek', 11: 'Barbarian', 12: 'Human (Male)', 13: 'Human (Female)' };
export const MESLEK_ADI: Record<number, string> = { 1: 'Warrior', 2: 'Rogue', 3: 'Mage', 4: 'Priest' };
export const STAT_TOPLAMI = 300, STAT_EN_AZ = 50;

export interface YeniKarakter { yuva: number; ad: string; irk: number; sinif: number; yuz: number; sac: number; str: number; sta: number; dex: number; int: number; cha: number }
/** İstek (client → sunucu): `u8 yuva (0–3), u16+ad, u8 ırk, u16 sınıf, u8 yüz, u32 saç, 5 × u8 (STR STA DEX INT CHA)`. Toplam tam 300, her stat ≥ 50 olmalı. */
export function yeniKarakterIstegi(k: YeniKarakter): Uint8Array {
  return new PaketYazici().u8(k.yuva).yazi(k.ad).u8(k.irk).u16(k.sinif).u8(k.yuz).u32(k.sac).u8(k.str).u8(k.sta).u8(k.dex).u8(k.int).u8(k.cha).baytlar();
}
/** Cevap: tek bayt hata kodu (0 = başarılı). */
export const YENI_KARAKTER_MESAJLARI: Record<number, string> = {
  1: 'There is no free character slot.', 2: 'Invalid character details.', 3: 'This name is already taken.', 4: 'The character could not be created.', 5: 'This name is not allowed.',
  6: 'This name is not allowed.', 7: 'Invalid race.', 8: 'This race is not supported.', 9: 'Invalid class.', 10: 'Spend all the bonus points first.', 11: 'A stat cannot be below 50.',
};
/** İstemci tarafı ön denetim (sunucu yine de doğrular): hata iletisi ya da null. */
export function karakterDenetle(k: YeniKarakter): string | null {
  if (!k.ad || k.ad.length < 4 || k.ad.length > 20 || !/^[A-Za-z0-9_]+$/.test(k.ad)) return 'The name must be 4–20 letters or digits.';
  if (!(IRK_MESLEKLERI[k.irk] ?? []).includes(k.sinif % 100) || Math.floor(k.sinif / 100) !== irkUlusu(k.irk)) return 'This race cannot use that class.';
  const t = k.str + k.sta + k.dex + k.int + k.cha;
  if (t > STAT_TOPLAMI) return 'Too many stat points.';
  if (t < STAT_TOPLAMI) return 'Spend all the bonus points first.';
  if ([k.str, k.sta, k.dex, k.int, k.cha].some((v) => v < STAT_EN_AZ)) return 'A stat cannot be below 50.';
  return null;
}
/** Ulus seçimi (client → sunucu, yeni hesapta ilk karakterden önce): `u8 ulus` (1 Karus, 2 El Morad). */
export function ulusSecIstegi(ulus: 1 | 2): Uint8Array { return new PaketYazici().u8(ulus).baytlar(); }
