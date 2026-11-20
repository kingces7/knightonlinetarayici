// Client haritası (.gtd) ile sunucu haritası (.smd) aynı harita mı? Yükseklik ızgaralarını karşılaştırır.
// Sunucu paketindeki .smd dosyalarının çoğu başka haritanın kopyasıdır; yanlış .smd'den gelen çarpışma/kapı verisi
// client haritasına uymaz (rapor: docs/raporlar/2026-11-19-harita-hata-raporu-fast.md, H-2).

/**
 * İstemci haritası → sunucu haritası (.smd) eşleşmesi. İstemci adıyla aynı olmayanlar burada (anahtar küçük harf).
 * Burada olmayan harita `<ad>.smd` varsayılır (bulunamazsa ya da uyuşmazsa sunucu verisi yazılmaz).
 * Her satır `ZONE_INFO1098.strZoneSmdName` (bölgenin gerçekten kullandığı dosya) ile client `Zones.csv`'deki `.gtd`
 * eşleştirilip yükseklik benzerliğiyle ölçüldü (2026-11-19). `eslantzone` yok: bölgeye göre `k_eslant.smd` ya da
 * `e_eslant.smd` (yükseklikleri aynı, kapı listeleri farklı); hangisi olacağı karar bekliyor.
 */
export const SUNUCU_HARITASI: Record<string, string> = {
  karus2004: '1098karus2004.smd', // %81,9
  elmo2004: '1098elmo2004.smd', // %90,3
  moradon: '1098moradon_0826.smd', // %85,2 (x/z yer değiştirmiş)
  moradon_xmas: '1098moradon_0826.smd', // %100
  '14th_oldmoradon': 'old_moradon.smd', // %98,6
  war_a: '1098war_a.smd', // bölge 30; %73
  freezone_a: '1098freezone_a.smd', // bölge 72; %99,7 (bozuk çarpışma üçgenleri atlanır)
  newfreezone_b: 'freezone_b.smd', // bölge 113; %50,9 (eşiğin hemen üstünde)
  warfreezone_a_event2012: 'freezone_a.smd', // bölge 115; %80
  // Aşağıdakiler bölge tablosundan değil, yalnız yükseklik benzerliğinden (tek aday, diğerleri < %90): client Zones tablosu bu
  // bölgeler için başka .gtd gösteriyor (75 → itemzone_a.gtd %13; 51-55 → clanfight_b/_d.gtd %25), yani asıl eşleşme burada.
  freezone_new: 'itemzone_a.smd', // %100 (sonraki aday %88)
  clanfight_c: 'clanfight_b.smd', // %100
  clanfight: 'clanfight_b.smd', // %98,9
  // Eslant: iki .smd'nin yükseklikleri aynı (%80,6), kapı listeleri farklı; bölge 11/13/14 k_eslant, 12/15/16 e_eslant kullanır. Tek klasör olduğundan Karus'unki seçildi (karar bekliyor).
  eslantzone: 'k_eslant.smd',
};

export interface IzgaraKaynak { boyut: number; yukseklik: Float32Array }

export interface YukseklikEslesmesi {
  gtdBoyut: number;
  smdBoyut: number;
  boyutAyni: boolean;
  /** .smd[i] ≈ .gtd[i] olan hücre oranı (0-1): aynı sıra. */
  ayniSira: number;
  /** .smd[z*N+x] ≈ .gtd[x*N+z] olan hücre oranı: x/z yer değiştirmiş. */
  devrik: number;
  /** İyi olan yön ('-' = boyut farklı, karşılaştırılamadı). */
  yon: 'ayni' | 'devrik' | '-';
  /** İyi olan yönün oranı (boyut farklıysa 0). */
  oran: number;
}

/** İki hücrenin yüksekliği bu kadar metreden azsa "aynı" sayılır. */
export const YUKSEKLIK_TOLERANSI = 1;
/** Bundan düşük benzerlik (ya da farklı boyut) = uyuşmuyor. Sağlıklı eşleşmeler %73-100 çıkıyor (rapor H-2). */
export const ESLESME_ESIGI = 0.5;

export function yukseklikEslesmesi(gtd: IzgaraKaynak, smd: IzgaraKaynak): YukseklikEslesmesi {
  const N = gtd.boyut;
  if (N !== smd.boyut) return { gtdBoyut: N, smdBoyut: smd.boyut, boyutAyni: false, ayniSira: 0, devrik: 0, yon: '-', oran: 0 };
  let ayni = 0, devrik = 0;
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
    const g = gtd.yukseklik[x * N + z];
    if (Math.abs(g - smd.yukseklik[x * N + z]) < YUKSEKLIK_TOLERANSI) ayni++;
    if (Math.abs(g - smd.yukseklik[z * N + x]) < YUKSEKLIK_TOLERANSI) devrik++;
  }
  const n = N * N, a = ayni / n, d = devrik / n;
  return { gtdBoyut: N, smdBoyut: smd.boyut, boyutAyni: true, ayniSira: a, devrik: d, yon: d > a ? 'devrik' : 'ayni', oran: Math.max(a, d) };
}

/** Eşleşme güvenilir mi (boyut aynı ve benzerlik eşiğin üstünde)? */
export function eslesmeGuvenilir(e: YukseklikEslesmesi): boolean {
  return e.boyutAyni && e.oran >= ESLESME_ESIGI;
}

/** Kullanıcıya gösterilecek kısa neden (güvenilmezse). */
export function eslesmeNedeni(e: YukseklikEslesmesi): string {
  if (!e.boyutAyni) return `ızgara boyu farklı (client ${e.gtdBoyut}, sunucu ${e.smdBoyut})`;
  return `yükseklik benzerliği %${(e.oran * 100).toFixed(1)} (eşik %${ESLESME_ESIGI * 100})`;
}
