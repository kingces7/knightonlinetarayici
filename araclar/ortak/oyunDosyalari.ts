// "Oyun dosya sistemi": bir dosyayı oyun klasöründen ya da paket arşivlerinin içinden bulur.
// Oyunun kendisi gibi davranır: yollar büyük/küçük harf duyarsızdır, "\" veya "/" kullanılabilir.
import fs from 'node:fs';
import path from 'node:path';
import { OYUN_DIZINI } from './yollar.ts';
import { PaketArsivi, anahtar } from '../paket/paket.ts';

/** Path.Ini'deki paketli klasörler. */
export const PAKETLI_KLASORLER = ['Object', 'Item', 'fx', 'UI'];

export class OyunDosyalari {
  private gevsek = new Map<string, string>(); // anahtar -> gerçek yol
  private arsivler = new Map<string, PaketArsivi>(); // klasör (küçük harf) -> arşiv
  readonly kok: string;

  constructor(kok: string = OYUN_DIZINI) {
    this.kok = kok;
    const gez = (d: string) => {
      for (const g of fs.readdirSync(d, { withFileTypes: true })) {
        const tam = path.join(d, g.name);
        if (g.isDirectory()) gez(tam);
        else this.gevsek.set(anahtar(path.relative(kok, tam)), tam);
      }
    };
    gez(kok);
    for (const k of PAKETLI_KLASORLER) {
      const hdr = this.gevsek.get(anahtar(`${k}\\${k}.hdr`));
      const src = this.gevsek.get(anahtar(`${k}\\${k}.src`));
      if (hdr && src) this.arsivler.set(k.toLowerCase(), new PaketArsivi(hdr, src));
    }
  }

  private arsivVeAd(yol: string): [PaketArsivi, string] | null {
    const a = anahtar(yol).replace(/^\\+/, '');
    const i = a.indexOf('\\');
    if (i < 0) return null;
    const arsiv = this.arsivler.get(a.slice(0, i));
    return arsiv ? [arsiv, a.slice(i + 1)] : null;
  }

  var(yol: string): boolean {
    if (this.gevsek.has(anahtar(yol))) return true;
    const aa = this.arsivVeAd(yol);
    return !!aa && aa[0].var(aa[1]);
  }

  oku(yol: string): Buffer {
    const g = this.gevsek.get(anahtar(yol));
    if (g) return fs.readFileSync(g);
    const aa = this.arsivVeAd(yol);
    if (aa && aa[0].var(aa[1])) return aa[0].oku(aa[1]);
    throw new Error(`Oyun dosyası bulunamadı: ${yol}`);
  }

  /** Verilen uzantıdaki bütün dosyaların göreli yolları (gevşek + arşiv içi). */
  listele(uzanti: string): string[] {
    const u = uzanti.toLowerCase();
    const sonuc = new Set<string>();
    for (const [a] of this.gevsek) if (a.endsWith(u)) sonuc.add(a);
    for (const [klasor, arsiv] of this.arsivler) {
      for (const g of arsiv.girdiler) if (g.ad.toLowerCase().endsWith(u)) sonuc.add(`${klasor}\\${anahtar(g.ad)}`);
    }
    return [...sonuc].sort();
  }

  kapat(): void { for (const a of this.arsivler.values()) a.kapat(); }
}
