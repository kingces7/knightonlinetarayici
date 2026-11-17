// Tek oyunculu mod verileri (canavar türleri, eşya listesi, seviye tablosu).
// Not: Gerçek değerler sunucu veritabanında; sunucu bağlandığında oradan gelecek.

export interface EsyaTanimi {
  /** Sunucudaki TAM eşya numarası (son 3 hane yükseltme/ek kodu); sunucuya giden her istekte bu kullanılır. Yerel eşyalarda yoktur. */ sunucuNo?: number;
  no: number; ad: string; aciklama: string; simge: string;
  /** Yığınlanabilir mi (eşya tablosu Countable: iksir, ok, kâğıt…)? `adet` = bu yuvadaki sayı. */ sayilabilir?: boolean; adet?: number; tur: 'silah' | 'zirh' | 'sarf'; /** eşya türü numarası (silah: 21 kılıç, 31 balta…) */ tip: number; /** eşyanın giyileceği yuva kodu (sunucu ItemSlot: 0 çift el seçmeli, 1 sağ el, 3 iki elli, 5 gövde, 6 bacak, 7 kask, 8 eldiven, 9 bot…) */ yuva: number; /** başlangıç eşyası: ganimet olarak düşmez */ baslangic?: boolean; hasar: number; /** vuruş gecikmesi (100 = 1 sn) */ gecikme: number; savunma: number; fiyat: number;
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

/** Oyuncunun görünümü: 931137 = upc_el_rm iskeleti + upc_el_rm_chitin_w.n3chr (savaşçı Chitin Shell seti; başlangıç eşyalarının görünümü). Ses/animasyon tabloları 31137 için. */
export const OYUNCU_MODELI = 931137;
export const OYUNCU_SES_MODELI = 31137;
/**
 * Irka göre oyuncu görünümü (sunucu ırk numarası: 1 Ark Tuarek, 2 Tuarek, 3 Wrinkle Tuarek, 4 Puri Tuarek; 11 Barbar, 12 Erkek, 13 Kadın).
 * Değerler NPC_Looks numaralarıdır (UPC_DefaultLooks iskeletleri); zırhlı hazır görünümler kullanılır, eşyaya göre giydirme henüz yok.
 * Üretim: npm run karakter -- 31121 31128 31142 31147 31152 31155 (araclar klasöründe).
 */
export const IRK_MODELLERI: Record<number, number> = { 1: 31142, 2: 31152, 3: 31155, 4: 31147, 11: 31121, 12: OYUNCU_MODELI, 13: 31128 };
export const irkModeli = (irk: number): number => IRK_MODELLERI[irk] ?? OYUNCU_MODELI;

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
/** Sunucu modu: Item_Org_us.tbl'deki TÜM eşyalar (araclar: npm run tum-esyalar); sunucu her eşyayı verebilir/düşürebilir. */
const tumEsya = new Map<number, EsyaTanimi>();
export async function tumEsyalariYukle(): Promise<void> {
  if (tumEsya.size) return;
  try {
    for (const e of await (await fetch('/esya/tum.json')).json() as EsyaTanimi[]) tumEsya.set(e.no, { ...e, simge: e.simge ? `/esya/${e.simge}` : '' });
  } catch { /* tüm liste yoksa yalnız küçük liste kullanılır */ }
}
export const esyaBul = (no: number): EsyaTanimi | undefined => esyalar.find((e) => e.no === no) ?? tumEsya.get(no);
/** Sunucu eşya numarası (son 3 hane yükseltme/ek kodu) → tanım; tabloda yoksa eşya yuvada kalsın diye yer tutucu döner (yuva asla kaybolmaz). */
export function esyaBulSunucu(no: number): EsyaTanimi {
  const t = esyaBul(no) ?? esyaBul(no - (no % 1000));
  return t ? { ...t, sunucuNo: no } : { no, ad: `Item ${no}`, aciklama: '', simge: '', tur: 'sarf', tip: 0, yuva: 0, hasar: 0, gecikme: 0, savunma: 0, fiyat: 0 };
}
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

/** NPC mağazaları: satış grupları (sunucu ITEM_SELLTABLE; sayfa başına 24 yuva) ve eşya bilgileri (araclar: npm run magaza). */
let magazaVeri: { gruplar: Record<string, number[][]>; esyalar: Record<string, EsyaTanimi> } | null = null;
export async function magazaYukle(): Promise<void> {
  try {
    const m = await (await fetch('/magaza/magaza.json')).json() as { gruplar: Record<string, number[][]>; esyalar: Record<string, EsyaTanimi> };
    for (const e of Object.values(m.esyalar)) e.simge = e.simge ? `/esya/${e.simge}` : '';
    magazaVeri = m;
  } catch { magazaVeri = null; }
}
/** Mağaza grubunda eşyanın (sayfa, sayfadaki sıra) konumu: sunucu satın almada bunu doğrular. */
export function magazaKonum(grup: number, no: number): { sayfa: number; sira: number } | null {
  const g = magazaVeri?.gruplar[String(grup)]; if (!g) return null;
  for (let s = 0; s < g.length; s++) { const i = g[s].indexOf(no); if (i >= 0) return { sayfa: s, sira: i }; }
  return null;
}
/** Satış grubunun sayfaları (boş yuvalar atılır). Grup yoksa null. */
export function magazaSayfalari(grup: number): EsyaTanimi[][] | null {
  const g = magazaVeri?.gruplar[String(grup)];
  if (!g || !magazaVeri) return null;
  return g.map((sayfa) => sayfa.filter(Boolean).map((no) => magazaVeri!.esyalar[String(no)]).filter(Boolean));
}

/** Canavar seviyesine göre ganimet: altın + 0-2 eşya (ucuz eşyalar daha sık). */
/**
 * Canavar ganimeti (sunucu Npc.cpp CNpc::GiveNpcHaveItem): para = iMoney × rastgele(70..100)/100 (en çok 32000);
 * K_MONSTER_ITEM'in her yuvası için rastgele(0..10000) ≤ yüzde ise eşya düşer. Eşya numarası 100000000'dan küçükse bir eşya GRUBUdur
 * (içinden rastgele biri seçilir), değilse doğrudan eşyadır. Veri: araclar `npm run ganimet` (ganimet.json). Yığın adedi (ok 20 adet) henüz yok.
 */
interface GanimetVerisi { canavar: Record<string, { para: number; ogeler: { no: number; yuzde: number }[] }>; gruplar: Record<string, number[]>; esyalar: Record<string, EsyaTanimi> }
let ganimetVeri: GanimetVerisi | null = null;
export async function ganimetYukle(): Promise<void> {
  try {
    const g = await (await fetch('/oyun/ganimet.json')).json() as GanimetVerisi;
    for (const e of Object.values(g.esyalar)) e.simge = e.simge ? `/esya/${e.simge}` : '';
    ganimetVeri = g;
  } catch { ganimetVeri = null; }
}
export function ganimetUret(tur: CanavarTuru): { altin: number; esyalar: EsyaTanimi[] } {
  const g = ganimetVeri?.canavar[String(tur.sid)];
  if (!g || !ganimetVeri) { // ganimet verisi yoksa (dosya üretilmediyse) yalnızca para
    return { altin: Math.floor(tur.para * rastgeleTam(70, 100) / 100), esyalar: [] };
  }
  let altin = Math.floor(g.para * rastgeleTam(70, 100) / 100);
  if (altin >= 32767) altin = 32000;
  const sonuc: EsyaTanimi[] = [];
  for (const o of g.ogeler) {
    if (rastgeleTam(0, 10000) > o.yuzde) continue;
    let no = o.no;
    if (no < 100000000) { const grup = ganimetVeri.gruplar[String(no)]; if (!grup?.length) continue; no = grup[Math.floor(Math.random() * grup.length)]; }
    const e = ganimetVeri.esyalar[String(no)];
    if (!e) continue;
    const ok = o.no >= 391010000 && o.no < 392010000; // sunucu: ok doğrudan düşerse 20 adet (ARROW_MIN..ARROW_MAX)
    sonuc.push(ok ? { ...e, adet: 20 } : e);
  }
  return { altin, esyalar: sonuc };
}
