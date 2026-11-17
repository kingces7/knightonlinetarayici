// NPC bankası / depo (WIZ_WAREHOUSE 0x45). Kaynak: GameServer/WareHouse.cpp (WarehouseProcess). Gerçek Myko sunucusuyla doğrulandı (ornekler/myko-banka.json).
// Sunucu, bankayı açabilmek için hedeflenen NPC'nin (WIZ_TARGET_HP 0x22 ile seçilen) yakında bir banka NPC'si olmasını ister (≤ 11 m).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

export const BANKA_ISLEMI = { AC: 1, YATIR: 2, CEK: 3, BANKA_ICI_TASI: 4, CANTA_ICI_TASI: 5 } as const;
export const BANKA_YUVASI = 192; // 8 sayfa × 24
export const SAYFA_YUVASI = 24;
export const ALTIN_NO = 900000000;

/** Bankayı aç (client → sunucu): `u8 1`. */
export function bankaAcIstegi(): Uint8Array { return new PaketYazici().u8(BANKA_ISLEMI.AC).baytlar(); }

/**
 * Yatır/çek (client → sunucu): `u8 işlem, u16 NPC, u32 eşya (Noah = 900000000), u8 sayfa, u8 kaynak yuva, u8 hedef yuva, u32 adet`.
 * Yatırırken kaynak = çanta yuvası (0–27), hedef = sayfadaki yuva (0–23); çekerken tersi. Noah'ta yuvalar 0 kalır, adet = miktar.
 */
export function bankaIslemIstegi(islem: number, npcId: number, no: number, sayfa: number, kaynak: number, hedef: number, adet: number): Uint8Array {
  return new PaketYazici().u8(islem).u16(npcId).u32(no).u8(sayfa).u8(kaynak).u8(hedef).u32(adet).baytlar();
}

export interface BankaEsyasi { no: number; adet: number }
export interface BankaCevabi { islem: number; basarili: boolean; altin?: number; yuvalar?: (BankaEsyasi | null)[] }
/**
 * Cevap (sunucu → client): işlemlerde `u8 işlem, u8 sonuç` (1 başarılı). Açılışta `u8 1, u8 1, u32 bankadaki Noah` ve 192 yuva:
 * `u32 eşya, u16 dayanıklılık, u16 adet, u8 bayrak, u32 benzersiz no, u32 bitiş zamanı` (17 bayt).
 */
export function bankaCevabi(govde: Uint8Array): BankaCevabi {
  const o = new PaketOkuyucu(govde), islem = o.u8(), sonuc = o.u8();
  if (islem !== BANKA_ISLEMI.AC || sonuc !== 1 || govde.length < 6 + BANKA_YUVASI * 17) return { islem, basarili: sonuc === 1 };
  const altin = o.u32(), yuvalar: (BankaEsyasi | null)[] = [];
  for (let i = 0; i < BANKA_YUVASI; i++) { const no = o.u32(); o.u16(); const adet = o.u16(); o.u8(); o.u32(); o.u32(); yuvalar.push(no ? { no, adet } : null); }
  return { islem, basarili: true, altin, yuvalar };
}
