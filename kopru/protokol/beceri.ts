// Skill paketleri (WIZ_MAGIC_PROCESS 0x31, WIZ_MSP_CHANGE 0x18). Kaynak: GameServer/MagicProcess.cpp (MagicPacket), MagicInstance.cpp; client: WarFare/MagicSkillMng.cpp.
// Gerçek Myko sunucusuyla doğrulandı (ornekler/myko-beceri.json: seviye 2 savaşçı Stroke kullanıyor).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Skill alt komutları (`e_SubPacket_Magic`). */
export const BECERI_KOMUTU = { HAZIRLAMA: 1, UCUS: 2, ETKI: 3, BASARISIZ: 4, BUFF_TURU: 5, IPTAL: 6 } as const;
/** Sunucunun reddetme kodları (`e_SkillMagicFailMsg`, `data[3]` içinde eksi `i16`). */
export const BECERI_HATALARI: Record<number, string> = { [-100]: 'Casting failed.', [-101]: 'The skill was cancelled.', [-102]: 'The combo ended.', [-103]: 'The skill failed.', [-104]: 'The skill missed.' };

/**
 * Skill isteği (client → sunucu): `u8 komut, u32 skill no, u16 kullanan, u16 hedef, 7 × u16 veri`.
 * Bekleme süresi (`CastTime`) 0 olan skill'lerde doğrudan `ETKI` (3) yollanır; kullanan ve hedef soket numarası/canavar kimliğidir (kendine buff'ta ikisi aynı).
 */
export function beceriIstegi(komut: number, no: number, kullanan: number, hedef: number, veri: number[] = []): Uint8Array {
  const y = new PaketYazici().u8(komut).u32(no).u16(kullanan).u16(hedef);
  for (let i = 0; i < 7; i++) y.u16(veri[i] ?? 0);
  return y.baytlar();
}

export interface BeceriPaketi { komut: number; no: number; kullanan: number; hedef: number; veri: number[] }
/** Skill paketi (sunucu → bölge): kullananın skill'i (başarı `ETKI`, ret `BASARISIZ`; ret kodu `veri[3]`). */
export function beceriPaketi(govde: Uint8Array): BeceriPaketi {
  const o = new PaketOkuyucu(govde);
  const komut = o.u8(), no = o.u32(), kullanan = o.u16(), hedef = o.u16();
  return { komut, no, kullanan, hedef, veri: Array.from({ length: 7 }, () => o.i16()) };
}

/** `WIZ_MSP_CHANGE (0x18)`: kendi manamız — `i16 azami, i16 mana`. */
export function manaDegisti(govde: Uint8Array): { enCok: number; mana: number } { const o = new PaketOkuyucu(govde); return { enCok: o.i16(), mana: o.i16() }; }
