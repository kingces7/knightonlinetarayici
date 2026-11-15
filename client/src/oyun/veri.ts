// Tek oyunculu mod verileri (canavar türleri, eşya listesi, seviye tablosu).
// Not: Gerçek değerler sunucu veritabanında; sunucu bağlandığında oradan gelecek.

export interface EsyaTanimi {
  no: number; ad: string; aciklama: string; simge: string;
  tur: 'silah' | 'zirh'; /** eşya türü numarası (silah: 21 kılıç, 31 balta…) */ tip: number; /** eşyanın giyileceği yuva kodu (sunucu ItemSlot: 0 çift el seçmeli, 1 sağ el, 3 iki elli, 5 gövde, 6 bacak, 7 kask, 8 eldiven, 9 bot…) */ yuva: number; /** başlangıç eşyası: ganimet olarak düşmez */ baslangic?: boolean; hasar: number; /** vuruş gecikmesi (100 = 1 sn) */ gecikme: number; savunma: number; fiyat: number;
}

export interface CanavarTuru {
  sid: number; // sunucu K_MONSTER numarası
  model: number; // NPC_Looks numarası (/karakter/<model>.glb)
  ad: string;
  seviye: number;
  can: number;
  hasar: number; // sunucu sDamage (formülde toplam vuruş gücü)
  ac: number; isabet: number; kacis: number; // sunucu sAc / sHitRate / sEvadeRate
  gecikme: number; // sunucu sAttackDelay (ms)
  exp: number; para: number; // sunucu iExp / iMoney
  arama: number; izleme: number; // sunucu bySearchRange (saldırgan canavarın fark etme menzili) / byTracingRange (doğduğu yerden en çok ne kadar kovalar), m
  hizGez: number; hizKovala: number; // m/sn: sunucu bySpeed1 (rastgele gezinme, RandomMove) ve bySpeed2 (kovalama/saldırı, NpcTracing)
  olcek: number;
  adet: number; // haritadaki sayı (burada)
}

/**
 * Tek oyunculu modda gösterilen canavar ailesi → sunucu K_MONSTER kaydı (Moradon bölgesi canavarları, araclar/sunucu/oyuncu-disa-aktar.ps1).
 * Her ailenin en düşük seviyeli üyesi alınır. Adet henüz tahmin; konumlar için K_NPCPOS1098 ileride kullanılacak.
 */
const AILELER: { sid: number; adet: number }[] = [
  { sid: 750, adet: 6 }, // Worm
  { sid: 850, adet: 6 }, // Bandicoot
  { sid: 150, adet: 6 }, // Kecoon
  { sid: 250, adet: 4 }, // Bulcan
  { sid: 350, adet: 4 }, // Gavolt
  { sid: 550, adet: 3 }, // Werewolf
];
/** Sunucu K_MONSTER numarasından canavar türü (yerleşim kayıtları için). */
export function canavarTuruSid(sid: number, adet = 1): CanavarTuru | null {
  const m = kurallar?.canavar.find((x) => x.sid === sid);
  if (!m) return null;
  return { sid: m.sid, arama: m.arama, izleme: m.izleme, model: m.model, ad: m.ad, seviye: m.seviye, can: m.hp, hasar: m.hasar, ac: m.ac, isabet: m.isabet, kacis: m.kacis, gecikme: m.gecikme, exp: m.exp, para: m.para, hizGez: m.hizGez, hizKovala: m.hizKovala, olcek: m.boyut / 100, adet };
}
export function canavarTurleri(): CanavarTuru[] {
  const tur: CanavarTuru[] = [];
  for (const a of AILELER) {
    const m = kurallar?.canavar.find((x) => x.sid === a.sid);
    if (m) tur.push({ sid: m.sid, arama: m.arama, izleme: m.izleme, model: m.model, ad: m.ad, seviye: m.seviye, can: m.hp, hasar: m.hasar, ac: m.ac, isabet: m.isabet, kacis: m.kacis, gecikme: m.gecikme, exp: m.exp, para: m.para, hizGez: m.hizGez, hizKovala: m.hizKovala, olcek: m.boyut / 100, adet: a.adet });
  }
  return tur;
}

export const OYUNCU_MODELI = 31137;

/**
 * Oyuncu kuralları (sunucu veritabanı + NewChrValue.tbl; araclar: sunucu/oyuncu-disa-aktar.ps1 + npm run oyuncu).
 * Yüklenemezse eski tahmini değerler kullanılır.
 */
/** Sunucu MAGIC + MAGIC_TYPE1/4 (MagicInstance.cpp ExecuteType1 / ExecuteType4). */
export interface BeceriKurali {
  no: number; ad: string; msp: number;
  /** Tekrar kullanım: sunucu ReCastTime × 90 ms */
  yenidenKullanim: number; seviye: number;
  /** 1 = fiziksel saldırı skill'i (Type1), 4 = buff (Type4) */
  tip: number;
  tip1?: { isabetTuru: number; isabet: number; vurus: number; ekHasar: number; canavarYuzde: number };
  tip4?: { turu: number; sure: number; hiz: number; ac: number; acYuzde: number; saldiriHizi: number };
}

export interface OyuncuKurallari {
  beceri: Record<string, BeceriKurali>;
  deneyim: Record<string, number>;
  katsayi: Record<string, { hp: number; mp: number; sp: number; ac: number; isabet: number; kacis: number; kisaKilic: number; jamadar: number; kilic: number; balta: number; sopa: number; mizrak: number; mace: number; asa: number; yay: number }>;
  hasarAyar: { mondef: number; canavarHasarCarpani: number; rdamage: number };
  canavar: { sid: number; ad: string; model: number; boyut: number; seviye: number; hp: number; ac: number; isabet: number; kacis: number; hasar: number; gecikme: number; exp: number; para: number; hizGez: number; hizKovala: number; arama: number; izleme: number; adet: number }[];
  yeniKarakter: Record<string, { ad: string; str: number; sta: number; dex: number; int: number; cha: number; puan: number; esyalar: number[] }>;
}
export let kurallar: OyuncuKurallari | null = null;
/** Yeni karakter satırı (NewChrValue.tbl): 110201 = Human Warrior. */
export const YENI_KARAKTER = '110201';
export const esyaBul = (no: number): EsyaTanimi | undefined => esyalar.find((e) => e.no === no);
export async function kurallariYukle(): Promise<void> {
  try { kurallar = await (await fetch('/oyun/oyuncu.json')).json() as OyuncuKurallari; } catch { kurallar = null; }
}

/** Seviye atlamak için gereken deneyim (sunucu LEVEL_UP tablosu). */
export const gerekenDeneyim = (seviye: number): number => kurallar?.deneyim[String(seviye)] ?? 80 + seviye * seviye * 40;

export function rastgele(a: number, b: number): number { return a + Math.random() * (b - a); }
export function rastgeleTam(a: number, b: number): number { return Math.floor(rastgele(a, b + 1)); }

let esyalar: EsyaTanimi[] = [];
export async function esyalariYukle(): Promise<EsyaTanimi[]> {
  try {
    esyalar = (await (await fetch('/esya/esyalar.json')).json() as EsyaTanimi[]).map((e) => ({ ...e, simge: `/esya/${e.simge}` }));
  } catch { esyalar = []; }
  return esyalar;
}

/** Canavar seviyesine göre ganimet: altın + 0-2 eşya (ucuz eşyalar daha sık). */
export function ganimetUret(seviye: number): { altin: number; esyalar: EsyaTanimi[] } {
  const altin = rastgeleTam(5 * seviye, 18 * seviye);
  const adaylar = esyalar.filter((e) => !e.baslangic);
  const uygun = adaylar.filter((e) => e.fiyat <= 1500 * seviye * seviye);
  const havuz = uygun.length ? uygun : adaylar;
  const sonuc: EsyaTanimi[] = [];
  const adet = Math.random() < 0.55 ? 1 : Math.random() < 0.4 ? 2 : 0;
  for (let i = 0; i < adet && havuz.length; i++) sonuc.push(havuz[Math.floor(Math.random() * havuz.length)]);
  return { altin, esyalar: sonuc };
}
