// Karakter seçim ekranı (ID/şifre + sunucu seçiminden sonra): tam ekran 3B taht odası (GirisSahnesi), kenarlarda vinyet, sağ ortada koyu panel
// (bilgi kutusu + Start / Create / Back / Exit), altta ortada iki ok (karakter değiştirme), üstte ortada "Tam ekran için tıkla" ve sağ üstte tam ekran simgesi.
// Yerleşim ces'in referans fotoğrafından ölçülmüştür; 16:9'luk 1280×720 bir sahne ekrana orantılı sığdırılır (kenarlar siyah).
import { GirisSahnesi } from './girisSahnesi';

const W = 1280, H = 720;
export type SecimDugmesi = 'start' | 'create' | 'back' | 'exit' | 'left' | 'right';

const TAS = 'linear-gradient(#6d7076, #3b3e44 55%, #2b2d32)';
function tasDugme(yazi: string, sol: number, ust: number, w: number, h: number, ek: Partial<CSSStyleDeclaration> = {}): HTMLDivElement {
  const d = document.createElement('div'); d.textContent = yazi;
  Object.assign(d.style, {
    position: 'absolute', left: `${sol}px`, top: `${ust}px`, width: `${w}px`, height: `${h}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: TAS, border: '1px solid #b9bcc2', borderRadius: '2px', boxShadow: 'inset 0 0 0 1px #15161a, 0 1px 3px #000c', color: '#f2f2f2', font: '600 12px Verdana, Arial, sans-serif', textShadow: '0 1px 2px #000',
    cursor: 'pointer', userSelect: 'none', ...ek,
  } as Partial<CSSStyleDeclaration>);
  d.addEventListener('pointerenter', () => { d.style.filter = 'brightness(1.25)'; }); d.addEventListener('pointerleave', () => { d.style.filter = ''; d.style.transform = ''; });
  d.addEventListener('pointerdown', () => { d.style.transform = 'translateY(1px)'; }); d.addEventListener('pointerup', () => { d.style.transform = ''; });
  return d;
}

export class SecimEkrani {
  readonly el = document.createElement('div');
  private sahne = document.createElement('div');
  private bilgiKutusu = document.createElement('div');
  private durumYazisi = document.createElement('div');
  private oklar: HTMLElement[] = [];
  private gs: GirisSahnesi | null = null;
  private ulus: 'ka' | 'el' = 'ka';
  private yenidenBoyutla = () => this.yerlestir();
  readonly tikla: Record<SecimDugmesi, () => void> = { start: () => undefined, create: () => undefined, back: () => undefined, exit: () => undefined, left: () => undefined, right: () => undefined };

  constructor(ust: HTMLElement) {
    Object.assign(this.el.style, { position: 'absolute', inset: '0', background: '#000', overflow: 'hidden', display: 'none' });
    Object.assign(this.sahne.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, transformOrigin: '0 0', overflow: 'hidden', background: '#000' });
    // vinyet: kenarlar karanlık, merkez loş
    const vinyet = document.createElement('div');
    Object.assign(vinyet.style, { position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 38%, rgba(0,0,0,.55) 72%, rgba(0,0,0,.92) 100%), linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 70%, rgba(0,0,0,.85))', zIndex: '2' });
    // sağ panel (koyu): bilgi kutusu + 4 düğme
    const panel = document.createElement('div');
    Object.assign(panel.style, { position: 'absolute', left: '1166px', top: '283px', width: '113px', height: '152px', background: '#050506', border: '1px solid #d8d8d8', boxSizing: 'border-box', zIndex: '3' });
    Object.assign(this.bilgiKutusu.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '57px', padding: '5px 6px', boxSizing: 'border-box', color: '#e9e2c8', font: '11px/1.35 Verdana, Arial, sans-serif', textShadow: '0 1px 2px #000', overflow: 'hidden', pointerEvents: 'none' });
    panel.appendChild(this.bilgiKutusu);
    const dugmeler: [string, SecimDugmesi][] = [['Start', 'start'], ['Create', 'create'], ['Back', 'back'], ['Exit', 'exit']];
    dugmeler.forEach(([y, k], i) => { const d = tasDugme(y, 4, 58 + i * 23.3, 103, 19); d.addEventListener('click', () => this.tikla[k]()); panel.appendChild(d); });
    // oklar (altta ortada)
    for (const [yon, sol] of [['left', 585], ['right', 647]] as const) {
      const d = tasDugme(yon === 'left' ? '◀' : '▶', sol, 676, 48, 24, { font: '16px Arial', color: '#111', textShadow: 'none' });
      d.addEventListener('click', () => this.tikla[yon]()); this.oklar.push(d); this.sahne.appendChild(d); d.style.zIndex = '3';
    }
    Object.assign(this.durumYazisi.style, { position: 'absolute', left: '0', top: '640px', width: '100%', textAlign: 'center', color: '#ffe46b', font: 'bold 13px Verdana, Arial, sans-serif', textShadow: '0 1px 3px #000, 0 0 6px #000', zIndex: '3', pointerEvents: 'none' });
    // üstte ortada tam ekran düğmesi + sağ üstte tam ekran simgesi (Fullscreen API)
    const tam = document.createElement('div'); tam.textContent = '⛶ Tam ekran için tıkla';
    Object.assign(tam.style, { position: 'absolute', left: '540px', top: '6px', width: '200px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #8f6128', borderRadius: '8px', background: 'rgba(10,8,6,.8)', color: '#ffe9a8', font: '600 11px Verdana, Arial, sans-serif', cursor: 'pointer', zIndex: '3' });
    tam.addEventListener('click', () => this.tamEkranDegistir());
    this.sahne.append(vinyet, panel, this.durumYazisi, tam);
    const simge = document.createElement('div'); simge.textContent = '⛶'; simge.title = 'Fullscreen';
    Object.assign(simge.style, { position: 'absolute', right: '8px', top: '8px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #555', borderRadius: '4px', background: 'rgba(0,0,0,.6)', color: '#ddd', font: '16px Arial', cursor: 'pointer', zIndex: '4' });
    simge.addEventListener('click', () => this.tamEkranDegistir());
    this.el.append(this.sahne, simge); ust.appendChild(this.el);
  }

  private tamEkranDegistir(): void {
    try { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); } catch { /* tarayıcı izin vermedi */ }
  }

  private yerlestir(): void {
    const o = Math.min(innerWidth / W, innerHeight / H);
    this.sahne.style.scale = String(o);
    this.sahne.style.left = `${(innerWidth - W * o) / 2}px`; this.sahne.style.top = `${(innerHeight - H * o) / 2}px`;
    this.gs?.boyutla(W, H);
  }

  /** Ekranı gösterir; `ulus` taht odasını seçer (ka = Karus, el = El Morad). */
  goster(ulus: 'ka' | 'el'): void {
    this.el.style.display = ''; addEventListener('resize', this.yenidenBoyutla);
    if (!this.gs || this.ulus !== ulus) {
      this.gs?.kapat(); this.ulus = ulus;
      const gs = this.gs = new GirisSahnesi('ka'); // El Morad odası (giris/el.glb) çevrildi ama kamera/yerleşimi henüz ayarlanmadı: şimdilik her ulus için Karus taht odası
      Object.assign(gs.tuval.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, zIndex: '1' });
      this.sahne.insertBefore(gs.tuval, this.sahne.firstChild);
      void gs.yukle().then(() => { gs.boyutla(W, H); gs.baslat(); });
    }
    this.yerlestir();
  }
  gizle(): void { this.el.style.display = 'none'; removeEventListener('resize', this.yenidenBoyutla); }
  kapat(): void { this.gizle(); this.gs?.kapat(); this.gs = null; this.el.remove(); }

  bilgi(ad: string, seviye: number | string, sinif: string): void {
    this.bilgiKutusu.replaceChildren();
    if (!ad) return;
    for (const m of [ad, `Level: ${seviye}`, sinif]) { const d = document.createElement('div'); d.textContent = m; this.bilgiKutusu.appendChild(d); }
  }
  durum(m: string): void { this.durumYazisi.textContent = m; }
  oklariGoster(_g: boolean): void { /* oklar referanstaki gibi her zaman görünür */ for (const o of this.oklar) o.style.display = ''; }
  karakterGoster(modelNo: number): Promise<void> { return this.gs?.karakterGoster(modelNo) ?? Promise.resolve(); }
  yuruBaslat(): Promise<void> { return this.gs?.yuruBaslat() ?? Promise.resolve(); }
}
