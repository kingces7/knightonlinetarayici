// Klasik Knight Online yükleme ekranı: oyunun kendi `ka_loading_us` / `el_loading_us` penceresi (sanat + sürüm yazısı + ilerleme çubuğu), siyah tam ekran zeminde ortada.
// Harita yüklenirken ve haritalar arası geçişte gösterilir. Ulus (Karus/El Morad) son girişten hatırlanır; ilk açılışta Karus.
import { UiPencere } from './orijinal';

const ULUS_ANAHTARI = 'ke.ulus';
export const ulusKaydet = (ulus: number): void => { try { localStorage.setItem(ULUS_ANAHTARI, String(ulus)); } catch { /* depolama kapalı */ } };

export class YuklemeEkrani {
  private katman = document.createElement('div');
  private pencere: UiPencere | null = null;
  private bekleyen: { oran: number; metin: string } | null = null;
  private kapali = false;
  private yenidenBoyutla = () => this.yerlestir();

  constructor(ust: HTMLElement = document.body) {
    Object.assign(this.katman.style, { position: 'fixed', inset: '0', background: '#000', zIndex: '10000', overflow: 'hidden' });
    ust.appendChild(this.katman);
    addEventListener('resize', this.yenidenBoyutla);
    let ulus = 1; try { ulus = Number(localStorage.getItem(ULUS_ANAHTARI) ?? 1); } catch { /* varsayılan */ }
    void UiPencere.yukle(ulus === 2 ? 'el_loading_us' : 'ka_loading_us').then((p) => {
      if (this.kapali) return;
      this.pencere = p; p.el.style.display = '';
      p.metin('Text_Version', 'KnightEmpire');
      this.katman.appendChild(p.el); this.yerlestir();
      if (this.bekleyen) this.ilerle(this.bekleyen.oran, this.bekleyen.metin);
    }).catch(() => { /* pencere yoksa düz siyah zemin kalır */ });
  }

  private yerlestir(): void {
    const p = this.pencere; if (!p) return;
    const ol = Math.max(0.3, innerHeight / 768);
    p.olcekAyarla(ol);
    p.el.style.left = `${Math.round((innerWidth - 556 * ol) / 2)}px`; p.el.style.top = '0px';
  }

  /** İlerleme (0–1) ve altındaki bilgi yazısı. */
  ilerle(oran: number, metin: string): void {
    this.bekleyen = { oran, metin };
    const p = this.pencere; if (!p) return;
    p.ilerleme('Progress_Loading', Math.max(0, Math.min(1, oran)));
    p.metin('Text_Info', metin);
  }

  kapat(): void {
    this.kapali = true; removeEventListener('resize', this.yenidenBoyutla);
    this.katman.style.transition = 'opacity .35s'; this.katman.style.opacity = '0';
    setTimeout(() => this.katman.remove(), 400);
  }
}
