// Sınıf terfisi ve Noah değişimi. Kaynak: GameServer/QuestHandler.cpp (PromoteUserNovice → WIZ_CLASS_CHANGE 0x34 alt 6), WIZ_GOLD_CHANGE 0x4A.
import { PaketOkuyucu } from './ikili.ts';

export interface SinifDegisti { alt: number; /** Alt 6: yeni sınıf numarası (ulus × 100 + sınıf) ve terfi eden oyuncunun kimliği. */ sinif?: number; id?: number }
/** `u8 alt`; alt 6: `u16 yeni sınıf, u16 kimlik`. */
export function sinifDegisti(govde: Uint8Array): SinifDegisti {
  const o = new PaketOkuyucu(govde), alt = o.u8();
  return alt === 6 ? { alt, sinif: o.u16(), id: o.u16() } : { alt };
}

/** Noah değişimi: `u8 tür (1 kazanç, 2 harcama…), u32 değişim, u32 yeni toplam`. */
export function altinDegisti(govde: Uint8Array): { tur: number; degisim: number; toplam: number } {
  const o = new PaketOkuyucu(govde); return { tur: o.u8(), degisim: o.u32(), toplam: o.u32() };
}
