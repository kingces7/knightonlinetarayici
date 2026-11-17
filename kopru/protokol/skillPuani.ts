// Skill puanı dağıtımı (WIZ_SKILLPT_CHANGE 0x32). Kaynak: GameServer/CharacterHandler.cpp (SkillPointChange).
// Terfi etmiş (novice/master) oyuncu, boş skill puanını 4 ağaçtan birine verir: 5 = 1. ağaç, 6 = 2., 7 = 3., 8 = Master. Sunucu başarıda cevap vermez.
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Ağaç numaraları (sunucu SkillPointCategory). */
export const SKILL_AGACI = { BIRINCI: 5, IKINCI: 6, UCUNCU: 7, MASTER: 8 } as const;

/** Puan ver (client → sunucu): `u8 ağaç`. */
export function skillPuaniIstegi(agac: number): Uint8Array { return new PaketYazici().u8(agac).baytlar(); }

/** Reddedildi (sunucu → client): `u8 ağaç, u8 o ağaçtaki mevcut puan`. */
export function skillPuaniReddi(govde: Uint8Array): { agac: number; puan: number } { const o = new PaketOkuyucu(govde); return { agac: o.u8(), puan: o.u8() }; }
