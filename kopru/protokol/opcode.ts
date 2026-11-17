// Opcode sabitleri (kaynak: LILITH_Game-Server/shared/packets.h ve LogInServer/LoginSession.h; docs/protokol.md).
// Yalnızca Aşama 4'te (giriş → karakter seçimi → oyuna giriş) kullanılanlar. Aşama 5'te eklenecek.

/** Login server (port 15100). */
export const LS = {
  SURUM: 0x01,
  INDIRME_BILGISI: 0x02,
  LAUNCHER_PING: 0x03,
  SIFRELEME: 0xf2,
  GIRIS: 0xf3,
  SUNUCU_LISTESI: 0xf5,
  HABER: 0xf6,
} as const;

/** Oyun sunucusu (port 15001). */
export const WIZ = {
  GIRIS: 0x01,
  YENI_KARAKTER: 0x02,
  KARAKTER_SIL: 0x03,
  KARAKTER_SEC: 0x04,
  ULUS_SEC: 0x05,
  HAREKET: 0x06,
  KULLANICI_GIRIS_CIKIS: 0x07,
  NPC_GIRIS_CIKIS: 0x0a,
  /** client → sunucu: NPC'ye tıklandı (0x20). */
  NPC_OLAYI: 0x20,
  /** Diyalog menüsü: sunucu → client konuşma + düğmeler, client → sunucu seçilen düğme (0x55). */
  SECIM_MESAJI: 0x55,
  /** Görev paketleri (0x64): sunucu → client alt tür 1 görev listesi, 2 görev durumu, 7 NPC konuşması; client → sunucu alt tür 3 görevi/menü satırını seç. */
  GOREV: 0x64,
  /** Öldürme/yardım bildirimi (0xC8): sunucu, oyuncu PK bölgesinde bir oyuncuyu öldürünce yollar. */
  OLDURME: 0xc8,
  /** Skill puanı dağıtımı (0x32): client → sunucu `u8 ağaç (5–8)`; sunucu yalnız BAŞARISIZLIKTA `u8 ağaç, u8 mevcut puan` yollar. */
  SKILL_PUANI: 0x32,
  /** Sınıf değişimi/terfi (0x34): alt tür 6 = herkese "kimlik yeni sınıfa geçti". */
  SINIF_DEGISTI: 0x34,
  NPC_HAREKET: 0x0b,
  SALDIRI: 0x08,
  SOHBET: 0x10,
  SOHBET_HEDEFI: 0x35,
  ESYA_ALIM_SATIM: 0x21,
  STAT_DEGISTI: 0x28,
  DURUM_DEGISTI: 0x29,
  BANKA: 0x45,
  KUTU_AC: 0x24,
  ESYA_AL: 0x26,
  ESYA_TASI: 0x1f,
  ESYA_SIL: 0x3f,
  ESYA_ADEDI: 0x3d,
  /** Sunucu → client: eşyanın dayanıklılığı değişti (u8 yuva: 0-13 giyili, 14+ çanta; u16 dayanıklılık). */
  DAYANIM: 0x38,
  /** Client → sunucu: eşya tamir isteği; cevap ESYA_TAMIR_SONUCU. */
  ESYA_TAMIR: 0x3b,
  PARTI: 0x2f,
  BECERI: 0x31,
  MANA_DEGISTI: 0x18,
  OLUM: 0x11,
  YENIDEN_DOGUS: 0x12,
  CAN_DEGISTI: 0x17,
  DENEYIM_DEGISTI: 0x1a,
  SEVIYE_DEGISTI: 0x1b,
  HEDEF_CAN: 0x22,
  ESYA_DUSTU: 0x23,
  ALTIN_DEGISTI: 0x4a,
  AGIRLIK_DEGISTI: 0x54,
  KULLANICI_LISTESI: 0x16,
  NPC_LISTESI: 0x1d,
  /** Sunucu → client: bölgedeki NPC kimlik listesi (0x1C); client bilmediklerini NPC_LISTESI (0x1D) ile ister. */
  NPC_BOLGESI: 0x1c,
  /** Sunucu → client: bölge değişimi (0x15: alt komut 0 başla, 1 kullanıcı kimlikleri, 2 bitti); client bilmediklerini KULLANICI_LISTESI (0x16) ile ister. */
  KULLANICI_BOLGESI: 0x15,
  TUM_KARAKTER_BILGISI: 0x0c,
  OYUN_BASLAT: 0x0d,
  BENIM_BILGIM: 0x0e,
  SAAT: 0x13,
  HAVA: 0x14,
  SURUM_KONTROL: 0x2b,
  SIKISTIRILMIS: 0x42,
  OZEL_XSAFE: 0xe9,
} as const;

/** Giriş sonucu kodları (`LS.GIRIS` cevabı). */
export const GIRIS_SONUCU = {
  BASARILI: 0x01,
  HESAP_YOK: 0x02,
  SIFRE_YANLIS: 0x03,
  YASAKLI: 0x04,
  OYUNDA: 0x05,
  HATA: 0x06,
  SOZLESME: 0x0f,
  OTP: 0x10,
  BASARISIZ: 0xff,
} as const;
