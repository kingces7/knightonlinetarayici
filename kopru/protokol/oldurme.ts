// Oyuncu öldürme bildirimi (WIZ_KILLASSIST 0xC8). Kaynak: GameServer/UserHealtMagicSpSystem.cpp (KA_KillUpdate, KA_ResetCheck).
// Sunucu yalnızca PK bölgelerinde (Ardream, Ronark Land, özel etkinlik bölgeleri) öldüren oyuncuya yollar.
import { PaketOkuyucu } from './ikili.ts';

export interface OldurmeBildirimi {
  /** 1 kill, 2 yardım. */
  tur: number;
  /** Kill için alt tür: 1 yeni öldürme (seri sayısı ile), 2 sayaç sıfırlandı (15 dk sessizlik ya da bölge değişimi), 3 parti bildirimi (her 10 öldürmede). */
  alt: number;
  /** Alt 1: kesintisiz (30 sn içinde) öldürme serisi; alt 3: toplam öldürme. */
  sayi?: number;
  /** Alt 1/3: öldüren oyuncunun adı. */
  ad?: string;
}
/** `u8 tür, u8 alt; alt 1: u32 1, string(2 bayt uzunluk) ad, u8 1, u32 seri; alt 3: u32 1, string ad, u8 ulus, u32 toplam`. */
export function oldurmeBildirimi(govde: Uint8Array): OldurmeBildirimi {
  const o = new PaketOkuyucu(govde), tur = o.u8(), alt = o.u8();
  if (tur !== 1) return { tur, alt };
  if (alt === 1) { o.u32(); const ad = o.yazi(); o.u8(); return { tur, alt, ad, sayi: o.u32() }; }
  if (alt === 3) { o.u32(); const ad = o.yazi(); o.u8(); return { tur, alt, ad, sayi: o.u32() }; }
  return { tur, alt };
}
