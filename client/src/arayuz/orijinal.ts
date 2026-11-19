// Oyunun orijinal arayüzü (UIF pencereleri). araclar/arayuz ile dışa aktarılan JSON ağacını HTML'e çevirir.
// Koordinatlar pencerenin sol üst köşesine göredir; her düğüm kendi üstüne göre konumlanır.
// Düğüm türleri: 0 base, 1 button, 2 static, 3 progress, 4 image, 6 string, 9 area (yuva)

export type Kutu = [number, number, number, number];
export interface Sade {
  t: number; id?: string; st?: number; tp?: string; k: Kutu; m?: Kutu; r?: number;
  d?: string; uv?: Kutu;
  y?: { b: number; c: number; f: number; s: string; font: string };
  tk?: Kutu; c?: Sade[];
}
interface PencereVeri { ad: string; dokular: Record<string, { w: number; h: number }>; kok: Sade }

const STIL = { sagaYasla: 0x400000, ortala: 0x800000, dikeyOrtala: 0x4000000, altaYasla: 0x2000000, tekSatir: 0x100000 };
const dokuUrl = (d: string) => `/arayuz/doku/${encodeURIComponent(d.replace(/\.dxt$/i, '.png'))}`;

function renk(c: number): string {
  const a = (c >>> 24) & 255, r = (c >>> 16) & 255, g = (c >>> 8) & 255, b = c & 255;
  return `rgba(${r},${g},${b},${a === 0 ? 1 : (a / 255).toFixed(3)})`;
}

/**
 * Arayüzün (pencereler, çubuklar) ekran büyüklüğüne göre ölçeği.
 * Formül: ölçek = sınırla( min(genişlik / 1280, yükseklik / 640) × ARAYUZ_CARPANI , 1 , 2,2 ). 2560×1270'te tam ölçek 1,98'dir; çarpan 0,6566 ile 1,30 olur.
 * Deneme için adrese `?ui=1.7` yazılırsa çarpan yerine bu ölçek aynen kullanılır.
 */
export const ARAYUZ_CARPANI = 0.6566;
export function arayuzOlcegi(): number {
  const u = Number(new URLSearchParams(location.search).get('ui'));
  if (u >= 0.5 && u <= 4) return u;
  return Math.max(1, Math.min(2.2, Math.min(innerWidth / 1280, innerHeight / 640) * ARAYUZ_CARPANI));
}

export class UiPencere {
  readonly el = document.createElement('div');
  readonly ad: string;
  readonly boyut: [number, number];
  private idler = new Map<string, HTMLElement[]>();
  private ilerlemeler = new Map<string, HTMLElement[]>();
  private dugmeler = new Map<string, { el: HTMLElement; durumlar: Map<number, HTMLElement>; pasif: boolean; basili: boolean; goster: (no: number) => void }>();
  private veri: PencereVeri;
  private alanlar: HTMLElement[] = [];
  /** Pencere ölçeği (küçük ekranlarda sığdırmak için; CSS `scale`, sol üst köşeden). */
  olcek = 1;
  private sinirOnbellek: [number, number, number, number] | null = null;
  /**
   * Pencerenin GÖRÜNEN resim alanı (pencere kutusuna göre, ölçeksiz piksel): [sol, üst, sağ, alt]. Pencere kutusu çoğu zaman saydam boşluk içerir
   * (ör. envanterin solunda/sağında); ekrana yaslarken bu boşluk hesaba katılır.
   */
  sinirTemizle(): void { this.sinirOnbellek = null; this.sinirPiksel = false; }
  private sinirPiksel = false;
  /** Sınırı piksel düzeyinde (saydam kenarlar atılarak) bir kez hesaplar; `sinirTemizle()`'e kadar geçerlidir. */
  async sinirKesinlestir(): Promise<void> {
    if (this.sinirPiksel) return;
    this.sinirPiksel = true;
    if (!(await this.sinirKesinles())) this.sinirPiksel = false;
  }
  /**
   * Pencerenin sol-üst konumunu (x, y) ekranın içinde tutar: GÖRÜNEN resim dört kenara da tam oturabilir (0,0 dâhil), dışına taşamaz.
   * Pencere kutusundaki saydam boşluklar sayılmaz (sinir()). Görünen resim ekrandan büyükse sol/üst kenara hizalanır.
   */
  ekranIcinde(x: number, y: number): [number, number] {
    const [l, t, r, b] = this.sinir(), o = this.olcek || 1;
    const enSol = -l * o, enUst = -t * o;
    return [Math.max(enSol, Math.min(Math.max(enSol, innerWidth - r * o), x)), Math.max(enUst, Math.min(Math.max(enUst, innerHeight - b * o), y))];
  }
  /**
   * `sinir()`'in piksel düzeyinde hâli: her resmin SAYDAM olmayan piksellerinin sınırı bulunur (resim dosyalarının kendi saydam kenar boşlukları da atılır).
   * Resimler yüklendikten sonra çağrılır; önbelleği günceller. Başarılıysa true.
   */
  async sinirKesinles(): Promise<boolean> {
    const onceki = { d: this.el.style.display, v: this.el.style.visibility };
    this.el.style.display = ''; this.el.style.visibility = 'hidden';
    const ol = this.olcek || 1, r0 = this.el.getBoundingClientRect();
    const ogeler: { e: HTMLElement; l: number; t: number; w: number; h: number }[] = [];
    for (const e of this.el.querySelectorAll<HTMLElement>('*')) {
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.backgroundImage === 'none') continue;
      const k = e.getBoundingClientRect(); if (k.width < 2 || k.height < 2) continue;
      ogeler.push({ e, l: (k.left - r0.left) / ol, t: (k.top - r0.top) / ol, w: k.width / ol, h: k.height / ol });
    }
    this.el.style.display = onceki.d; this.el.style.visibility = onceki.v;
    let a = 1e9, b = 1e9, c = 0, d = 0;
    const resimler = new Map<string, HTMLImageElement>();
    for (const g of ogeler) {
      const m = /url("?([^")]+)"?)/.exec(g.e.style.backgroundImage || getComputedStyle(g.e).backgroundImage); if (!m) continue;
      let img = resimler.get(m[1]);
      if (!img) { img = new Image(); img.src = m[1]; try { await img.decode(); } catch { continue; } resimler.set(m[1], img); }
      const bs = /^(-?[d.]+)px (-?[d.]+)px$/.exec(g.e.style.backgroundSize), bp = /^(-?[d.]+)px (-?[d.]+)px$/.exec(g.e.style.backgroundPosition);
      const W = Math.max(1, Math.ceil(g.w)), H = Math.max(1, Math.ceil(g.h));
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d', { willReadFrequently: true })!;
      if (bs && bp) cx.drawImage(img, Number(bp[1]), Number(bp[2]), Number(bs[1]), Number(bs[2])); else cx.drawImage(img, 0, 0, W, H);
      const px = cx.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) continue;
      a = Math.min(a, g.l + x0); b = Math.min(b, g.t + y0); c = Math.max(c, g.l + x1 + 1); d = Math.max(d, g.t + y1 + 1);
    }
    if (!(c > a)) return false;
    this.sinirOnbellek = [Math.max(0, a), b, c, d];
    return true;
  }
  sinir(): [number, number, number, number] {
    if (this.sinirOnbellek) return this.sinirOnbellek;
    const onceki = { d: this.el.style.display, v: this.el.style.visibility };
    this.el.style.display = ''; this.el.style.visibility = 'hidden';
    const r = this.el.getBoundingClientRect(), ol = this.olcek || 1;
    let a = 1e9, b = 1e9, c = 0, d = 0;
    for (const e of this.el.querySelectorAll<HTMLElement>('*')) {
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.backgroundImage === 'none') continue;
      const k = e.getBoundingClientRect(); if (k.width < 2 || k.height < 2) continue;
      a = Math.min(a, k.left - r.left); b = Math.min(b, k.top - r.top); c = Math.max(c, k.right - r.left); d = Math.max(d, k.bottom - r.top);
    }
    this.el.style.display = onceki.d; this.el.style.visibility = onceki.v;
    const s: [number, number, number, number] = c > a ? [Math.max(0, a / ol), Math.min(0, 0) + b / ol, c / ol, d / ol] : [0, 0, this.boyut[0], this.boyut[1]];
    if (r.width > 0) this.sinirOnbellek = s;
    return s;
  }
  olcekAyarla(o: number): void { this.olcek = o; this.el.style.transformOrigin = '0 0'; this.el.style.setProperty('scale', String(o)); }
  /** Pencere dosyasındaki kök düğüm kutusu (çocukların koordinat başlangıcı; ör. sol kenar -3 olabilir). */
  get kokKutu(): Kutu { return this.veri.kok.k; }
  /** Düğme tıklamaları: id → işlev. */
  readonly tikla = new Map<string, () => void>();

  private constructor(veri: PencereVeri) {
    this.veri = veri; this.ad = veri.ad;
    const k = veri.kok.k;
    this.boyut = [k[2] - k[0], k[3] - k[1]];
    this.el.className = 'ui-pencere';
    this.el.style.width = `${this.boyut[0]}px`; this.el.style.height = `${this.boyut[1]}px`;
    this.cocuklariKur(veri.kok, this.el, [k[0], k[1]]);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation()); // pencereye tıklayınca oyun tıklaması tetiklenmesin
  }

  static async yukle(ad: string, klasor = '/arayuz'): Promise<UiPencere> {
    const veri = (await (await fetch(`${klasor}/${ad}.json`)).json()) as PencereVeri;
    return new UiPencere(veri);
  }

  // ---------------------------------------------------------------- kurulum
  private kaydet(id: string | undefined, el: HTMLElement): void {
    if (!id) return;
    el.dataset.id = id;
    (this.idler.get(id) ?? this.idler.set(id, []).get(id)!).push(el);
  }

  private konumla(el: HTMLElement, n: Sade, ust: [number, number]): void {
    el.style.left = `${n.k[0] - ust[0]}px`; el.style.top = `${n.k[1] - ust[1]}px`;
    el.style.width = `${Math.max(0, n.k[2] - n.k[0])}px`; el.style.height = `${Math.max(0, n.k[3] - n.k[1])}px`;
  }

  private cocuklariKur(n: Sade, ustEl: HTMLElement, ust: [number, number]): void {
    for (const c of n.c ?? []) this.kur(c, ustEl, ust);
  }

  private kur(n: Sade, ustEl: HTMLElement, ust: [number, number]): void {
    const el = document.createElement('div');
    el.className = `ui-dugum ui-t${n.t}`;
    this.konumla(el, n, ust);
    const kendi: [number, number] = [n.k[0], n.k[1]];
    if (n.t === 4) this.resimCiz(el, n);
    if (n.t === 6) this.yaziCiz(el, n);
    if (n.tp) el.title = n.tp;
    if (n.t === 9) this.alanlar.push(el);
    this.kaydet(n.id, el);
    if (n.t === 1) { this.dugmeKur(el, n, kendi); ustEl.appendChild(el); return; }
    if (n.t === 3 || n.t === 17) { this.ilerlemeKur(el, n, kendi); ustEl.appendChild(el); return; } // 17: kademeli ilerleme çubuğu (hedef çerçevesi)
    ustEl.appendChild(el);
    this.cocuklariKur(n, el, kendi);
  }

  /** Doku parçası (UV dikdörtgeni) hedef kutuya oturacak şekilde arka plan olarak çizilir. */
  private resimCiz(el: HTMLElement, n: Sade): void {
    if (!n.d || !n.uv) return;
    const b = this.veri.dokular[n.d]; if (!b) return;
    const w = n.k[2] - n.k[0], h = n.k[3] - n.k[1];
    const u0 = Math.min(n.uv[0], n.uv[2]), u1 = Math.max(n.uv[0], n.uv[2]), v0 = Math.min(n.uv[1], n.uv[3]), v1 = Math.max(n.uv[1], n.uv[3]);
    const sw = (u1 - u0) * b.w, sh = (v1 - v0) * b.h;
    if (sw < 0.5 || sh < 0.5 || w <= 0 || h <= 0) { el.style.display = 'none'; return; }
    el.style.backgroundImage = `url("${dokuUrl(n.d)}")`;
    el.style.backgroundSize = `${(b.w * w) / sw}px ${(b.h * h) / sh}px`;
    el.style.backgroundPosition = `${-(u0 * b.w * w) / sw}px ${-(v0 * b.h * h) / sh}px`;
    const fx = n.uv[2] < n.uv[0] ? -1 : 1, fy = n.uv[3] < n.uv[1] ? -1 : 1;
    if (fx < 0 || fy < 0) el.style.transform = `scale(${fx},${fy})`;
  }

  private yaziCiz(el: HTMLElement, n: Sade): void {
    const y = n.y!, st = n.st ?? 0;
    el.classList.add('ui-yazi');
    el.style.fontSize = `${(y.b * 1.15).toFixed(1)}px`; // pencere 1:1 çizilir; Verdana/Arial ile bu boyut orijinal kutulara sığar
    if (/^[A-Za-z ]+$/.test(y.font)) el.style.fontFamily = `'${y.font}', 'Segoe UI', Tahoma, sans-serif`; // pencerenin kendi yazı tipi (Verdana/Arial)
    el.style.color = renk(y.c);
    el.style.fontWeight = y.f & 1 ? 'bold' : 'normal';
    if (y.f & 2) el.style.fontStyle = 'italic';
    el.style.textAlign = st & STIL.ortala ? 'center' : st & STIL.sagaYasla ? 'right' : 'left';
    const dikey = st & STIL.dikeyOrtala ? 'center' : st & STIL.altaYasla ? 'flex-end' : 'flex-start';
    el.style.display = 'flex'; el.style.alignItems = dikey;
    el.style.justifyContent = st & STIL.ortala ? 'center' : st & STIL.sagaYasla ? 'flex-end' : 'flex-start';
    el.style.whiteSpace = st & STIL.tekSatir ? 'nowrap' : 'pre-wrap';
    const ic = document.createElement('span'); ic.textContent = y.s; el.appendChild(ic);
  }

  private dugmeKur(el: HTMLElement, n: Sade, kendi: [number, number]): void {
    const durumlar = new Map<number, HTMLElement>();
    for (const c of n.c ?? []) {
      if (c.t === 4) {
        const d = document.createElement('div'); d.className = 'ui-dugum ui-t4 ui-durum';
        this.konumla(d, c, kendi); this.resimCiz(d, c); d.style.display = 'none';
        el.appendChild(d); durumlar.set(c.r ?? 0, d);
        for (const cc of c.c ?? []) this.kur(cc, d, [c.k[0], c.k[1]]);
      }
    }
    // Yazı vb. diğer çocuklar durum resimlerinin ÜSTÜNE çizilir (orijinal motor yazıyı resimden sonra çizer; dosyada yazı resimden önce gelse de).
    for (const c of n.c ?? []) if (c.t !== 4) this.kur(c, el, kendi);
    const kayit = { el, durumlar, pasif: false, basili: false, goster: (_no: number) => { /* aşağıda atanır */ } };
    if (n.id) this.dugmeler.set(n.id, kayit);
    const goster = (no: number) => {
      const secili = durumlar.get(kayit.pasif ? 3 : kayit.basili ? 1 : no) ?? durumlar.get(0);
      for (const d of durumlar.values()) d.style.display = d === secili ? '' : 'none';
    };
    kayit.goster = goster;
    goster(0);
    el.addEventListener('pointerenter', () => goster(2));
    el.addEventListener('pointerleave', () => goster(0));
    el.addEventListener('pointerdown', () => goster(1));
    el.addEventListener('pointerup', () => goster(2));
    el.addEventListener('click', () => { if (!kayit.pasif && n.id) this.tikla.get(n.id)?.(); });
    el.style.cursor = 'pointer';
  }

  private ilerlemeKur(el: HTMLElement, n: Sade, kendi: [number, number]): void {
    const w = n.k[2] - n.k[0];
    for (const c of n.c ?? []) {
      if (c.t !== 4) continue;
      const kap = document.createElement('div'); kap.className = 'ui-ilerleme';
      this.konumla(kap, c, kendi);
      const ic = document.createElement('div'); ic.className = 'ui-dugum ui-t4';
      ic.style.left = '0'; ic.style.top = '0'; ic.style.width = `${c.k[2] - c.k[0]}px`; ic.style.height = `${c.k[3] - c.k[1]}px`;
      this.resimCiz(ic, c); kap.appendChild(ic); el.appendChild(kap);
      if (n.t === 17) { // kademeli hedef çubuğu: üç katman aynı resmi kullanır; r0 boş zemin (koyu), r2 geriden gelen (açık iz), r1 gerçek can (ön)
        kap.style.zIndex = c.r === 1 ? '3' : c.r === 2 ? '2' : '1';
        ic.style.filter = c.r === 1 ? '' : c.r === 2 ? 'grayscale(1) brightness(1.7)' : 'brightness(0.2) saturate(0.7)';
      }
      // r1 = dolu kısım (kademeli çubukta r2 = geriden gelen katman); aynı kimlikte birden çok çubuk olabilir
      if (((c.r ?? 0) === 1 || (n.t === 17 && c.r === 2)) && n.id) { const anahtar = n.t === 17 && c.r === 2 ? `${n.id}:geri` : n.id; (this.ilerlemeler.get(anahtar) ?? this.ilerlemeler.set(anahtar, []).get(anahtar)!).push(kap); kap.style.width = `${w}px`; kap.dataset.tam = String(w); }
    }
  }

  // ---------------------------------------------------------------- veri bağlama
  /** Kimliği `id` olan tüm düğümler (aynı kimlik birden çok yerde olabilir). */
  bul(id: string): HTMLElement[] { return this.idler.get(id) ?? []; }
  metin(id: string, deger: string | number): void {
    for (const el of this.bul(id)) { const s = el.querySelector('span'); if (s && s.textContent !== String(deger)) s.textContent = String(deger); }
  }
  goster(id: string, acik = true): void { for (const el of this.bul(id)) el.style.display = acik ? '' : 'none'; }
  gizle(id: string): void { this.goster(id, false); }
  /** Kimliği düzenli ifadeyle eşleşen düğümleri gizler/gösterir. */
  gizleDesen(desen: RegExp, gizli = true): void { for (const [id, l] of this.idler) if (desen.test(id)) for (const el of l) el.style.display = gizli ? 'none' : ''; }
  ilerleme(id: string, oran: number): void {
    for (const kap of this.ilerlemeler.get(id) ?? []) kap.style.width = `${Math.max(0, Math.min(1, oran)) * Number(kap.dataset.tam ?? 0)}px`;
  }
  dugmePasif(id: string, pasif: boolean): void {
    const d = this.dugmeler.get(id); if (!d) return;
    d.pasif = pasif; d.el.style.cursor = pasif ? 'default' : 'pointer';
    const secili = d.durumlar.get(pasif ? 3 : 0) ?? d.durumlar.get(0);
    for (const x of d.durumlar.values()) x.style.display = x === secili ? '' : 'none';
  }
  /** Sekme düğmesi: seçiliyken orijinalin "basılı" resmi (durum 1) kalıcı gösterilir. */
  dugmeBasili(id: string, basili: boolean): void { const d = this.dugmeler.get(id); if (d) { d.basili = basili; d.goster(0); } }
  /** Pencerenin bütün düğme (tür 1) düğümleri. */
  tumDugmeler(): HTMLElement[] { return [...this.dugmeler.values()].map((d) => d.el); }
  /** Tüm yuvalar (area düğümleri), belge sırasıyla. */
  tumAlanlar(): HTMLElement[] { return this.alanlar; }
  /** Metni düzenli ifade ya da tam metinle eşleşen yazı düğümlerini gizler (kimliği olmayanlar için). */
  gizleMetin(metin: string): void {
    for (const el of this.el.querySelectorAll<HTMLElement>('.ui-yazi')) if (el.textContent?.trim() === metin) el.style.display = 'none';
  }
  /** Çok parçalı yuva/alan: içeriği değiştirmek için kapsayıcıyı döndürür. */
  alan(id: string, sira = 0): HTMLElement | undefined { return this.bul(id)[sira]; }

  // ---------------------------------------------------------------- pencere davranışı
  /** Sürüklenebilir yapar: kök düğümün `m` (taşınabilir bölge) alanı, yoksa üstteki 24 piksel. */
  surukle(): void {
    const k = this.veri.kok;
    const bolge: Kutu = k.m ?? [k.k[0], k.k[1], k.k[2], k.k[1] + 24];
    const yerel: Kutu = [bolge[0] - k.k[0], bolge[1] - k.k[1], bolge[2] - k.k[0], bolge[3] - k.k[1]];
    this.el.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.ui-t1, .ui-t9')) return;
      const r = this.el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top; // ekran pikseli
      const lx = x / this.olcek, ly = y / this.olcek; // pencerenin kendi (ölçeksiz) koordinatı
      if (lx < yerel[0] || lx > yerel[2] || ly < yerel[1] || ly > yerel[3]) return;
      const dx = x, dy = y;
      void this.sinirKesinlestir(); // sürükleme başlarken görünen sınır piksel düzeyinde bulunur (dört kenara tam oturması için)
      const tasi = (ev: PointerEvent) => {
        const [nx, ny] = this.ekranIcinde(ev.clientX - dx, ev.clientY - dy);
        this.el.style.left = `${nx}px`; this.el.style.top = `${ny}px`;
      };
      const bitir = () => { removeEventListener('pointermove', tasi); removeEventListener('pointerup', bitir); };
      addEventListener('pointermove', tasi); addEventListener('pointerup', bitir);
    });
  }
}
