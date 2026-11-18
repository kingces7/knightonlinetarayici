// Tarayıcının ortak türleri: bulgu, geçen kontrol, atlanan kontrol.
export type Onem = 'KRITIK' | 'YUKSEK' | 'ORTA' | 'DUSUK' | 'BILGI';

export interface KontrolTanimi {
  kod: string;
  kategori: string;
  baslik: string;
  onem: Onem;
  aciklama: string;
  oneri: string;
}

export interface Bulgu extends KontrolTanimi {
  sayi: number;
  kontrolEdilen: number;
  ornekler: string[];
}

export interface GecenKontrol { kod: string; kategori: string; baslik: string; kontrolEdilen: number }
export interface AtlananKontrol { kod: string; baslik: string; neden: string }

/** Kontrol sonuçlarını toplar. Sıfır bulgu "geçti" olarak kaydedilir; atlananlar nedenleriyle birlikte raporlanır. */
export class Toplayici {
  bulgular: Bulgu[] = [];
  gecenler: GecenKontrol[] = [];
  atlananlar: AtlananKontrol[] = [];

  kaydet(k: KontrolTanimi, sayi: number, kontrolEdilen: number, ornekler: string[] = []): void {
    if (sayi > 0) this.bulgular.push({ ...k, sayi, kontrolEdilen, ornekler: ornekler.slice(0, 10) });
    else this.gecenler.push({ kod: k.kod, kategori: k.kategori, baslik: k.baslik, kontrolEdilen });
  }

  atla(kod: string, baslik: string, neden: string): void {
    this.atlananlar.push({ kod, baslik, neden });
  }
}

export const ONEM_SIRASI: Onem[] = ['KRITIK', 'YUKSEK', 'ORTA', 'DUSUK', 'BILGI'];
