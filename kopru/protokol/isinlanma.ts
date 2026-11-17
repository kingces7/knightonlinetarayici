// Işınlanma kapıları (Moradon'daki Karus/El Morad kapıları). Kaynak: GameServer/UserObjectSystem.cpp (ObjectEvent, GetWarpList, SelectWarpList),
// ZoneChangeWarpHandler.cpp (ZoneChange, RecvZoneChange).
//   1) client → sunucu WIZ_OBJECT_EVENT (0x33): u16 nesne indeksi, u16 nid (0)
//   2) sunucu → client WIZ_WARP_LIST (0x4B) alt 1: u16 adet, her kayıt: u16 kapı no, yazı ad, yazı duyuru, u16 bölge, u16 azami oyuncu, u32 ücret
//      (başarısızsa WIZ_OBJECT_EVENT: u8 tür, u8 0)
//   3) client → sunucu WIZ_WARP_LIST: u16 nesne indeksi, u16 kapı no
//   4) sunucu → client WIZ_WARP_LIST alt 2 + u8 kod (hata; 1 başarı, 255 reddedildi, 2 en düşük seviye + u8 seviye) ya da doğrudan
//      WIZ_ZONE_CHANGE alt 3: u16 bölge, u16 x*10, u16 z*10, u16 y*10, u8 ulus, u8 eski zafer
//   5) client → sunucu WIZ_ZONE_CHANGE alt 1 (yükleniyor); sunucu alt 2 yollar; client alt 2 (yüklendi) yollar.
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

export const BOLGE_DEGISIMI = { YUKLENIYOR: 1, YUKLENDI: 2, ISINLANMA: 3 } as const;

export interface IsinlanmaKapisi { no: number; ad: string; duyuru: string; bolge: number; azamiOyuncu: number; ucret: number }

export function nesneOlayiIstegi(indeks: number, nid = 0): Uint8Array { return new PaketYazici().u16(indeks).u16(nid).baytlar(); }
export function kapiSecimiIstegi(nesneIndeksi: number, kapiNo: number): Uint8Array { return new PaketYazici().u16(nesneIndeksi).u16(kapiNo).baytlar(); }
export function bolgeDegisimiIstegi(alt: number): Uint8Array { return new PaketYazici().u8(alt).baytlar(); }

export type IsinlanmaPaketi =
  | { tur: 'liste'; kapilar: IsinlanmaKapisi[] }
  | { tur: 'sonuc'; kod: number; enDusukSeviye?: number };

export function isinlanmaPaketi(govde: Uint8Array): IsinlanmaPaketi {
  const o = new PaketOkuyucu(govde), alt = o.u8();
  if (alt === 1) {
    const adet = o.u16(), kapilar: IsinlanmaKapisi[] = [];
    for (let i = 0; i < adet; i++) kapilar.push({ no: o.u16(), ad: o.yazi(), duyuru: o.yazi(), bolge: o.u16(), azamiOyuncu: o.u16(), ucret: o.u32() });
    return { tur: 'liste', kapilar };
  }
  const kod = o.kalan ? o.u8() : 0;
  return { tur: 'sonuc', kod, enDusukSeviye: kod === 2 && o.kalan ? o.u8() : undefined };
}

/** WIZ_ZONE_CHANGE alt 3 (ışınlanma): yeni bölge ve konum (metre). */
export function bolgeIsinlanmasi(govde: Uint8Array): { bolge: number; x: number; z: number; ulus: number } | null {
  const o = new PaketOkuyucu(govde);
  if (o.u8() !== BOLGE_DEGISIMI.ISINLANMA) return null;
  const bolge = o.u16(), x = o.u16() / 10, z = o.u16() / 10; o.u16();
  return { bolge, x, z, ulus: o.u8() };
}
export const bolgeDegisimiAlti = (govde: Uint8Array): number => govde[0] ?? 0;
