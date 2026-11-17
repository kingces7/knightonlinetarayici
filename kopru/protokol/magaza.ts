// NPC mağazası alım/satım (WIZ_ITEM_TRADE 0x21). Kaynak: GameServer/NPCHandler.cpp (ItemTrade). Gerçek Myko sunucusuyla doğrulandı (ornekler/myko-magaza.json).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Sunucu NPC'ye en çok bu kadar yakınken (m) alım/satım kabul eder (MAX_NPC_RANGE = 11 m). */
export const MAGAZA_MENZILI = 11;
export const MAGAZA_HATALARI: Record<number, string> = { 1: 'The transaction failed.', 2: 'The transaction is not valid.', 3: 'You do not have enough Noah.', 4: 'You cannot carry that much weight.' };

/**
 * Satın alma (client → sunucu): `u8 1, i32 satış grubu, u16 NPC kimliği, u8 adet, her eşya için: i32 eşya no, u8 çanta yuvası (0–27), u16 adet, u8 sayfa, u8 sayfadaki sıra (0–23)`.
 * Çanta yuvası boş olmalı (ya da aynı yığınlanabilir eşya içermeli).
 */
export function satinAlmaIstegi(grup: number, npcId: number, esya: { no: number; yuva: number; adet: number; sayfa: number; sira: number }[]): Uint8Array {
  const y = new PaketYazici().u8(1).i32(grup).u16(npcId).u8(esya.length);
  for (const e of esya) y.i32(e.no).u8(e.yuva).u16(e.adet).u8(e.sayfa).u8(e.sira);
  return y.baytlar();
}
/** Satış (client → sunucu): `u8 2, i32 grup, u16 NPC, u8 adet, her eşya için: i32 eşya no, u8 çanta yuvası, u16 adet`. Fiyat: alış fiyatı / 6 (sunucu hesaplar). */
export function satisIstegi(grup: number, npcId: number, esya: { no: number; yuva: number; adet: number }[]): Uint8Array {
  const y = new PaketYazici().u8(2).i32(grup).u16(npcId).u8(esya.length);
  for (const e of esya) y.i32(e.no).u8(e.yuva).u16(e.adet);
  return y.baytlar();
}

export interface MagazaCevabi { basarili: boolean; hata?: number; altin?: number; fiyat?: number }
/** Cevap (sunucu → client): başarıda `u8 1, u32 toplam Noah, u32 işlem tutarı, u8 satış grubu`; hatada `u8 0, u8 kod`. */
export function magazaCevabi(govde: Uint8Array): MagazaCevabi {
  const o = new PaketOkuyucu(govde);
  if (o.u8() === 0) return { basarili: false, hata: o.u8() };
  return { basarili: true, altin: o.u32(), fiyat: o.u32() };
}
