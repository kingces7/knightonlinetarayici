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

export class UiPencere {
  readonly el = document.createElement('div');
  readonly ad: string;
  readonly boyut: [number, number];
  private idler = new Map<string, HTMLElement[]>();
  private ilerlemeler = new Map<string, HTMLElement>();
  private dugmeler = new Map<string, { el: HTMLElement; durumlar: Map<number, HTMLElement>; pasif: boolean }>();
  private veri: PencereVeri;
  private alanlar: HTMLElement[] = [];
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
    if (n.t === 3) { this.ilerlemeKur(el, n, kendi); ustEl.appendChild(el); return; }
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
    el.style.fontSize = `${Math.round(y.b * 1.3)}px`;
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
      } else this.kur(c, el, kendi);
    }
    const kayit = { el, durumlar, pasif: false };
    if (n.id) this.dugmeler.set(n.id, kayit);
    const goster = (no: number) => {
      const secili = durumlar.get(kayit.pasif ? 3 : no) ?? durumlar.get(0);
      for (const d of durumlar.values()) d.style.display = d === secili ? '' : 'none';
    };
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
      if ((c.r ?? 0) === 1 && n.id) { this.ilerlemeler.set(n.id, kap); kap.style.width = `${w}px`; }
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
    const kap = this.ilerlemeler.get(id); if (!kap) return;
    const toplam = this.bul(id)[0]?.clientWidth ?? 0;
    kap.style.width = `${Math.max(0, Math.min(1, oran)) * toplam}px`;
  }
  dugmePasif(id: string, pasif: boolean): void {
    const d = this.dugmeler.get(id); if (!d) return;
    d.pasif = pasif; d.el.style.cursor = pasif ? 'default' : 'pointer';
    const secili = d.durumlar.get(pasif ? 3 : 0) ?? d.durumlar.get(0);
    for (const x of d.durumlar.values()) x.style.display = x === secili ? '' : 'none';
  }
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
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < yerel[0] || x > yerel[2] || y < yerel[1] || y > yerel[3]) return;
      const dx = x, dy = y;
      const tasi = (ev: PointerEvent) => {
        this.el.style.left = `${Math.max(0, Math.min(innerWidth - 40, ev.clientX - dx))}px`;
        this.el.style.top = `${Math.max(0, Math.min(innerHeight - 30, ev.clientY - dy))}px`;
      };
      const bitir = () => { removeEventListener('pointermove', tasi); removeEventListener('pointerup', bitir); };
      addEventListener('pointermove', tasi); addEventListener('pointerup', bitir);
    });
  }
}
