// Sunucudan gelen paketlerin anlamlı verilere çevrilmesi (Myko sunucu kaynağından; docs/protokol.md §6, §12).
// Her çözümleyici paketi sonuna kadar tüketmeyi hedefler; artakalan bayt varsa `kalan` alanında bildirilir (kaynakla uyumun sınaması).
import { PaketOkuyucu } from './ikili.ts';

// ---------- sabitler (shared/globals.h) ----------
export const SLOT_MAX = 14;        // giyili eşya yuvası
export const HAVE_MAX = 28;        // sırt çantası
export const COSP_MAX = 9;         // kostüm yuvaları
export const MBAG_MAX = 12;        // sihirli çanta başına yuva
export const ENVANTER_TOPLAM = SLOT_MAX + HAVE_MAX + COSP_MAX + MBAG_MAX * 2; // 75

/** Konum sunucuda ×10 tam sayı olarak gider; oyun koordinatı = değer / 10. */
export const konumCoz = (v: number): number => v / 10;

// ---------- giriş / karakter listesi / seçim ----------
export type UlusKodu = 0 | 1 | 2; // 0 seçilmemiş, 1 Karus, 2 El Morad

/** `WIZ_LOGIN` cevabı: ulus (0/1/2) ya da −1 (başarısız). */
export function oyunGirisCevabi(govde: Uint8Array): { basarili: boolean; ulus: UlusKodu | -1 } {
  const ulus = new PaketOkuyucu(govde).i8();
  return { basarili: ulus >= 0 && ulus <= 2, ulus: (ulus >= 0 && ulus <= 2 ? ulus : -1) as UlusKodu | -1 };
}

export interface KarakterOzeti {
  ad: string; irk: number; sinif: number; seviye: number; yuz: number; sac: number; bolge: number;
  /** giyili 8 yuva: baş, göğüs, omuz, bacak, eldiven, ayak, sağ el, sol el. */
  esyalar: Array<{ no: number; dayaniklilik: number }>;
}

/** `WIZ_ALLCHAR_INFO_REQ (0x0C)` alt kod 1 cevabı: 4 karakter yuvası (boş yuva: `ad === ''`). */
export function karakterListesi(govde: Uint8Array): { yuvalar: KarakterOzeti[]; kalan: number } {
  const o = new PaketOkuyucu(govde);
  const altKod = o.u8(); o.u8();
  if (altKod !== 1) throw new Error(`Beklenmeyen karakter listesi alt kodu: ${altKod}`);
  const yuvalar: KarakterOzeti[] = [];
  for (let i = 0; i < 4; i++) {
    const ad = o.yazi();
    const irk = o.u8(), sinif = o.u16(), seviye = o.u8(), yuz = o.u8(), sac = o.u32(), bolge = o.u8();
    const esyalar = Array.from({ length: 8 }, () => ({ no: o.u32(), dayaniklilik: o.u16() }));
    yuvalar.push({ ad, irk, sinif, seviye, yuz, sac, bolge, esyalar });
  }
  return { yuvalar, kalan: o.kalan };
}

export interface KarakterSecSonucu { basarili: boolean; kod: number; bolge?: number; x?: number; z?: number; y?: number; ulus?: number }

/** `WIZ_SEL_CHAR (0x04)` cevabı. Başarılıysa kod 1 ve konum/ulus gelir. */
export function karakterSecCevabi(govde: Uint8Array): KarakterSecSonucu {
  const o = new PaketOkuyucu(govde);
  const kod = o.u8();
  if (kod !== 1) return { basarili: false, kod };
  return { basarili: true, kod, bolge: o.u8(), x: konumCoz(o.u16()), z: konumCoz(o.u16()), y: konumCoz(o.u16()), ulus: o.u8() };
}

// ---------- WIZ_MYINFO ----------
export interface EnvanterEsyasi {
  no: number; dayaniklilik: number; adet: number; bayrak: number; kiralikDakika: number; benzersizNo: number; bitisZamani: number;
}

export interface BenimBilgim {
  soketNo: number; ad: string;
  x: number; z: number; y: number;
  ulus: number; irk: number; sinif: number; yuz: number; sac: number; rutbe: number; unvan: number;
  seviye: number; bosPuan: number; azamiDeneyim: bigint; deneyim: bigint; ulusPuani: number; aylikUlusPuani: number;
  klanNo: number; fame: number;
  azamiCan: number; can: number; azamiMana: number; mana: number; azamiAgirlik: number; agirlik: number;
  /** STR, STA, DEX, INT, CHA: temel değer + eşya bonusu. */
  statlar: Record<'str' | 'sta' | 'dex' | 'int' | 'cha', { deger: number; bonus: number }>;
  toplamVurus: number; toplamSavunma: number;
  direnc: { ates: number; buz: number; simsek: number; buyu: number; hastalik: number; zehir: number };
  altin: number; yetki: number; klanSirasi: number; kisiselSira: number;
  skillPuanlari: number[];
  /** 75 yuva: 0–13 giyili, 14–41 çanta, 42–50 kostüm, 51–74 sihirli çantalar. Boş yuva: `no === 0`. */
  envanter: EnvanterEsyasi[];
  hesapDurumu: number; premium: Array<{ tur: number; saat: number }>; kullanilanPremium: number; yeniBaslayan: boolean; adabPuani: number;
  askeriKamp: { karus: number; insan: number; karusEslant: number; insanEslant: number; moradon: number };
  cinSaati: number; yenidenDogus: number; yenidenDogusStat: number[]; muhurluDeneyim: bigint; kapakUnvan: number; skillUnvan: number;
  /** Çözümleyicinin tüketmediği bayt sayısı (0 olmalı). */
  kalan: number;
}

/** `WIZ_MYINFO (0x0E)`. Klan üyesi karakterler için klan bloğu henüz desteklenmiyor (kaynak çözümü var, gerçek veriyle doğrulanmadı). */
export function benimBilgim(govde: Uint8Array): BenimBilgim {
  const o = new PaketOkuyucu(govde);
  const soketNo = o.u16();
  const ad = o.yazi(false); // bu pakette yazılar tek baytlık uzunlukla (SByte)
  const x = konumCoz(o.u16()), z = konumCoz(o.u16()), y = konumCoz(o.u16());
  const ulus = o.u8(), irk = o.u8(), sinif = o.u16(), yuz = o.u8(), sac = o.u32(), rutbe = o.u8(), unvan = o.u8();
  o.u8(); o.u8();
  const seviye = o.u8(), bosPuan = o.i16(), azamiDeneyim = o.u64(), deneyim = o.u64(), ulusPuani = o.u32(), aylikUlusPuani = o.u32();
  const klanNo = o.u16(), fame = o.u8();
  if (klanNo > 0 && klanNo !== 0xffff) throw new Error('Klan üyesi karakterin WIZ_MYINFO klan bloğu henüz desteklenmiyor');
  o.u64(); o.u16(); o.u32(); // klan yoksa: ittifak(8) + kral pelerini(2, -1) + 4 sıfır
  o.ham(4); // 2,3,4,5 (kaynakta "unknown")
  const azamiCan = o.i16(), can = o.i16(), azamiMana = o.i16(), mana = o.i16(), azamiAgirlik = o.u32(), agirlik = o.u32();
  const st = () => ({ deger: o.u8(), bonus: o.u8() });
  const statlar = { str: st(), sta: st(), dex: st(), int: st(), cha: st() };
  const toplamVurus = o.u16(), toplamSavunma = o.u16();
  const direnc = { ates: o.u8(), buz: o.u8(), simsek: o.u8(), buyu: o.u8(), hastalik: o.u8(), zehir: o.u8() };
  const altin = o.u32(), yetki = o.u8(), klanSirasi = o.i8(), kisiselSira = o.i8();
  const skillPuanlari = [...o.ham(9)];
  const envanter: EnvanterEsyasi[] = [];
  for (let i = 0; i < ENVANTER_TOPLAM; i++) {
    envanter.push({ no: o.u32(), dayaniklilik: o.i16(), adet: o.u16(), bayrak: o.u8(), kiralikDakika: o.u16(), benzersizNo: o.u32(), bitisZamani: o.u32() });
  }
  const hesapDurumu = o.u8(), premiumSayisi = o.u8();
  const premium = Array.from({ length: premiumSayisi }, () => ({ tur: o.u8(), saat: o.u16() }));
  const kullanilanPremium = o.u8(), yeniBaslayan = o.u8() !== 0, adabPuani = o.u32();
  const askeriKamp = { karus: o.u8(), insan: o.u8(), karusEslant: o.u8(), insanEslant: o.u8(), moradon: o.u8() };
  o.u8();
  const cinSaati = o.u16(), yenidenDogus = o.u8(), yenidenDogusStat = [o.u8(), o.u8(), o.u8(), o.u8(), o.u8()];
  const muhurluDeneyim = o.u64(), kapakUnvan = o.u16(), skillUnvan = o.u16();
  o.u32(); o.u32(); o.u8(); // ReturnSymbolisOK(u32) + uint32(0) + uint8(0)
  return {
    soketNo, ad, x, z, y, ulus, irk, sinif, yuz, sac, rutbe, unvan, seviye, bosPuan, azamiDeneyim, deneyim, ulusPuani, aylikUlusPuani, klanNo, fame,
    azamiCan, can, azamiMana, mana, azamiAgirlik, agirlik, statlar, toplamVurus, toplamSavunma, direnc, altin, yetki, klanSirasi, kisiselSira, skillPuanlari,
    envanter, hesapDurumu, premium, kullanilanPremium, yeniBaslayan, adabPuani, askeriKamp, cinSaati, yenidenDogus, yenidenDogusStat, muhurluDeneyim, kapakUnvan, skillUnvan,
    kalan: o.kalan,
  };
}

// ---------- saat / hava ----------
/** `WIZ_TIME (0x13)`: `u16 yıl, u16 ay, u16 gün, u16 saat, u16 dakika`. */
export function oyunSaati(govde: Uint8Array): { yil: number; ay: number; gun: number; saat: number; dakika: number } {
  const o = new PaketOkuyucu(govde);
  return { yil: o.u16(), ay: o.u16(), gun: o.u16(), saat: o.u16(), dakika: o.u16() };
}

/** `WIZ_WEATHER (0x14)`: `u8 tür, u16 miktar` (1 güneşli/açık, 2 yağmur, 3 kar — kaynakta doğrulanacak). */
export function oyunHavasi(govde: Uint8Array): { tur: number; miktar: number } {
  const o = new PaketOkuyucu(govde); return { tur: o.u8(), miktar: o.u16() };
}
