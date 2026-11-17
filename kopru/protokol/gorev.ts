// Görev (WIZ_QUEST 0x64) paketleri. Kaynak: GameServer/QuestHandler.cpp (QuestDataRequest, SaveEvent, QuestV2SendNpcMsg, QuestV2PacketProcess).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

export interface GorevPaketi {
  /** 1 liste, 2 durum değişti, 7 NPC konuşması; diğerleri (8 saat, 10 ödül…) şimdilik yok sayılır. */
  alt: number;
  /** Alt tür 1: [görev no, durum] çiftleri. Alt tür 2: tek çift. */
  durumlar?: { gorev: number; durum: number }[];
  /** Alt tür 7: konuşma metni numarası (Quest_Talk) ve konuşan NPC'nin sid'i. */
  metinNo?: number; npcSid?: number;
}
/** Sunucu → client. Alt tür 1: `u16 adet, adet × (u16 görev, u8 durum)`; 2: `u16 görev, u8 durum`; 7: `u32 metin no, u16 NPC sid`. */
export function gorevPaketi(govde: Uint8Array): GorevPaketi {
  const o = new PaketOkuyucu(govde), alt = o.u8();
  if (alt === 1) { const n = o.u16(), durumlar: GorevPaketi['durumlar'] = []; for (let i = 0; i < n; i++) durumlar.push({ gorev: o.u16(), durum: o.u8() }); return { alt, durumlar }; }
  if (alt === 2) return { alt, durumlar: [{ gorev: o.u16(), durum: o.u8() }] };
  if (alt === 7) return { alt, metinNo: o.u32(), npcSid: o.u16() };
  return { alt };
}

/** Görevi başlat / menü satırını çalıştır (client → sunucu): `u8 3, u32 görev yardımcısı satır no`. Sunucu satırın tetik olayını Lua'da çalıştırır. */
export function gorevSecimiIstegi(satirNo: number): Uint8Array { return new PaketYazici().u8(3).u32(satirNo).baytlar(); }
