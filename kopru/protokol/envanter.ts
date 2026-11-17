// Eşya taşıma/giyme/çıkarma (WIZ_ITEM_MOVE 0x1F). Kaynak: GameServer/ItemHandler.cpp (ItemMove, InventorySystem), User.cpp (SendItemMove).
// Gerçek Myko sunucusuyla doğrulandı (ornekler/myko-envanter.json).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Taşıma yönü (`ItemMovementType`). Çanta yuvası 0–27, giyili yuva 0–13 (sunucudaki konum − 14 / doğrudan). */
export const ESYA_YONU = { CANTADAN_YUVAYA: 1, YUVADAN_CANTAYA: 2, CANTADAN_CANTAYA: 3, YUVADAN_YUVAYA: 4 } as const;

/** İstek (client → sunucu): `u8 1, u8 yön, u32 eşya no (yuvadaki eşyanın TAM numarası), u8 kaynak yuva, u8 hedef yuva`. */
export function esyaTasimaIstegi(yon: number, no: number, kaynak: number, hedef: number): Uint8Array {
  return new PaketYazici().u8(1).u8(yon).u32(no).u8(kaynak).u8(hedef).baytlar();
}

export interface TasimaCevabi {
  basarili: boolean;
  /** Başarıda güncellenen karakter özeti (eşya değişince hesaplanır). */
  hasar?: number; savunma?: number; azamiAgirlik?: number; azamiCan?: number; azamiMana?: number; statEk?: number[]; can?: number; mana?: number;
}
/**
 * Cevap (sunucu → client): `u8 1, u8 sonuç (1 başarılı / 0 hata)`; başarıda: `u16 hasar, u16 savunma, u32 azami ağırlık, u8, u8, u16 azami can, u16 azami mana,
 * 5 × u16 stat eki, 6 × u16 direnç, u32 nakit puan, 7 × u16 direnç, u32 yükseltme ücreti, u16 can, u16 mana`.
 */
export function esyaTasimaCevabi(govde: Uint8Array): TasimaCevabi {
  const o = new PaketOkuyucu(govde); o.u8();
  if (o.u8() === 0) return { basarili: false };
  const hasar = o.u16(), savunma = o.u16(), azamiAgirlik = o.u32(); o.u8(); o.u8();
  const azamiCan = o.u16(), azamiMana = o.u16(), statEk = [o.u16(), o.u16(), o.u16(), o.u16(), o.u16()];
  for (let i = 0; i < 6; i++) o.u16(); o.u32(); for (let i = 0; i < 7; i++) o.u16(); o.u32();
  return { basarili: true, hasar, savunma, azamiAgirlik, azamiCan, azamiMana, statEk, can: o.u16(), mana: o.u16() };
}

/**
 * Eşyayı yok et / çöpe at (WIZ_ITEM_REMOVE 0x3F). Kaynak: GameServer/ItemHandler.cpp (ItemRemove).
 * İstek (client → sunucu): `u8 tür (0 çanta, 1 giyili), u8 yuva (çanta 0–27 / giyili 0–13), u32 eşya (yuvadaki TAM numara)`. Cevap: `u8 1` başarılı, `u8 0` hata.
 * Sunucu silinen (yığınlanamayan) eşyayı bir süre geri alınabilir diye saklayabilir (trashitem ayarı).
 */
export function esyaSilmeIstegi(giyili: boolean, yuva: number, no: number): Uint8Array { return new PaketYazici().u8(giyili ? 1 : 0).u8(yuva).u32(no).baytlar(); }
export function esyaSilmeCevabi(govde: Uint8Array): boolean { return new PaketOkuyucu(govde).u8() === 1; }

/**
 * Yığın adedi değişti (WIZ_ITEM_COUNT_CHANGE 0x3D): ok atınca, iksir içince… Biçim: `u16 kayıt sayısı`, her kayıt `u8 tür (1 çanta), u8 çanta yuvası (0–27), u32 eşya, u16 yeni adet, u32 ?, u16 dayanıklılık, …`.
 * Gerçek Myko sunucusuyla doğrulandı (Archery: 200 → 199 ok).
 */
export function esyaAdediDegisti(govde: Uint8Array): { yuva: number; no: number; adet: number }[] {
  const o = new PaketOkuyucu(govde); const n = o.u16(); const sonuc: { yuva: number; no: number; adet: number }[] = [];
  for (let i = 0; i < n && o.kalan >= 14; i++) { o.u8(); const yuva = o.u8(), no = o.u32(), adet = o.u16(); o.u32(); o.u16(); sonuc.push({ yuva, no, adet }); }
  return sonuc;
}
