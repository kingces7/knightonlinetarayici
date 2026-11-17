// NPC diyaloğu: NPC'ye tıklama (WIZ_NPC_EVENT 0x20) ve Lua menüsü (WIZ_SELECT_MSG 0x55). Kaynak: GameServer/NPCHandler.cpp (NpcEvent, SelectMsg, RecvSelectMsg).
// Sunucu betiği (Quests/<sid>_*.lua) SelectMsg(...) ile konuşma numarasını ve düğme numaralarını yollar; metinler client'taki Quest_Talk/Quest_Menu tablolarındadır.
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Diyalogda en çok bu kadar düğme olur (sunucu MAX_MESSAGE_EVENT). */
export const DIYALOG_DUGMESI = 12;

/** NPC'ye tıkla (client → sunucu): `u8 1, u16 NPC kimliği, i32 görev no (-1)`. */
export function npcOlayiIstegi(npcId: number): Uint8Array { return new PaketYazici().u8(1).u16(npcId).i32(-1).baytlar(); }

export interface SecimMesaji {
  /** Konuşan NPC'nin tür numarası (K_NPC sid). */
  npcSid: number;
  /** Menü türü (Lua SelectMsg 1. sayı): 2 normal konuşma, 3 çok seçenekli, 5 ödül seçimi. */
  bayrak: number; gorevNo: number;
  /** Konuşma metni numarası (Quest_Talk). */
  baslik: number;
  /** Düğme yazısı numaraları (Quest_Menu); −1 = boş düğme. En çok 12. */
  dugmeler: number[];
  /** Menüyü gönderen Lua dosyası; cevapta aynen geri yollanır. */
  lua: string;
}
/** Menü (sunucu → client): `i16 NPC sid, u8 bayrak, i32 görev, i32 konuşma, 12 × i32 düğme, string(1 bayt uzunluk) lua dosyası`. */
export function secimMesaji(govde: Uint8Array): SecimMesaji {
  const o = new PaketOkuyucu(govde);
  const npcSid = o.i16(), bayrak = o.u8(), gorevNo = o.i32(), baslik = o.i32(), dugmeler: number[] = [];
  for (let i = 0; i < DIYALOG_DUGMESI; i++) dugmeler.push(o.i32());
  return { npcSid, bayrak, gorevNo, baslik, dugmeler, lua: o.yazi(false) };
}

/** Düğme seçimi (client → sunucu): `u8 düğme sırası, string(1 bayt uzunluk) lua dosyası, i8 ödül (-1)`. */
export function secimCevabi(dugme: number, lua: string, odul = -1): Uint8Array {
  return new PaketYazici().u8(dugme).yazi(lua, false).i8(odul).baytlar();
}
