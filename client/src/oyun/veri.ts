// Tek oyunculu mod verileri (canavar türleri, eşya listesi, seviye tablosu).
// Not: Gerçek değerler sunucu veritabanında; sunucu bağlandığında oradan gelecek.

export interface EsyaTanimi {
  no: number; ad: string; aciklama: string; simge: string;
  tur: 'silah' | 'zirh'; hasar: number; savunma: number; fiyat: number;
}

export interface CanavarTuru {
  model: number; // NPC_Looks numarası (/karakter/<model>.glb)
  ad: string;
  seviye: number;
  can: number;
  hasar: [number, number];
  hiz: number; // m/sn (yürüme)
  olcek: number;
  adet: number; // haritadaki sayı
}

export const CANAVARLAR: CanavarTuru[] = [
  { model: 700, ad: 'Worm', seviye: 1, can: 45, hasar: [2, 5], hiz: 1.6, olcek: 1, adet: 6 },
  { model: 800, ad: 'Bandicoot', seviye: 2, can: 65, hasar: [3, 7], hiz: 2.0, olcek: 1, adet: 6 },
  { model: 100, ad: 'Kecoon', seviye: 3, can: 90, hasar: [5, 9], hiz: 2.2, olcek: 1, adet: 6 },
  { model: 200, ad: 'Bulcan', seviye: 5, can: 140, hasar: [7, 12], hiz: 2.4, olcek: 1, adet: 4 },
  { model: 300, ad: 'Gavolt', seviye: 6, can: 180, hasar: [9, 15], hiz: 2.4, olcek: 1, adet: 4 },
  { model: 500, ad: 'Werewolf', seviye: 8, can: 260, hasar: [12, 20], hiz: 2.8, olcek: 1, adet: 3 },
];

export const OYUNCU_MODELI = 31137;

/** Seviye atlamak için gereken deneyim. */
export const gerekenDeneyim = (seviye: number) => 80 + seviye * seviye * 40;

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
