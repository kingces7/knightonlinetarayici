// Tek oyunculu mod verileri (canavar türleri, eşya listesi, seviye tablosu).
// Not: Gerçek değerler sunucu veritabanında; sunucu bağlandığında oradan gelecek.

export interface EsyaTanimi {
  no: number; ad: string; aciklama: string; simge: string;
  tur: 'silah' | 'zirh'; /** eşya türü numarası (silah: 21 kılıç, 31 balta…) */ tip: number; hasar: number; /** vuruş gecikmesi (100 = 1 sn) */ gecikme: number; savunma: number; fiyat: number;
}

export interface CanavarTuru {
  model: number; // NPC_Looks numarası (/karakter/<model>.glb)
  ad: string;
  seviye: number;
  can: number;
  hasar: number; // sunucu sDamage (formülde toplam vuruş gücü)
  ac: number; isabet: number; kacis: number; // sunucu sAc / sHitRate / sEvadeRate
  gecikme: number; // sunucu sAttackDelay (ms)
  exp: number; para: number; // sunucu iExp / iMoney
  hiz: number; // m/sn (yürüme) — henüz tahmin
  olcek: number;
  adet: number; // haritadaki sayı (burada)
}

/**
 * Tek oyunculu modda gösterilen canavar ailesi → sunucu K_MONSTER kaydı (Moradon bölgesi canavarları, araclar/sunucu/oyuncu-disa-aktar.ps1).
 * Her ailenin en düşük seviyeli üyesi alınır. Yürüme hızı ve adet henüz tahmin; konumlar için K_NPCPOS1098 ileride kullanılacak.
 */
const AILELER: { sid: number; hiz: number; adet: number }[] = [
  { sid: 750, hiz: 1.6, adet: 6 }, // Worm
  { sid: 850, hiz: 2.0, adet: 6 }, // Bandicoot
  { sid: 150, hiz: 2.2, adet: 6 }, // Kecoon
  { sid: 250, hiz: 2.4, adet: 4 }, // Bulcan
  { sid: 350, hiz: 2.4, adet: 4 }, // Gavolt
  { sid: 550, hiz: 2.8, adet: 3 }, // Werewolf
];
export function canavarTurleri(): CanavarTuru[] {
  const tur: CanavarTuru[] = [];
  for (const a of AILELER) {
    const m = kurallar?.canavar.find((x) => x.sid === a.sid);
    if (m) tur.push({ model: m.model, ad: m.ad, seviye: m.seviye, can: m.hp, hasar: m.hasar, ac: m.ac, isabet: m.isabet, kacis: m.kacis, gecikme: m.gecikme, exp: m.exp, para: m.para, hiz: a.hiz, olcek: m.boyut / 100, adet: a.adet });
  }
  return tur;
}

export const OYUNCU_MODELI = 31137;

/**
 * Oyuncu kuralları (sunucu veritabanı + NewChrValue.tbl; araclar: sunucu/oyuncu-disa-aktar.ps1 + npm run oyuncu).
 * Yüklenemezse eski tahmini değerler kullanılır.
 */
export interface OyuncuKurallari {
  deneyim: Record<string, number>;
  katsayi: Record<string, { hp: number; mp: number; sp: number; ac: number; isabet: number; kacis: number; kisaKilic: number; jamadar: number; kilic: number; balta: number; sopa: number; mizrak: number; mace: number; asa: number; yay: number }>;
  hasarAyar: { mondef: number; canavarHasarCarpani: number; rdamage: number };
  canavar: { sid: number; ad: string; model: number; boyut: number; seviye: number; hp: number; ac: number; isabet: number; kacis: number; hasar: number; gecikme: number; exp: number; para: number; adet: number }[];
  yeniKarakter: Record<string, { ad: string; str: number; sta: number; dex: number; int: number; cha: number; puan: number }>;
}
export let kurallar: OyuncuKurallari | null = null;
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
  const uygun = esyalar.filter((e) => e.fiyat <= 1500 * seviye * seviye);
  const havuz = uygun.length ? uygun : esyalar;
  const sonuc: EsyaTanimi[] = [];
  const adet = Math.random() < 0.55 ? 1 : Math.random() < 0.4 ? 2 : 0;
  for (let i = 0; i < adet && havuz.length; i++) sonuc.push(havuz[Math.floor(Math.random() * havuz.length)]);
  return { altin, esyalar: sonuc };
}
