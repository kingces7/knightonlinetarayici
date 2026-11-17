// Sohbet (WIZ_CHAT 0x10, WIZ_CHAT_TARGET 0x35). Kaynak: GameServer/ChatHandler.cpp/.h (Chat, ChatPacket::Construct, ChatTargetSelect).
// Gerçek Myko sunucusuyla doğrulandı (genel ve bağırma sohbeti: gönderen de kendi mesajını geri alır).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Sohbet türleri (`ChatType`): yalnız client'ın kullandıkları. */
export const SOHBET_TURU = { GENEL: 1, OZEL: 2, PARTI: 3, BAGIRMA: 5, KLAN: 6, TICARET: 14 } as const;

/** Sohbet isteği (client → sunucu): `u8 tür, u16+metin` (en çok 128 karakter; sunucu boş/uzun mesajı yok sayar). Özel sohbette önce `ozelHedefIstegi` ile alıcı seçilir. */
export function sohbetIstegi(tur: number, mesaj: string): Uint8Array { return new PaketYazici().u8(tur).yazi(mesaj.slice(0, 128)).baytlar(); }

export interface SohbetPaketi { tur: number; ulus: number; gonderenId: number; gonderen: string; mesaj: string; rutbe: number; sistem: number }
/** Gelen sohbet (sunucu → client): `u8 tür, u8 ulus, i16 gönderen, u8+ad, u16+mesaj, i8 rütbe, u8 sistem`. */
export function sohbetPaketi(govde: Uint8Array): SohbetPaketi {
  const o = new PaketOkuyucu(govde);
  const tur = o.u8(), ulus = o.u8(), gonderenId = o.i16(), gonderen = o.yazi(false), mesaj = o.yazi(), rutbe = o.i8(), sistem = o.u8();
  return { tur, ulus, gonderenId, gonderen, mesaj, rutbe, sistem };
}

/** Özel sohbet alıcısı seç (client → sunucu): `u8 1, u16+ad`. Cevap: `u8 1, i16 sonuç (0 = oyunda değil/kendisi), …`. */
export function ozelHedefIstegi(ad: string): Uint8Array { return new PaketYazici().u8(1).yazi(ad).baytlar(); }
export function ozelHedefCevabi(govde: Uint8Array): { bulundu: boolean } { const o = new PaketOkuyucu(govde); o.u8(); return { bulundu: o.i16() > 0 }; }
