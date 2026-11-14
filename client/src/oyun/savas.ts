// Savaş formülleri: sunucu kaynağından (LILITH_Game-Server/GameServer) birebir.
//   Unit.cpp:      CUser::GetDamage (normal vuruş), CNpc::GetDamage (canavar → oyuncu), Unit::GetHitRate
//   UserAbilityHandler.cpp: SetCoefficient, SetUserAbility (toplam vuruş, savunma, isabet, kaçış)
// Henüz yok: skill vuruşları, elementel eşya hasarı, perk/buff çarpanları, oyuncu↔oyuncu çarpanları (bu tek oyunculu modda gerekmiyor).
import { kurallar, type EsyaTanimi } from './veri';

export type VurusSonucu = 'buyuk' | 'basarili' | 'normal' | 'iska';

/** Unit::GetHitRate: isabet oranına göre [alt sınır, büyük başarı, başarı, normal] eşikleri (1..10000 zar). */
const ISABET_TABLOSU: [number, number, number, number][] = [
  [5.0, 3500, 7500, 9800], [3.0, 2500, 6000, 9600], [2.0, 2000, 5000, 9400], [1.25, 1500, 4000, 9200],
  [0.8, 1000, 3000, 9000], [0.5, 800, 2500, 8000], [0.33, 600, 2000, 7000], [0.2, 400, 1500, 6000], [-Infinity, 200, 1000, 5000],
];
export function isabetSonucu(oran: number): VurusSonucu {
  const zar = 1 + Math.floor(Math.random() * 10000);
  const [, b, s, n] = ISABET_TABLOSU.find((t) => oran >= t[0])!;
  return zar <= b ? 'buyuk' : zar <= s ? 'basarili' : zar <= n ? 'normal' : 'iska';
}

/** Silah türü (eşya tablosundaki tür) → sınıf katsayısı alanı (SetCoefficient). Silahsızsa 0. */
function silahKatsayisi(sinif: number, silah: EsyaTanimi | null): number {
  const k = kurallar?.katsayi[String(sinif)];
  if (!k || !silah) return 0;
  switch (silah.tip) {
    case 11: return k.kisaKilic;
    case 21: case 22: return k.kilic;
    case 31: case 32: return k.balta;
    case 41: case 42: return k.sopa;
    case 51: case 52: return k.mizrak;
    case 70: case 71: return k.yay;
    case 110: return k.asa;
    case 140: return k.jamadar;
    case 181: return k.mace;
    default: return 0;
  }
}

export interface SavasOyuncusu {
  sinif: number; seviye: number;
  stat: { str: number; sta: number; dex: number; int: number; cha: number };
  silah: EsyaTanimi | null; zirh: EsyaTanimi | null;
}

/** SetUserAbility: toplam vuruş gücü (m_sTotalHit), STR tabanlı (haydut hariç). Silahsızken güç en az 3. */
export function toplamVurus(o: SavasOyuncusu): number {
  const guc = Math.max(3, o.silah?.hasar ?? 0);
  const kat = silahKatsayisi(o.sinif, o.silah);
  const str = o.stat.str;
  const baseAp = str > 150 ? str - 150 - (str === 160 ? 1 : 0) : 0;
  return Math.floor(0.005 * guc * (str + 40) + kat * guc * o.seviye * str + 3) + baseAp;
}

/** SetUserAbility: toplam savunma (m_sTotalAc) — sınıf AC katsayısı × (seviye + eşya savunması); STA 100'ü aşarsa fazlası eklenir. */
export function toplamSavunma(o: SavasOyuncusu): number {
  const k = kurallar?.katsayi[String(o.sinif)];
  let ac = Math.trunc((k?.ac ?? 1) * (o.seviye + (o.zirh?.savunma ?? 0)));
  if (o.stat.sta > 100) ac += o.stat.sta - 100;
  return ac;
}
export function isabetOrani(o: SavasOyuncusu): number { return 1 + (kurallar?.katsayi[String(o.sinif)]?.isabet ?? 0) * o.seviye * o.stat.dex; }
export function kacisOrani(o: SavasOyuncusu): number { return 1 + (kurallar?.katsayi[String(o.sinif)]?.kacis ?? 0) * o.seviye * o.stat.dex; }

export interface CanavarDegerleri { ac: number; isabet: number; kacis: number; hasar: number }

const MAX_HASAR = 32000;
const rastgeleTam0 = (n: number): number => Math.floor(Math.random() * (n + 1)); // myrand(0, n)

/** Oyuncunun normal vuruşu canavara (CUser::GetDamage, skill'siz). Hasar 0 = ıska. */
export function oyuncuVurusu(o: SavasOyuncusu, c: CanavarDegerleri): { sonuc: VurusSonucu; hasar: number } {
  const ayar = kurallar?.hasarAyar ?? { mondef: 1, canavarHasarCarpani: 1, rdamage: 1 };
  const ap = toplamVurus(o) * 100; // m_bAttackAmount = 100
  let ac = c.ac; if (ac) ac = Math.trunc(ac * ayar.mondef);
  const hitB = Math.trunc((ap * 200 / 100) / (ac + 240));
  const sonuc = isabetSonucu(isabetOrani(o) / c.kacis + 1.0);
  if (sonuc === 'iska') return { sonuc, hasar: 0 };
  let hasar = Math.trunc(0.75 * hitB + 0.3 * rastgeleTam0(hitB)); // rahip değil
  if (o.seviye > 30) hasar = Math.trunc(hasar * ayar.rdamage);
  hasar = Math.trunc(hasar * ayar.canavarHasarCarpani);
  return { sonuc, hasar: Math.min(hasar, MAX_HASAR) };
}

/** Canavarın oyuncuya vuruşu (CNpc::GetDamage → CUser). Hasar 0 = ıska. */
export function canavarVurusu(c: CanavarDegerleri, o: SavasOyuncusu): { sonuc: VurusSonucu; hasar: number } {
  const hitB = Math.trunc((c.hasar * 100 * 200 / 100) / (toplamSavunma(o) + 240));
  if (hitB <= 0) return { sonuc: 'iska', hasar: 0 };
  const sonuc = isabetSonucu(c.isabet / kacisOrani(o));
  if (sonuc === 'iska') return { sonuc, hasar: 0 };
  let hasar = Math.trunc(0.3 * rastgeleTam0(hitB)) + Math.trunc(0.85 * hitB);
  if (sonuc === 'buyuk') hasar = Math.trunc((hasar * 3) / 2);
  hasar = Math.min(hasar, Math.trunc(2.6 * c.hasar), MAX_HASAR);
  return { sonuc, hasar };
}

/** Silahın vuruş aralığı (sn): eşya tablosundaki gecikme/100; silahsızken 1 sn (sunucu: delaytime < 100 reddedilir). */
export function vurusAraligi(silah: EsyaTanimi | null): number { return (silah?.gecikme || 100) / 100; }
