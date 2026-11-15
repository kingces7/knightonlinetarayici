// Köşelerinden büyütülüp küçültülebilen, üst kenarından taşınabilen ve sağ alttaki toptan kilitlenebilen orijinal pencere (sohbet, bilgi).
// Büyütme: pencerenin parçaları iki "bölme çizgisi" (xBolme, yBolme) etrafında kayar/uzar; çizginin ötesindekiler kayar, çizgiyi kesenler uzar.
// Böylece zemin resimleri, yazı alanı, kaydırma çubuğu ve alt sekme şeridi bozulmadan genişler.
import type { UiPencere } from './orijinal';

interface Orijinal { l: number; t: number; w: number; h: number; bs?: [number, number]; bp?: [number, number] }
interface Kayit { x: number; y: number; dw: number; dh: number; kilit: boolean }

export interface SerbestAyar {
  /** localStorage anahtarı (pencere başına). */
  anahtar: string;
  /** Yatay/dikey bölme çizgisi (pencerenin kendi, ölçeksiz koordinatı). */
  xBolme: number; yBolme: number;
  /** En çok büyüme (ölçeksiz piksel). */
  enCokDw: number; enCokDh: number;
  /** Top (kilit) simgesi: doku adı (/arayuz/doku/<ad>.png), doku boyutu ve UV [u0,v0,u1,v1]. */
  /** Kilit topunu sol alta koy (varsayılan sağ alt). */
  topSol?: boolean;
  top: { doku: string; w: number; h: number; uv: [number, number, number, number] };
}

const num = (s: string): number => parseFloat(s) || 0;

export class SerbestPencere {
  private orijinal = new Map<HTMLElement, Orijinal>();
  private k: Kayit = { x: NaN, y: NaN, dw: 0, dh: 0, kilit: false };
  private top!: HTMLElement;
  private ol = 1;
  private kok: HTMLElement;
  private w0: number; private h0: number;
  /** Kayıtlı konum var mı (varsa varsayılan yerleşim uygulanmaz). */
  get konumluMu(): boolean { return !Number.isNaN(this.k.x); }
  get kilitli(): boolean { return this.k.kilit; }

  constructor(private p: UiPencere, private ayar: SerbestAyar, private ekranaSigdir: () => void) {
    this.kok = p.el; this.w0 = p.boyut[0]; this.h0 = p.boyut[1];
    try { const s = JSON.parse(localStorage.getItem(ayar.anahtar) ?? 'null'); if (s && typeof s === 'object') this.k = { ...this.k, ...s }; } catch { /* kayıt yok */ }
    this.topuKur(); this.tutamaclariKur();
    for (const e of this.kok.querySelectorAll<HTMLElement>('.ui-dugum')) this.kaydet(e);
    if (this.k.dw || this.k.dh) this.boyutla(this.k.dw, this.k.dh);
    this.kilitGoster();
  }

  private kaydet(e: HTMLElement): void {
    const o: Orijinal = { l: num(e.style.left), t: num(e.style.top), w: num(e.style.width), h: num(e.style.height) };
    const bs = /^(-?[\d.]+)px (-?[\d.]+)px$/.exec(e.style.backgroundSize), bp = /^(-?[\d.]+)px (-?[\d.]+)px$/.exec(e.style.backgroundPosition);
    if (bs && bp) { o.bs = [Number(bs[1]), Number(bs[2])]; o.bp = [Number(bp[1]), Number(bp[2])]; }
    this.orijinal.set(e, o);
  }

  /** Pencereyi (dw, dh) kadar büyütür: parçaları yeniden yerleştirir. */
  private boyutla(dw: number, dh: number): void {
    const { xBolme: sx, yBolme: sy } = this.ayar;
    const mapX = (a: number, b: number): [number, number] => (a >= sx ? [a + dw, b + dw] : b > sx ? [a, b + dw] : [a, b]);
    const mapY = (a: number, b: number): [number, number] => (a >= sy ? [a + dh, b + dh] : b > sy ? [a, b + dh] : [a, b]);
    const gez = (el: HTMLElement, oAbsX: number, oAbsY: number, nAbsX: number, nAbsY: number) => {
      for (const c of Array.from(el.children) as HTMLElement[]) {
        const o = this.orijinal.get(c); if (!o) continue;
        const ax = oAbsX + o.l, ay = oAbsY + o.t;
        const [x0, x1] = mapX(ax, ax + o.w), [y0, y1] = mapY(ay, ay + o.h);
        c.style.left = `${x0 - nAbsX}px`; c.style.top = `${y0 - nAbsY}px`;
        c.style.width = `${x1 - x0}px`; c.style.height = `${y1 - y0}px`;
        if (o.bs && o.bp && o.w > 0 && o.h > 0) {
          const fx = (x1 - x0) / o.w, fy = (y1 - y0) / o.h;
          c.style.backgroundSize = `${o.bs[0] * fx}px ${o.bs[1] * fy}px`; c.style.backgroundPosition = `${o.bp[0] * fx}px ${o.bp[1] * fy}px`;
        }
        gez(c, ax, ay, x0, y0);
      }
    };
    gez(this.kok, 0, 0, 0, 0);
    this.kok.style.width = `${this.w0 + dw}px`; this.kok.style.height = `${this.h0 + dh}px`;
    this.k.dw = dw; this.k.dh = dh;
  }

  private kaydetDisk(): void { try { localStorage.setItem(this.ayar.anahtar, JSON.stringify(this.k)); } catch { /* depolama kapalı */ } }

  /** Dışarıdan ölçek bildirilir (pencere ölçeği değişince tutamaç hesapları için). */
  olcek(o: number): void { this.ol = o; }
  /** Kayıtlı konumu uygular; kayıt yoksa false. */
  konumuUygula(): boolean {
    if (!this.konumluMu) return false;
    const w = (this.w0 + this.k.dw) * this.ol, h = (this.h0 + this.k.dh) * this.ol;
    this.kok.style.left = `${Math.max(0, Math.min(innerWidth - w, this.k.x))}px`; this.kok.style.top = `${Math.max(0, Math.min(innerHeight - h, this.k.y))}px`;
    return true;
  }

  private topuKur(): void {
    const t = this.ayar.top, u = t.uv;
    const sw = (u[2] - u[0]) * t.w, sh = (u[3] - u[1]) * t.h;
    this.top = document.createElement('div');
    Object.assign(this.top.style, {
      position: 'absolute', [this.ayar.topSol ? 'left' : 'right']: '1px', bottom: '1px', width: `${sw}px`, height: `${sh}px`, zIndex: '9', cursor: 'pointer',
      backgroundImage: `url(/arayuz/doku/${t.doku}.png)`, backgroundSize: `${t.w}px ${t.h}px`, backgroundPosition: `${-u[0] * t.w}px ${-u[1] * t.h}px`, backgroundRepeat: 'no-repeat', pointerEvents: 'auto',
    });
    this.top.addEventListener('click', () => { this.k.kilit = !this.k.kilit; this.kilitGoster(); this.kaydetDisk(); });
    this.kok.appendChild(this.top);
  }
  private kilitGoster(): void {
    this.top.style.opacity = this.k.kilit ? '1' : '0.6';
    this.top.style.filter = this.k.kilit ? 'drop-shadow(0 0 3px #ffd76b)' : '';
    this.top.title = this.k.kilit ? 'Locked: this window cannot be moved or resized (click to unlock)' : 'Unlocked: drag the top edge to move, the corners to resize (click to lock)';
    for (const t of this.tutamaclar) t.style.display = this.k.kilit ? 'none' : '';
  }

  private tutamaclar: HTMLElement[] = [];
  private tutamaclariKur(): void {
    const mk = (stil: Partial<CSSStyleDeclaration>, imlec: string, surukle: (dx: number, dy: number, bas: { l: number; t: number; dw: number; dh: number }) => void) => {
      const e = document.createElement('div');
      Object.assign(e.style, { position: 'absolute', zIndex: '8', cursor: imlec, pointerEvents: 'auto', touchAction: 'none', ...stil });
      e.addEventListener('pointerdown', (ev) => {
        if (this.k.kilit || ev.button !== 0) return;
        ev.preventDefault(); e.setPointerCapture(ev.pointerId);
        const bas = { l: num(this.kok.style.left), t: num(this.kok.style.top), dw: this.k.dw, dh: this.k.dh }, x0 = ev.clientX, y0 = ev.clientY;
        const tasi = (m: PointerEvent) => { surukle(m.clientX - x0, m.clientY - y0, bas); };
        const bitir = () => { e.removeEventListener('pointermove', tasi); e.removeEventListener('pointerup', bitir); this.k.x = num(this.kok.style.left); this.k.y = num(this.kok.style.top); this.ekranaSigdir(); this.kaydetDisk(); };
        e.addEventListener('pointermove', tasi); e.addEventListener('pointerup', bitir);
      });
      this.kok.appendChild(e); this.tutamaclar.push(e);
    };
    const T = 14;
    const buyut = (sol: boolean, ust: boolean) => (dx: number, dy: number, b: { l: number; t: number; dw: number; dh: number }) => {
      const dw = Math.max(0, Math.min(this.ayar.enCokDw, b.dw + (sol ? -dx : dx) / this.ol));
      const dh = Math.max(0, Math.min(this.ayar.enCokDh, b.dh + (ust ? -dy : dy) / this.ol));
      this.boyutla(dw, dh);
      if (sol) this.kok.style.left = `${b.l - (dw - b.dw) * this.ol}px`;
      if (ust) this.kok.style.top = `${b.t - (dh - b.dh) * this.ol}px`;
    };
    mk({ left: '0', top: '0', width: `${T}px`, height: `${T}px` }, 'nwse-resize', buyut(true, true));
    mk({ right: '0', top: '0', width: `${T}px`, height: `${T}px` }, 'nesw-resize', buyut(false, true));
    mk({ left: '0', bottom: this.ayar.topSol ? '22px' : '0', width: `${T}px`, height: `${T}px` }, 'nesw-resize', buyut(true, false));
    mk({ right: '0', bottom: this.ayar.topSol ? '0' : '22px', width: `${T}px`, height: `${T}px` }, 'nwse-resize', buyut(false, false)); // sağ alt köşede top var: tutamaç biraz yukarıda
    // Üst kenar: taşıma
    mk({ left: `${T}px`, right: `${T}px`, top: '0', height: '9px' }, 'move', (dx, dy, b) => {
      const w = (this.w0 + this.k.dw) * this.ol, h = (this.h0 + this.k.dh) * this.ol;
      this.kok.style.left = `${Math.max(0, Math.min(innerWidth - w, b.l + dx))}px`; this.kok.style.top = `${Math.max(0, Math.min(innerHeight - h, b.t + dy))}px`;
    });
  }
}
