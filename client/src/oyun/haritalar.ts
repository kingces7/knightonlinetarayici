// Harita başına oyun ayarları. Gerçek değerler (başlangıç noktası, canavar yerleşimi) sunucu
// veritabanından gelecek; o zamana kadar elle verilir.
export interface HaritaAyari {
  /** Karakterin doğduğu nokta (Knight Online x, z). null = haritanın ortası. */
  baslangic: [number, number] | null;
  /** Bu haritada canavar olsun mu? (Moradon güvenli şehir.) */
  canavar: boolean;
  /** Sunucu bölge numarası (bölge müziği: Snd/<bölge>_<ad>.ogg). */
  bolge?: number;
}

export const HARITALAR: Record<string, HaritaAyari> = {
  // Şehir meydanı (oval alan) — kuşbakışı önizlemeye ve sunucudaki kapı olaylarına (x≈800-840, z≈526) göre.
  moradon: { baslangic: [815, 440], canavar: false, bolge: 21 },
  // Sunucu NPC dizilimi, başlangıç noktası (START_POSITION1098 bölge 21 = 264, 302) ve kapılar bu haritaya uyuyor.
  '14th_oldmoradon': { baslangic: [264, 302], canavar: false, bolge: 21 },
};

export const VARSAYILAN_AYAR: HaritaAyari = { baslangic: null, canavar: true };
