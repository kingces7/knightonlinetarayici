// Orijinal mesaj penceresinin (CUIMessageWnd) satır listesi + kaydırma çubuğu davranışı.
// Orijinal kuralları (OpenKO UIMessageWnd.cpp):
//  - pencerede yalnız TAM satırlar görünür (satır sayısı = bölge yüksekliği / yazı yüksekliği); yarım satır çizilmez,
//  - en çok 255 mesaj tutulur, en eskisi silinir,
//  - çubuk en alttayken yeni mesaj gelince liste kendiliğinden alta kayar; kullanıcı yukarı kaydırdıysa yerinde kalır,
//  - kaydırma çubuğu: yukarı ok, aşağı ok, kaydırma yolu ve yolda giden kutucuk (orijinal UIF parçaları).
// Pencere (UIF) ağacını bilmez; yalnız verilen HTML öğeleriyle çalışır.

const EN_COK_MESAJ = 255;

export interface ListeAyari { yaziPx: number; satirPx: number }

/** Bir mesaj kanalı (sekme): kendi kaydırılabilir alanı vardır; yalnız etkin olan görünür. */
class Kanal {
  readonly el = document.createElement('div');
  constructor(readonly ayar: ListeAyari) {
    Object.assign(this.el.style, {
      position: 'absolute', left: '0', top: '0', right: '0', overflowY: 'scroll', overflowX: 'hidden', scrollbarWidth: 'none', pointerEvents: 'auto',
      fontSize: `${ayar.yaziPx}px`, lineHeight: `${ayar.satirPx}px`, color: '#fff', textShadow: '0 1px 2px #000', overflowWrap: 'anywhere', boxSizing: 'border-box', paddingRight: '2px',
    });
    this.el.className = 'ui-gunluk';
  }
  ekle(metin: string, renk: string): void {
    const sat = document.createElement('div');
    sat.textContent = metin; sat.style.color = renk;
    const alttaydi = this.altta();
    this.el.appendChild(sat);
    while (this.el.childElementCount > EN_COK_MESAJ) this.el.firstElementChild!.remove();
    if (alttaydi) this.el.scrollTop = this.el.scrollHeight;
  }
  /** Çubuk en altta mı (yarım satır payı bırakılır). */
  altta(): boolean { return this.el.scrollHeight - this.el.scrollTop - this.el.clientHeight < this.ayar.satirPx; }
  /** Kaydırma konumu satır katlarına oturur (yarım satır görünmez). */
  oturt(): void {
    const s = this.ayar.satirPx, en = this.el.scrollHeight - this.el.clientHeight;
    const hedef = this.el.scrollTop >= en - 1 ? en : Math.round(this.el.scrollTop / s) * s;
    if (Math.abs(hedef - this.el.scrollTop) > 0.5) this.el.scrollTop = hedef;
  }
}

/** Kaydırma çubuğu parçaları: orijinalde `scroll` düğümünün çocukları (yukarı düğme, aşağı düğme, yol; yolun içinde zemin ve kutucuk). */
export interface CubukParcalari { yukari: HTMLElement; asagi: HTMLElement; yol: HTMLElement; kutucuk: HTMLElement }

/** `scroll` (tür 5) düğümünden çubuk parçalarını bulur; beklenen yapı yoksa null. */
export function cubukParcalari(scroll: HTMLElement | undefined): CubukParcalari | null {
  if (!scroll) return null;
  const c = Array.from(scroll.children) as HTMLElement[];
  const dugmeler = c.filter((e) => e.classList.contains('ui-t1'));
  const yol = c.find((e) => e.classList.contains('ui-t7'));
  if (dugmeler.length < 2 || !yol || yol.children.length < 2) return null;
  const [yukari, asagi] = dugmeler.sort((a, b) => (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0));
  return { yukari, asagi, yol, kutucuk: yol.children[1] as HTMLElement };
}

export class MesajListesi {
  private kanallar = new Map<string, Kanal>();
  private etkin: Kanal | null = null;
  private izleyici: ResizeObserver;
  private cubuk: CubukParcalari | null = null;
  private tekrar = 0;

  /** @param alan Metin alanı (UIF `Str` düğümü; içi boşaltılır). @param scroll Aynı pencerenin `scroll` düğümü (yoksa çubuksuz çalışır). */
  constructor(private alan: HTMLElement, scroll: HTMLElement | undefined, private ayar: ListeAyari) {
    alan.classList.remove('ui-yazi'); alan.replaceChildren();
    Object.assign(alan.style, { display: 'block', overflow: 'hidden', pointerEvents: 'auto' });
    this.cubuk = cubukParcalari(scroll);
    this.izleyici = new ResizeObserver(() => this.yerlestir());
    this.izleyici.observe(alan);
    if (this.cubuk) { this.izleyici.observe(this.cubuk.yol); this.cubukBagla(this.cubuk); }
  }

  /** Yeni kanal (sekme) açar; ilk açılan kanal etkin olur. */
  kanalAc(ad: string): void {
    const k = new Kanal(this.ayar);
    k.el.style.display = 'none';
    k.el.addEventListener('scroll', () => { if (k === this.etkin) this.kutucukKonumla(); });
    k.el.addEventListener('wheel', (e) => { // tekerlek: 3 satır, satır katlarına oturur
      e.preventDefault();
      k.el.scrollTop = Math.round((k.el.scrollTop + Math.sign(e.deltaY) * 3 * this.ayar.satirPx) / this.ayar.satirPx) * this.ayar.satirPx;
    }, { passive: false });
    this.alan.appendChild(k.el); this.kanallar.set(ad, k);
    if (!this.etkin) this.sec(ad);
  }

  sec(ad: string): void {
    const k = this.kanallar.get(ad); if (!k) return;
    for (const x of this.kanallar.values()) x.el.style.display = x === k ? '' : 'none';
    this.etkin = k; this.yerlestir(); k.el.scrollTop = k.el.scrollHeight; this.kutucukKonumla();
  }

  ekle(ad: string, metin: string, renk: string): void {
    const k = this.kanallar.get(ad); if (!k) return;
    k.ekle(metin, renk);
    if (k === this.etkin) { k.oturt(); this.kutucukKonumla(); }
  }

  /** Alanın yüksekliğini satır katına indirir (yarım satır görünmesin) ve çubuğu günceller. */
  private yerlestir(): void {
    const h = this.alan.clientHeight, s = this.ayar.satirPx;
    const tam = Math.max(s, Math.floor(h / s) * s);
    for (const k of this.kanallar.values()) {
      const altta = k.altta();
      k.el.style.height = `${tam}px`;
      if (altta) k.el.scrollTop = k.el.scrollHeight; else k.oturt();
    }
    this.kutucukKonumla();
  }

  // ---------------------------------------------------------------- kaydırma çubuğu
  /** Ekran pikselinden pencere pikseline oran (pencere CSS ile ölçeklenir). */
  private oran(): number { const y = this.cubuk!.yol; return y.offsetHeight > 0 ? y.getBoundingClientRect().height / y.offsetHeight : 1; }

  /** Kutucuğu kaydırma konumuna göre yolda yerleştirir; kaydırılacak bir şey yoksa kutucuk üstte durur. */
  private kutucukKonumla(): void {
    const c = this.cubuk, k = this.etkin; if (!c || !k) return;
    const en = k.el.scrollHeight - k.el.clientHeight, bos = c.yol.offsetHeight - c.kutucuk.offsetHeight;
    c.kutucuk.style.top = `${en > 0 && bos > 0 ? (k.el.scrollTop / en) * bos : 0}px`;
  }

  private satirKaydir(n: number): void {
    const k = this.etkin; if (!k) return;
    k.el.scrollTop = Math.round((k.el.scrollTop + n * this.ayar.satirPx) / this.ayar.satirPx) * this.ayar.satirPx;
  }
  private sayfaKaydir(yon: number): void { const k = this.etkin; if (k) this.satirKaydir(yon * Math.max(1, Math.floor(k.el.clientHeight / this.ayar.satirPx) - 1)); }

  private cubukBagla(c: CubukParcalari): void {
    // Ok düğmeleri: tek tık bir satır, basılı tutunca sürekli kayar.
    const tekrarli = (dugme: HTMLElement, yon: number) => {
      const durdur = () => { clearTimeout(this.tekrar); clearInterval(this.tekrar); };
      dugme.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        durdur(); this.satirKaydir(yon);
        this.tekrar = window.setTimeout(() => { this.tekrar = window.setInterval(() => this.satirKaydir(yon), 55); }, 350);
        addEventListener('pointerup', durdur, { once: true });
      });
      dugme.addEventListener('pointerleave', durdur);
    };
    tekrarli(c.yukari, -1); tekrarli(c.asagi, 1);
    c.kutucuk.style.pointerEvents = 'auto'; c.kutucuk.style.cursor = 'pointer';
    // Kutucuğu sürükleme: fare konumu doğrudan kaydırma konumuna çevrilir.
    c.kutucuk.addEventListener('pointerdown', (e) => {
      const k = this.etkin; if (!k || e.button !== 0) return;
      e.preventDefault(); e.stopPropagation(); c.kutucuk.setPointerCapture(e.pointerId);
      const y0 = e.clientY, s0 = k.el.scrollTop;
      const tasi = (m: PointerEvent) => {
        const en = k.el.scrollHeight - k.el.clientHeight, bos = (c.yol.offsetHeight - c.kutucuk.offsetHeight) * this.oran();
        if (en <= 0 || bos <= 0) return;
        k.el.scrollTop = s0 + ((m.clientY - y0) / bos) * en;
      };
      const bitir = () => { c.kutucuk.removeEventListener('pointermove', tasi); c.kutucuk.removeEventListener('pointerup', bitir); k.oturt(); this.kutucukKonumla(); };
      c.kutucuk.addEventListener('pointermove', tasi); c.kutucuk.addEventListener('pointerup', bitir);
    });
    // Yola tıklama: kutucuğun üstüne/altına tıklanınca bir sayfa kayar.
    c.yol.style.pointerEvents = 'auto';
    c.yol.addEventListener('pointerdown', (e) => {
      if (e.target === c.kutucuk || e.button !== 0) return;
      e.stopPropagation();
      const kr = c.kutucuk.getBoundingClientRect();
      this.sayfaKaydir(e.clientY < kr.top ? -1 : 1);
    });
  }
}
