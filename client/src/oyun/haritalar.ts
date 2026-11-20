// Harita başına oyun ayarları. Gerçek değerler (başlangıç noktası, canavar yerleşimi) sunucu
// veritabanından gelir; elle verilenler aşağıdaki ELLE tablosundadır.
//
// Bölge numarası → harita eşlemesi `donusturulmus/web/harita/bolgeler.json` dosyasından okunur
// (araclar/harita/bolge-tara.ts üretir; sunucudaki ZONE_INFO1098 + client Zones.csv + .smd/.gtd benzerliği).
// Dosya yoksa yalnız ELLE tablosundaki haritalar kullanılır.
export interface HaritaAyari {
  /** Karakterin doğduğu nokta (Knight Online x, z). null = haritanın ortası. */
  baslangic: [number, number] | null;
  /** Bu haritada canavar olsun mu? (Moradon güvenli şehir; yeni haritalarda canavarlar sunucudan gelir.) */
  canavar: boolean;
  /** Sunucu bölge numarası (bölge müziği: Snd/<bölge>_<ad>.ogg). Birden çok bölge aynı haritayı kullanıyorsa en küçüğü. */
  bolge?: number;
  /** Ölünce deneyim kaybı var mı? (sunucu ZONE_INFO.ExpLost) */
  deneyimKaybi?: boolean;
  /** Command → Town noktası (x, z); yoksa başlangıç noktası. */
  sehir?: [number, number];
}

/** bolgeler.json'daki bir bölge. */
export interface BolgeBilgisi {
  /** client harita adı (donusturulmus/web/harita/<ad>/). */
  ad: string;
  bolgeAdi: string;
  /** tam = çarpışma ve kapı verisi var; gorsel = yalnız arazi ve nesneler (.smd client haritasıyla uyuşmuyor ya da yok). */
  durum: 'tam' | 'gorsel';
  uyari?: string;
  baslangic?: [number, number];
  baslangicElmorad?: [number, number];
  deneyimKaybi: boolean;
  enDusukSeviye: number;
  enYuksekSeviye: number;
}

/** Elle ayarlanmış haritalar (şehir noktası, başlangıç, müzik vb.); bolgeler.json bunların üzerine yazmaz. */
const ELLE: Record<string, HaritaAyari> = {
  // Yeni Moradon (1024 m, sunucu eşi 1098moradon_0826.smd): sunucuda Kecoon Valley (bölge 18) ve Moradon II-V bu haritayı kullanır.
  // Oyundaki Moradon (bölge 21) aşağıdaki 14th_oldmoradon'dur. Bölge 18'in müziği yok.
  // Şehir meydanı (oval alan) — kuşbakışı önizlemeye ve sunucudaki kapı olaylarına (x≈800-840, z≈526) göre.
  moradon: { baslangic: [815, 440], canavar: false, bolge: 18, deneyimKaybi: true },
  // Sunucu NPC dizilimi, başlangıç noktası (START_POSITION1098 bölge 21 = 264, 302) ve kapılar bu haritaya uyuyor.
  '14th_oldmoradon': { baslangic: [264, 302], canavar: false, bolge: 21, deneyimKaybi: true, sehir: [304, 341] }, // moradon town (ces)
  // Luferson Castle (Karus, sunucu bölgesi 1): sunucu eşi 1098karus2004.smd; kapıdan varış noktası (441, 1625).
  karus2004: { baslangic: [441, 1625], canavar: false, bolge: 1, deneyimKaybi: true, sehir: [433, 1629] }, // lufer town (ces)
  // El Morad Castle (sunucu bölgesi 2): sunucu eşi 1098elmo2004.smd; kapıdan varış noktası (1595, 412).
  elmo2004: { baslangic: [1595, 412], canavar: false, bolge: 2, deneyimKaybi: true, sehir: [1600, 412] }, // emc town (ces)
};
/** bolgeler.json yoksa da çalışan elle eşleme. */
const ELLE_BOLGE: Record<number, string> = { 21: '14th_oldmoradon', 1: 'karus2004', 2: 'elmo2004' };

export const HARITALAR: Record<string, HaritaAyari> = { ...ELLE };

/** Sunucu bölge numarası → client harita adı (bölge değişiminde ve girişte doğru harita yüklenir). Haritası olmayan bölge yoktur. */
export const BOLGE_HARITASI: Record<number, string> = { ...ELLE_BOLGE };

/** Sunucu bölge numarası → bolgeler.json bilgisi (ad, durum, uyarı…). Elle eşlenen 3 bölge için de varsa dolar. */
export const BOLGE_BILGISI: Record<number, BolgeBilgisi> = {};

export const VARSAYILAN_AYAR: HaritaAyari = { baslangic: null, canavar: true };

let yuklendi: Promise<void> | null = null;

/**
 * bolgeler.json'u okuyup BOLGE_HARITASI / HARITALAR'ı tamamlar (bir kez). Elle verilenler korunur.
 * Yeni haritalar: canavarlar sunucudan (canavar: false), deneyim kaybı bölge bilgisinden, başlangıç noktası START_POSITION'dan.
 * Dosya yoksa ya da bozuksa uyarı yazılır ve yalnız elle verilen 3 harita kalır.
 */
export function bolgeleriYukle(): Promise<void> {
  yuklendi ??= (async () => {
    try {
      const yanit = await fetch('/harita/bolgeler.json');
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
      const veri = (await yanit.json()) as Record<string, BolgeBilgisi>;
      for (const [anahtar, b] of Object.entries(veri).sort((x, y) => Number(x[0]) - Number(y[0]))) {
        const no = Number(anahtar);
        if (!Number.isInteger(no) || !b?.ad) continue;
        BOLGE_BILGISI[no] = b;
        if (!(no in BOLGE_HARITASI)) BOLGE_HARITASI[no] = b.ad;
        if (!(b.ad in HARITALAR)) { // bölge numaraları artan sırada: haritanın "ana" bölgesi en küçüğü
          HARITALAR[b.ad] = { baslangic: b.baslangic ?? null, canavar: false, bolge: no, deneyimKaybi: b.deneyimKaybi };
        }
      }
    } catch (e) {
      console.warn('bolgeler.json okunamadı; yalnız elle tanımlı haritalar kullanılacak (araclar: node harita/bolge-tara.ts)', e);
    }
  })();
  return yuklendi;
}

/** Harita adına göre ayar (büyük/küçük harf duyarsız). */
export function haritaAyari(ad: string): HaritaAyari {
  return HARITALAR[ad] ?? HARITALAR[ad.toLowerCase()] ?? VARSAYILAN_AYAR;
}
