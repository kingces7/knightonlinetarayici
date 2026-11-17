// Ganimet paketleri: kutu açma (WIZ_BUNDLE_OPEN_REQ 0x24) ve eşya/altın alma (WIZ_ITEM_GET 0x26). Düşme bildirimi (0x23) savas.ts'te (`esyaDustu`).
// Kaynak: GameServer/BundleSystem.cpp (BundleOpenReq, ItemGet). Gerçek Myko sunucusuyla doğrulandı (ornekler/myko-ganimet.json).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Altının eşya numarası (kutuda altın bu numarayla yer alır). */
export const ALTIN_NO = 900000000;
/** Kutuda en çok bu kadar yuva var. */
export const KUTU_YUVASI = 8;
/** Eşya alma cevabının ilk baytı (`LootErrorCodes`). */
export const GANIMET_KODU = { HATA: 0, TEK: 1, PARTI_ALTIN: 2, PARTI_BILDIRIM: 3, PARTI_VERILDI: 4, PARTI_BANA: 5, AGIRLIK_YOK: 6 } as const;
export const GANIMET_HATALARI: Record<number, string> = { 0: 'You cannot take that item.', 6: 'You cannot carry any more weight.' };

/** Kutuyu aç (client → sunucu): `u32 torba no`. */
export function kutuAcmaIstegi(torbaNo: number): Uint8Array { return new PaketYazici().u32(torbaNo).baytlar(); }

export interface KutuIcerigi { torbaNo: number; dolu: boolean; yuvalar: { yuva: number; no: number; adet: number }[] }
/** Kutu içeriği (sunucu → client): `u32 torba no, u8 dolu, 8 × (u32 eşya no, u16 adet)`. Boş yuvalar atlanır. */
export function kutuIcerigi(govde: Uint8Array): KutuIcerigi {
  const o = new PaketOkuyucu(govde);
  const torbaNo = o.u32(), dolu = o.u8() === 1, yuvalar: KutuIcerigi['yuvalar'] = [];
  if (dolu) for (let i = 0; i < KUTU_YUVASI; i++) { const no = o.u32(), adet = o.u16(); if (no) yuvalar.push({ yuva: i, no, adet }); }
  return { torbaNo, dolu, yuvalar };
}

/** Kutudan al (client → sunucu): `u32 torba no, u32 eşya no, u16 kutudaki yuva`. */
export function esyaAlmaIstegi(torbaNo: number, no: number, yuva: number): Uint8Array { return new PaketYazici().u32(torbaNo).u32(no).u16(yuva).baytlar(); }

export interface AlmaCevabi {
  kod: number;
  /** Başarıda (kod 1/2/5): kutu, çantadaki yuva (0–27; altında −1), eşya, adet, toplam altın, kutudaki yuva. */
  torbaNo?: number; cantaYuvasi?: number; no?: number; adet?: number; altin?: number; kutuYuvasi?: number;
}
/**
 * Alma cevabı (sunucu → client). Kod 1 (tek) ve 5 (partiden bana): `u8 kod, u32 torba, i8 çanta yuvası, u32 eşya, u16 adet, u32 altın, u16 kutu yuvası`.
 * Kod 2 (parti altın paylaşımı): `…, u32 eşya, u32 altın, u16 yuva` (adet yok). Kod 0/6: yalnız kod.
 */
export function almaCevabi(govde: Uint8Array): AlmaCevabi {
  const o = new PaketOkuyucu(govde), kod = o.u8();
  if (kod === GANIMET_KODU.TEK || kod === GANIMET_KODU.PARTI_BANA) return { kod, torbaNo: o.u32(), cantaYuvasi: o.i8(), no: o.u32(), adet: o.u16(), altin: o.u32(), kutuYuvasi: o.u16() };
  if (kod === GANIMET_KODU.PARTI_ALTIN) return { kod, torbaNo: o.u32(), cantaYuvasi: o.i8(), no: o.u32(), altin: o.u32(), kutuYuvasi: o.u16() };
  return { kod };
}
