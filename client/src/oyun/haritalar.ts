// Harita başına oyun ayarları. Gerçek değerler (başlangıç noktası, canavar yerleşimi) sunucu
// veritabanından gelecek; o zamana kadar elle verilir.
export interface HaritaAyari {
  /** Karakterin doğduğu nokta (Knight Online x, z). null = haritanın ortası. */
  baslangic: [number, number] | null;
  /** Bu haritada canavar olsun mu? (Moradon güvenli şehir.) */
  canavar: boolean;
  /** Sunucu bölge numarası (bölge müziği: Snd/<bölge>_<ad>.ogg). */
  bolge?: number;
  /** Ölünce deneyim kaybı var mı? (sunucu ZONE_INFO.ExpLost) */
  deneyimKaybi?: boolean;
  /** Command → Town noktası (x, z); yoksa başlangıç noktası. */
  sehir?: [number, number];
}

export const HARITALAR: Record<string, HaritaAyari> = {
  // Yeni Moradon (1024 m, sunucu eşi 1098moradon_0826.smd): sunucuda Kecoon Valley (bölge 18) ve Moradon II-V bu haritayı kullanır.
  // Oyundaki Moradon (bölge 21) aşağıdaki 14th_oldmoradon'dur; bu harita yalnızca ?harita=moradon ile açılır. Bölge 18'in müziği yok.
  // Şehir meydanı (oval alan) — kuşbakışı önizlemeye ve sunucudaki kapı olaylarına (x≈800-840, z≈526) göre.
  moradon: { baslangic: [815, 440], canavar: false, bolge: 18, deneyimKaybi: true },
  // Sunucu NPC dizilimi, başlangıç noktası (START_POSITION1098 bölge 21 = 264, 302) ve kapılar bu haritaya uyuyor.
  '14th_oldmoradon': { baslangic: [264, 302], canavar: false, bolge: 21, deneyimKaybi: true, sehir: [304, 341] }, // moradon town (ces)
  // Luferson Castle (Karus, sunucu bölgesi 1): sunucu eşi 1098karus2004.smd; kapıdan varış noktası (441, 1625).
  karus2004: { baslangic: [441, 1625], canavar: false, bolge: 1, deneyimKaybi: true, sehir: [433, 1629] }, // lufer town (ces)
  // El Morad Castle (sunucu bölgesi 2): sunucu eşi 1098elmo2004.smd; kapıdan varış noktası (1595, 412).
  elmo2004: { baslangic: [1595, 412], canavar: false, bolge: 2, deneyimKaybi: true, sehir: [1600, 412] }, // emc town (ces)
};

/** Sunucu bölge numarası → client harita adı (bölge değişiminde ve girişte doğru harita yüklenir). */
export const BOLGE_HARITASI: Record<number, string> = { 21: '14th_oldmoradon', 1: 'karus2004', 2: 'elmo2004' };

export const VARSAYILAN_AYAR: HaritaAyari = { baslangic: null, canavar: true };
