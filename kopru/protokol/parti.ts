// Parti paketleri (WIZ_PARTY 0x2F). Kaynak: GameServer/PartyHandler.cpp (CUser::PartySystemProcess), shared/packets.h (PARTY_*).
// Gövde her zaman `u8 alt komut` ile başlar.
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

/** Parti alt komutları. */
export const PARTI = { OLUSTUR: 1, DAVET_IZNI: 2, EKLE: 3, CIKAR: 4, SIL: 5, CAN: 6, SEVIYE: 7, SINIF: 8, DEVRET: 0x1c } as const;

/** Parti türü: istemci normal partide -1 (0xFF) yollar (`PartyCreateRequest` örnek paketi: `01 0D00 <ad> FF`). */
const NORMAL_PARTI = -1;

/**
 * Davet isteği (client → sunucu). Henüz partide değilsek `OLUSTUR` (sunucu partiyi kurar ve hedefe davet yollar),
 * zaten liderysek `EKLE` (partiye yeni üye davet eder). `ad`: davet edilen oyuncunun karakter adı.
 */
export function partiDavetiIstegi(ad: string, partidayiz: boolean): Uint8Array {
  return new PaketYazici().u8(partidayiz ? PARTI.EKLE : PARTI.OLUSTUR).yazi(ad).i8(NORMAL_PARTI).baytlar();
}

/** Davete cevap (client → sunucu): `kabul` true = katıl, false = reddet (`PartyInsertOrCancel`). */
export function partiDavetCevabi(kabul: boolean): Uint8Array {
  return new PaketYazici().u8(PARTI.DAVET_IZNI).u8(kabul ? 1 : 0).baytlar();
}

/** Davet reddi/hata kodları (`PartyHandler.cpp` başındaki açıklamadan; sunucu `i16` eksi değer yollar). */
export const PARTI_HATALARI: Record<number, string> = {
  [-1]: 'The party is full.',
  [-2]: 'You cannot form a party because of the level difference.',
  [-3]: 'You cannot form a party with a user from the other nation.',
  [-4]: 'A clan party cannot invite users from a different clan.',
  [-5]: 'You cannot form a party with a user in a different zone.',
  [-6]: 'You cannot form a party with a user that is not online.',
  [-7]: 'You cannot form a party with this user.',
  [-8]: 'Not the same clan.',
  [-9]: 'You cannot form a party in this region.',
  [-10]: 'You cannot invite this player to a party. The invitee does not have the required item.',
};

/** Parti üyesi (PARTY_INSERT). */
export interface PartiUyesi { id: number; ad: string; enCokCan: number; can: number; seviye: number; sinif: number; enCokMana: number; mana: number; ulus: number }

export type PartiPaketi =
  | { tur: 'uye'; uye: PartiUyesi }
  | { tur: 'cikti'; id: number }
  | { tur: 'dagildi' }
  | { tur: 'can'; id: number; enCokCan: number; can: number; enCokMana: number; mana: number }
  | { tur: 'seviye'; id: number; seviye: number }
  | { tur: 'sinif'; id: number; sinif: number }
  | { tur: 'davet'; kimlik: number; ad: string }
  | { tur: 'hata'; kod: number; metin: string }
  | { tur: 'diger'; altKomut: number };

/**
 * Sunucudan gelen parti paketini ayırır: `DAVET_IZNI` = biri bizi partiye çağırıyor (`u16 davet eden soket, string ad`);
 * `EKLE` + eksi `i16` = davet hatası; başarıda `EKLE` pozitif üye kimliğiyle gelir (üye listesi).
 */
export function partiPaketi(govde: Uint8Array): PartiPaketi {
  const o = new PaketOkuyucu(govde);
  const alt = o.u8();
  if (alt === PARTI.DAVET_IZNI) return { tur: 'davet', kimlik: o.u16(), ad: o.yazi() };
  if (alt === PARTI.EKLE && o.kalan >= 2) {
    const kod = o.i16();
    if (kod < 0) return { tur: 'hata', kod, metin: PARTI_HATALARI[kod] ?? `Party request failed (${kod}).` };
    // Başarı: üye bilgisi — `i16 soket, u8 1, string ad, i16 en çok can, i16 can, u8 seviye, u16 sınıf, i16 en çok mana, i16 mana, u8 ulus, u8 0, i16 hedef no, u8 tür, u8 sıra` (gerçek sunucu paketleriyle doğrulandı)
    try {
      const u = new PaketOkuyucu(govde); u.u8(); const id = u.i16(); u.u8(); const ad = u.yazi();
      return { tur: 'uye', uye: { id, ad, enCokCan: u.i16(), can: u.i16(), seviye: u.u8(), sinif: u.u16(), enCokMana: u.i16(), mana: u.i16(), ulus: u.u8() } };
    } catch { return { tur: 'diger', altKomut: alt }; } // eksik/kısa paket
  }
  if (alt === PARTI.CIKAR && o.kalan >= 2) return { tur: 'cikti', id: o.i16() };
  if (alt === PARTI.SIL) return { tur: 'dagildi' };
  if (alt === PARTI.CAN && o.kalan >= 10) return { tur: 'can', id: o.i16(), enCokCan: o.i16(), can: o.i16(), enCokMana: o.i16(), mana: o.i16() };
  if (alt === PARTI.SEVIYE && o.kalan >= 3) return { tur: 'seviye', id: o.i16(), seviye: o.u8() };
  if (alt === PARTI.SINIF && o.kalan >= 4) return { tur: 'sinif', id: o.i16(), sinif: o.u16() };
  return { tur: 'diger', altKomut: alt };
}

/** Partiden çıkar / üyeyi at (client → sunucu): `u8 4, u16 soket` (kendi soketimiz = partiden ayrıl). */
export function partidenCikarIstegi(id: number): Uint8Array { return new PaketYazici().u8(PARTI.CIKAR).u16(id).baytlar(); }
/** Liderliği devret (client → sunucu): `u8 0x1C, u16 soket`. */
export function liderDevretIstegi(id: number): Uint8Array { return new PaketYazici().u8(PARTI.DEVRET).u16(id).baytlar(); }
/** Partiyi dağıt (client → sunucu, lider): `u8 5`. */
export function partiyiDagitIstegi(): Uint8Array { return new PaketYazici().u8(PARTI.SIL).baytlar(); }
