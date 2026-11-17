// Karakter durumu: stat puanı harcama (WIZ_POINT_CHANGE 0x28) ve otur/kalk (WIZ_STATE_CHANGE 0x29).
// Kaynak: GameServer/UserSkillStatPointSystem.cpp (PointChange), User.cpp (StateChange). Gerçek Myko sunucusuyla doğrulandı.
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Stat numarası: 1 STR, 2 STA, 3 DEX, 4 INT, 5 CHA. */
export const STAT_ANAHTARLARI = ['str', 'sta', 'dex', 'int', 'cha'] as const;

/** Bir boş puanı stata harca (client → sunucu): `u8 stat numarası (1–5)`. Sunucu puan yoksa ya da stat azamideyse hiç cevap vermez. */
export function statArtirmaIstegi(statNo: number): Uint8Array { return new PaketYazici().u8(statNo).baytlar(); }

export interface StatCevabi { statNo: number; deger: number; azamiCan: number; azamiMana: number; vurus: number; azamiAgirlik: number; can: number; mana: number }
/** Cevap (sunucu → client): `u8 stat no, u16 yeni değer, u16 azami can, u16 azami mana, u16 toplam vuruş, u32 azami ağırlık, u16 can, u16 mana`. */
export function statCevabi(govde: Uint8Array): StatCevabi {
  const o = new PaketOkuyucu(govde);
  return { statNo: o.u8(), deger: o.u16(), azamiCan: o.u16(), azamiMana: o.u16(), vurus: o.u16(), azamiAgirlik: o.u32(), can: o.u16(), mana: o.u16() };
}

/** Durum türü 1 (otur/kalk): `u8 1, u32 durum` — 1 ayakta, 2 oturuyor. Sunucu oturma sırasında can/mana yenilenmesini hızlandırır. */
export const DURUM = { AYAKTA: 1, OTURUYOR: 2 } as const;
export function oturmaIstegi(otur: boolean): Uint8Array { return new PaketYazici().u8(1).u32(otur ? DURUM.OTURUYOR : DURUM.AYAKTA).baytlar(); }
/** Bölgeye yayılan durum paketi: `u16 oyuncu, u8 tür, u32 durum`. */
export function durumPaketi(govde: Uint8Array): { id: number; tur: number; durum: number } { const o = new PaketOkuyucu(govde); return { id: o.u16(), tur: o.u8(), durum: o.u32() }; }
