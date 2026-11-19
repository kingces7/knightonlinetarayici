// Sunucudan gelen paketlerin anlamlı verilere çevrilmesi (Myko sunucu kaynağından; docs/protokol.md §6, §12).
// Her çözümleyici paketi sonuna kadar tüketmeyi hedefler; artakalan bayt varsa `kalan` alanında bildirilir (kaynakla uyumun sınaması).
import { PaketOkuyucu, PaketYazici } from './ikili.ts';

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
  /** Klan üyesiyse klan bilgisi (kaynak: UserInfoSystem.cpp SendMyInfo). */
  klan: { ittifakNo: number; bayrak: number; ad: string; derece: number; sira: number; isaretSurumu: number; pelerinNo: number } | null;
  /** Sunucunun gönderdiği pelerin kimliği (klan pelerini ya da kral pelerini 97 Karus, 98 El Morad, 99 beyaz kral); yoksa -1. */
  pelerinNo: number;
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

/** `WIZ_MYINFO (0x0E)`. */
export function benimBilgim(govde: Uint8Array): BenimBilgim {
  const o = new PaketOkuyucu(govde);
  const soketNo = o.u16();
  const ad = o.yazi(false); // bu pakette yazılar tek baytlık uzunlukla (SByte)
  const x = konumCoz(o.u16()), z = konumCoz(o.u16()), y = konumCoz(o.u16());
  const ulus = o.u8(), irk = o.u8(), sinif = o.u16(), yuz = o.u8(), sac = o.u32(), rutbe = o.u8(), unvan = o.u8();
  o.u8(); o.u8();
  const seviye = o.u8(), bosPuan = o.i16(), azamiDeneyim = o.u64(), deneyim = o.u64(), ulusPuani = o.u32(), aylikUlusPuani = o.u32();
  const klanNo = o.u16(), fame = o.u8();
  let klan: BenimBilgim['klan'] = null;
  let pelerinNo = -1;
  if (klanNo > 0 && klanNo !== 0xffff) {
    const ittifakNo = o.u16(), bayrak = o.u8(), ad = o.yazi(false), derece = o.u8(), sira = o.u8(), isaretSurumu = o.u16(), kimlik = o.u16();
    o.ham(4); // pelerin rengi R,G,B + bayrak (ya da u32 0): kaynakta hangi dalda olursa olsun 6 bayt
    klan = { ittifakNo, bayrak, ad, derece, sira, isaretSurumu, pelerinNo: kimlik };
    pelerinNo = kimlik === 0xffff ? -1 : kimlik;
  } else { o.u64(); const kral = o.u16(); o.u32(); pelerinNo = kral === 0xffff ? -1 : kral; } // klan yoksa: 8 sıfır + kral pelerini (-1) + 4 sıfır
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
    soketNo, ad, x, z, y, ulus, irk, sinif, yuz, sac, rutbe, unvan, seviye, bosPuan, azamiDeneyim, deneyim, ulusPuani, aylikUlusPuani, klanNo, fame, klan, pelerinNo,
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

// ---------- NPC / canavar ----------
export interface NpcBilgisi {
  /** Sunucudaki dünya numarası (paket içindeki NPC kimliği; hareket ve çıkış paketleri bununla anılır). */
  id: number;
  /** K_NPC/K_MONSTER prototip numarası (`sSid`). */
  protoNo: number;
  /** 1 = canavar, 2 = NPC. */
  tur: number;
  /** Model/resim numarası (istemcideki NPC_Looks numarası). */
  resimNo: number;
  satisGrubu: number;
  /** NPC tipi (K_NPC.byType). */
  tip: number;
  boyut: number;
  silah1: number; silah2: number;
  ulus: number; seviye: number;
  x: number; z: number; y: number;
  kapiAcik: number; nesneTuru: number;
  /** Bakış yönü (derece). */
  yon: number;
}

/** Bir NPC kaydını okur (kimlik `id` dışarıda okunur). `WIZ_REQ_NPCIN` ve `WIZ_NPC_INOUT` aynı biçimi kullanır. */
function npcBilgisiOku(o: PaketOkuyucu, id: number): NpcBilgisi {
  const protoNo = o.u16(), tur = o.u8(), resimNo = o.u16(), satisGrubu = o.u32(), tip = o.u8();
  if (tip === 15) throw new Error('Kışla/kale NPC kaydı (tip 15) henüz desteklenmiyor');
  o.u32();
  const boyut = o.u16(), silah1 = o.u32(), silah2 = o.u32(), ulus = o.u8(), seviye = o.u8();
  const x = konumCoz(o.u16()), z = konumCoz(o.u16()), y = konumCoz(o.u16());
  const kapiAcik = o.u32(), nesneTuru = o.u8();
  o.u16(); o.u16();
  const yon = o.i16();
  return { id, protoNo, tur, resimNo, satisGrubu, tip, boyut, silah1, silah2, ulus, seviye, x, z, y, kapiAcik, nesneTuru, yon };
}

/** `WIZ_REQ_NPCIN (0x1D)`: `u16 adet`, her NPC için `u16 id` + kayıt. Bölge değiştikçe sunucu yenisini yollar. */
export function npcListesi(govde: Uint8Array): { npcler: NpcBilgisi[]; kalan: number } {
  const o = new PaketOkuyucu(govde);
  const adet = o.u16();
  const npcler: NpcBilgisi[] = [];
  for (let i = 0; i < adet; i++) { const id = o.u16(); npcler.push(npcBilgisiOku(o, id)); }
  return { npcler, kalan: o.kalan };
}

export const GIRIS_CIKIS = { GIRIS: 1, CIKIS: 2, YENIDEN_DOGUS: 3 } as const;

/** `WIZ_NPC_INOUT (0x0A)`: `u8 tür (1 giriş, 2 çıkış, 3 yeniden doğuş), u16 id`, çıkış değilse NPC kaydı. */
export function npcGirisCikis(govde: Uint8Array): { tur: number; id: number; npc: NpcBilgisi | null; kalan: number } {
  const o = new PaketOkuyucu(govde);
  const tur = o.u8(), id = o.u16();
  const npc = tur === GIRIS_CIKIS.CIKIS ? null : npcBilgisiOku(o, id);
  return { tur, id, npc, kalan: o.kalan };
}

/** `WIZ_NPC_MOVE (0x0B)`: `u8 1, u16 id, konum x/z/y (×10), u16 hız (×10, m/sn)`. Konum, canavarın VARACAĞI yerdir. */
export function npcHareket(govde: Uint8Array): { id: number; x: number; z: number; y: number; hiz: number; kalan: number } {
  const o = new PaketOkuyucu(govde);
  o.u8();
  const id = o.u16(), x = konumCoz(o.u16()), z = konumCoz(o.u16()), y = konumCoz(o.u16()), hiz = o.u16() / 10;
  return { id, x, z, y, hiz, kalan: o.kalan };
}

// ---------- diğer oyuncular ----------
/** Başkasının görünümünde taşınan 15 yuva (sunucudaki sıra: gövde, bacak, kask, eldiven, ayak, omuz, sağ el, sol el, kanat, kostüm kask/sol/sağ/üst, peri, dövme). */
export const GORUNEN_YUVALAR = ['govde', 'bacak', 'kask', 'eldiven', 'ayak', 'omuz', 'sagEl', 'solEl', 'kanat', 'kostumKask', 'kostumSol', 'kostumSag', 'kostumUst', 'peri', 'dovme'] as const;

export interface KullaniciBilgisi {
  /** Sunucudaki soket numarası (diğer paketler bununla anar). */
  id: number; ad: string; ulus: number; klanNo: number; fame: number;
  klan: { ittifakNo: number; ad: string; derece: number; sira: number; isaretSurumu: number; pelerinNo: number; bayrak: number } | null;
  /** Görünen pelerin kimliği (klan pelerini ya da kral pelerini 97/98/99); yoksa -1. */
  pelerinNo: number;
  seviye: number; irk: number; sinif: number; x: number; z: number; y: number; yuz: number; sac: number;
  /** Can durumu (0 canlı…), anormal durum bayrakları, yetki (0 = GM), yön (derece), rütbe. */
  canDurumu: number; anormalDurum: number; yetki: number; yon: number; rutbe: number;
  /** Görünen eşyalar (boş yuva: `no === 0`). */
  esyalar: Record<(typeof GORUNEN_YUVALAR)[number], { no: number; dayaniklilik: number; bayrak: number }>;
  bolge: number;
}

/** Bir oyuncu kaydını okur (kimlik dışarıda okunur): `WIZ_REQ_USERIN`, `WIZ_USER_INOUT` aynı biçimi kullanır (kaynak: GetUserInfo). */
function kullaniciBilgisiOku(o: PaketOkuyucu, id: number): KullaniciBilgisi {
  const ad = o.yazi(false); // bu kayıtta yazılar tek baytlık uzunlukla
  const ulus = o.u8(); o.u8(); o.u8();
  const klanNo = o.u16(), fame = o.u8();
  let klan: KullaniciBilgisi['klan'] = null;
  let pelerinNo = -1;
  if (klanNo > 0 && klanNo !== 0xffff) {
    const ittifakNo = o.u16(), klanAdi = o.yazi(false), derece = o.u8(), sira = o.u8(), isaretSurumu = o.u16();
    if (ittifakNo !== 0) throw new Error('İttifaklı klan üyesinin görünümü henüz desteklenmiyor');
    const kimlik = o.u16(); o.ham(3); o.u8(); // pelerin rengi R,G,B + 0
    const bayrak = o.u8();
    klan = { ittifakNo, ad: klanAdi, derece, sira, isaretSurumu, pelerinNo: kimlik, bayrak };
    pelerinNo = kimlik === 0xffff ? -1 : kimlik;
  } else { o.u32(); o.u16(); o.u8(); const kral = o.u16(); o.u32(); o.u8(); pelerinNo = kral === 0xffff ? -1 : kral; } // klansız: 14 bayt (… pelerin -1 …)
  const seviye = o.u8(), irk = o.u8(), sinif = o.u16();
  const x = konumCoz(o.u16()), z = konumCoz(o.u16()), y = konumCoz(o.u16());
  const yuz = o.u8(), sac = o.u32(), canDurumu = o.u8(), anormalDurum = o.u32();
  o.u8(); const yetki = o.u8(); o.u8(); o.u8(); o.u8(); o.u8(); o.u8(); // aranan parti, yetki, parti lideri, görünmezlik, takım rengi, kask/kostüm gizli
  const yon = o.i16();
  o.u8(); o.u8(); o.u8(); // şeytan, kanat gizli, yeni başlayan
  const rutbe = o.u8(); o.i8(); o.i8();
  const esyalar = {} as KullaniciBilgisi['esyalar'];
  for (const yuva of GORUNEN_YUVALAR) esyalar[yuva] = { no: o.u32(), dayaniklilik: o.u16(), bayrak: o.u8() };
  const bolge = o.u8();
  o.u8(); o.u8(); o.u32(); o.u8(); o.u8(); o.u8(); o.u8(); o.u8(); o.u16(); o.u32(); o.u32(); o.u16(); // -1,-1, 0, gizli×3, peri, yeniden doğuş, unvan, dönüş sembolü, yüz süresi, yeni alan
  return { id, ad, ulus, klanNo, fame, klan, pelerinNo, seviye, irk, sinif, x, z, y, yuz, sac, canDurumu, anormalDurum, yetki, yon, rutbe, esyalar, bolge };
}

/** `WIZ_REQ_USERIN (0x16)`: `u16 adet`, her oyuncu için `u8 0, u16 id` + kayıt. Bölgeye girince sunucu bölgedeki herkesi bu paketle yollar. */
export function kullaniciListesi(govde: Uint8Array): { oyuncular: KullaniciBilgisi[]; kalan: number } {
  const o = new PaketOkuyucu(govde);
  const adet = o.u16();
  const oyuncular: KullaniciBilgisi[] = [];
  for (let i = 0; i < adet; i++) { o.u8(); const id = o.u16(); oyuncular.push(kullaniciBilgisiOku(o, id)); }
  return { oyuncular, kalan: o.kalan };
}

/** `WIZ_USER_INOUT (0x07)`: `u16 tür (1 giriş, 2 çıkış, 3 yeniden doğuş…), u16 id`, çıkış değilse oyuncu kaydı. */
export function kullaniciGirisCikis(govde: Uint8Array): { tur: number; id: number; oyuncu: KullaniciBilgisi | null; kalan: number } {
  const o = new PaketOkuyucu(govde);
  const tur = o.u16(), id = o.u16();
  const oyuncu = tur === GIRIS_CIKIS.CIKIS ? null : kullaniciBilgisiOku(o, id);
  return { tur, id, oyuncu, kalan: o.kalan };
}

/** `WIZ_MOVE (0x06)` (sunucu → client): başka bir oyuncunun hareketi. Varış noktası ve hız; yankı: 1 başladı, 3 sürüyor, 0 durdu. */
export function kullaniciHareketi(govde: Uint8Array): { id: number; x: number; z: number; y: number; hiz: number; yanki: number; kalan: number } {
  const o = new PaketOkuyucu(govde);
  return { id: o.u16(), x: konumCoz(o.u16()), z: konumCoz(o.u16()), y: konumCoz(o.u16()), hiz: o.i16() / 10, yanki: o.u8(), kalan: o.kalan };
}

/** `WIZ_NPC_REGION (0x1C)`: `u16 adet`, ardından `u16 id`ler (bölgedeki canlı NPC/canavarlar). Ayrıntıyı client `0x1D` ile ister. */
export function npcBolgesi(govde: Uint8Array): number[] {
  const o = new PaketOkuyucu(govde); const n = o.u16();
  return Array.from({ length: n }, () => o.u16());
}
/** `WIZ_REGIONCHANGE (0x15)`: `u8 alt komut` (0 başla, 1 liste, 2 bitti); alt komut 1'de `u16 adet` + `u16 id`ler. Başka alt komutta null. */
export function kullaniciBolgesi(govde: Uint8Array): number[] | null {
  const o = new PaketOkuyucu(govde); if (o.u8() !== 1) return null; const n = o.u16();
  return Array.from({ length: n }, () => o.u16());
}
/** `WIZ_REQ_NPCIN (0x1D)` / `WIZ_REQ_USERIN (0x16)` isteği: `u16 adet`, `u16 id`ler (sunucu en çok 1000 kabul eder). */
export function kimlikIstegi(idler: number[]): Uint8Array {
  const y = new PaketYazici().u16(Math.min(idler.length, 1000)); for (const id of idler.slice(0, 1000)) y.u16(id); return y.baytlar();
}
