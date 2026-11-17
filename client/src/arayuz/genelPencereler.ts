// Genel pencere yöneticisi: oyunun orijinal arayüz pencerelerinden (re_*.json, araclar/arayuz "hepsi") herhangi birini açar.
// Her pencere: sürüklenir, tıklayınca öne gelir, kapatma düğmesi (btn_close/cancel/exit…) çalışır, Esc en üsttekini kapatır,
// ekrana sığmıyorsa küçültülür. Pencereye özel davranış (veri bağlama) `davranis` tablosuna eklenir; olmayanlar orijinal görünümüyle açılır.
import { UiPencere, arayuzOlcegi } from './orijinal';

/** Kapatma düğmesi kimlikleri (büyük/küçük harf duyarsız). */
const KAPAT = /^(btn_?)?(close|cancel|exit|x|no|ok)\d*$|close/i;

/** Sekme düğmeleri (karakter/görev/dost/klan/unvan çerçevesi): düğme kimliği → açılacak pencere. */
const SEKME: Record<string, string> = { btn_friends: 're_el_page_friend', btn_clan: 're_el_clan_window', btn_title: 're_title_window', btn_quest: 're_el_page_quest' };

/** Envanter gibi sağ kenardan kayarak açılan pencereler. */
const SAGDAN = new Set(['re_el_cmdlist']);

export interface GenelBaglam {
  kok: HTMLElement;
  /** Alt çubuğun (görev çubuğu) kapladığı yükseklik: pencereler bunun altına inmez. */
  altBos: () => number;
  mesaj: (m: string) => void;
  /** Pencere açılmadan hemen önce çağrılır (ör. sağdaki pencereler birbirini kapatsın). */
  acilirken?: (ad: string) => void;
}

/** Pencereye özel bağlama: açılırken bir kez çağrılır (düğme tıklamaları, gizlenecek parçalar, metinler). */
export type Davranis = (p: UiPencere, kapat: () => void) => void;

export class GenelPencereler {
  private acikPencereler = new Map<string, UiPencere>();
  private onbellek = new Map<string, Promise<UiPencere | null>>();
  private z = 2000;
  private sayac = 0;
  readonly davranis = new Map<string, Davranis>();
  /** Pencere HER açıldığında çalışır (ilk kuruluşta değil): seçimleri/içeriği sıfırlamak için. */
  readonly acilista = new Map<string, (p: UiPencere) => void>();

  constructor(private b: GenelBaglam) {}

  /** Yüklenmiş pencere (açık olmasa da). */
  pencere(ad: string): UiPencere | undefined { return this.acikPencereler.get(ad); }
  /** Pencere açık mı? */
  acik(ad: string): boolean { return this.acikPencereler.has(ad); }
  /** Açık pencere sayısı (Esc davranışı için). */
  get sayi(): number { return this.acikPencereler.size; }

  private async yukle(ad: string): Promise<UiPencere | null> {
    let o = this.onbellek.get(ad);
    if (!o) {
      o = UiPencere.yukle(ad).then((p) => this.kur(p)).catch((e) => { console.warn(`Pencere açılamadı: ${ad}`, e); return null; });
      this.onbellek.set(ad, o);
    }
    return o;
  }

  private kur(p: UiPencere): UiPencere {
    p.el.style.display = 'none';
    if (SAGDAN.has(p.ad)) { p.el.classList.add('kayan', 'kapali'); p.el.style.setProperty('--kay', '150px'); }
    p.surukle();
    p.el.addEventListener('pointerdown', () => { p.el.style.zIndex = String(++this.z); });
    // Kapatma düğmeleri: kimliğinden tanınır
    const kapat = () => this.kapat(p.ad);
    for (const el of p.tumDugmeler()) { const id = el.dataset.id ?? ''; if (KAPAT.test(id) && !p.tikla.has(id)) p.tikla.set(id, kapat); }
    for (const el of p.tumDugmeler()) { const id = el.dataset.id ?? ''; const hedef = SEKME[id]; if (hedef && hedef !== p.ad && !p.tikla.has(id)) p.tikla.set(id, () => { void this.ac(hedef).then((tamam) => { if (tamam) { const o = this.acikPencereler.get(hedef)!; o.el.style.left = p.el.style.left; o.el.style.top = p.el.style.top; kapat(); } }); }); }
    this.davranis.get(p.ad)?.(p, kapat);
    this.b.kok.appendChild(p.el);
    return p;
  }

  /** Pencereyi açar (açıksa öne getirir). Yüklenemezse false. */
  async ac(ad: string): Promise<boolean> {
    const p = await this.yukle(ad); if (!p) return false;
    if (!this.acikPencereler.has(ad)) {
      this.b.acilirken?.(ad);
      this.acikPencereler.set(ad, p);
      this.acilista.get(ad)?.(p);
      const bos = this.b.altBos();
      const [sl, st, sr, sb] = p.sinir();
      const ol = Math.max(0.35, Math.min(arayuzOlcegi(), (innerWidth - 16) / (sr - sl), (innerHeight - bos - 8) / (sb - st)));
      p.olcekAyarla(ol);
      const [l2, t2, r2, b2] = p.sinir();
      const gw = (r2 - l2) * ol, gh = (b2 - t2) * ol, kay = (this.sayac++ % 6) * 26;
      if (SAGDAN.has(ad)) { // envanter gibi: sağ kenara yaslı, sağdan kayarak gelir
        p.el.style.left = `${innerWidth - r2 * ol}px`; // görünen resim sağ kenara tam oturur
        p.el.style.top = `${Math.max(-t2 * ol, Math.min(innerHeight - bos - b2 * ol, 70))}px`;
        p.el.style.display = ''; void p.el.offsetWidth;
        p.el.classList.remove('kapali');
      } else {
        p.el.style.left = `${Math.max(-l2 * ol, Math.min(innerWidth - r2 * ol, (innerWidth - gw) / 2 - l2 * ol + kay - 60))}px`;
        p.el.style.top = `${Math.max(-t2 * ol, Math.min(innerHeight - bos - b2 * ol, (innerHeight - bos - gh) / 2 - t2 * ol + kay - 60))}px`;
        p.el.style.display = '';
      }
    }
    p.el.style.zIndex = String(++this.z);
    return true;
  }

  kapat(ad: string): void {
    const p = this.acikPencereler.get(ad); if (!p) return;
    this.acikPencereler.delete(ad);
    if (SAGDAN.has(ad)) { p.el.classList.add('kapali'); setTimeout(() => { if (!this.acikPencereler.has(ad)) p.el.style.display = 'none'; }, 300); }
    else p.el.style.display = 'none';
  }

  async degistir(ad: string): Promise<void> { if (this.acik(ad)) this.kapat(ad); else await this.ac(ad); }

  /** Esc: en üstteki genel pencereyi kapatır; kapattıysa true. */
  enUsttekiniKapat(): boolean {
    let son: UiPencere | null = null;
    for (const p of this.acikPencereler.values()) if (!son || Number(p.el.style.zIndex) > Number(son.el.style.zIndex)) son = p;
    if (!son) return false;
    this.kapat(son.ad); return true;
  }
}
