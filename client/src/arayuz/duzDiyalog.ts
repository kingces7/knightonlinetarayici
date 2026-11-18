// NPC seçenek penceresi (mağaza tüccarları, Inn Hostess, ışınlanma kapıları…): koyu yarı saydam gövde, oyunun kendi UI dokusundan (ui_quest.png) süslü üst/alt çerçeve,
// altın başlık (NPC adı), iri beyaz konuşma yazısı, çerçevesiz sarı seçenekler (üzerine gelince parlar, kullanılamayan seçenek gri). Ekranın ortasında durur.
export interface DuzSecenek { yazi: string; sec: () => void; pasif?: boolean }

const GENISLIK = 613, UST_Y = 72, ALT_Y0 = 254, ALT_Y1 = 310; // ui_quest.png: üst çerçeve 0–72, alt çerçeve 254–310 (363 px genişlik)

export class DuzDiyalog {
  private kutu: HTMLDivElement;
  private acikMi = false;
  private atlas: HTMLImageElement | null = null;
  private ustResim = ''; private altResim = '';
  constructor(ust: HTMLElement, private olcek: () => number, private kapandi: () => void) {
    const k = this.kutu = document.createElement('div');
    Object.assign(k.style, {
      position: 'fixed', display: 'none', zIndex: '8', boxSizing: 'border-box', width: `${GENISLIK}px`, minHeight: '180px',
      background: 'rgba(14,12,10,0.8)', boxShadow: '0 4px 22px rgba(0,0,0,.7)',
      fontFamily: 'Verdana, Arial, sans-serif', userSelect: 'none', pointerEvents: 'auto', transformOrigin: 'top left', // arayüz katmanı pointer-events:none olabilir: pencere kendi tıklamalarını almalı
    } as Partial<CSSStyleDeclaration>);
    for (const ad of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'contextmenu']) k.addEventListener(ad, (e) => e.stopPropagation()); // oyun alanına tıklama (yürüme, seçim) geçmesin
    ust.appendChild(k);
    const im = new Image(); im.onload = () => { this.atlas = im; this.ustResim = this.parca(0, UST_Y); this.altResim = this.parca(ALT_Y0, ALT_Y1 - ALT_Y0); if (this.acikMi) this.cercevele(); }; im.src = '/arayuz/doku/ui_quest.png';
  }
  get acik(): boolean { return this.acikMi; }

  /** Atlas'tan bir çerçeve şeridi keser: iki yan süs aynen, ortası dar bir sütunun uzatılmasıyla doldurulur (süsler gerilmesin). */
  private parca(y0: number, yuk: number): string {
    const im = this.atlas!, c = document.createElement('canvas'); c.width = GENISLIK; c.height = yuk;
    const g = c.getContext('2d')!, yan = 181;
    g.drawImage(im, 0, y0, yan, yuk, 0, 0, yan, yuk);
    g.drawImage(im, 363 - yan, y0, yan, yuk, GENISLIK - yan, 0, yan, yuk);
    g.drawImage(im, yan - 1, y0, 2, yuk, yan, 0, GENISLIK - 2 * yan, yuk);
    return c.toDataURL('image/png');
  }
  private ustSerit: HTMLDivElement | null = null; private altSerit: HTMLDivElement | null = null;
  private cercevele(): void {
    if (this.ustSerit) this.ustSerit.style.backgroundImage = `url(${this.ustResim})`;
    if (this.altSerit) this.altSerit.style.backgroundImage = `url(${this.altResim})`;
  }

  goster(konusma: string, secenekler: DuzSecenek[], baslik = ''): void {
    const k = this.kutu; k.replaceChildren();
    const ust = this.ustSerit = document.createElement('div');
    Object.assign(ust.style, { height: `${UST_Y}px`, backgroundSize: '100% 100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3d98b', fontSize: '22px', fontWeight: '700', textShadow: '1px 2px 3px #000', letterSpacing: '0.5px', paddingTop: '4px' } as Partial<CSSStyleDeclaration>);
    ust.textContent = baslik; k.appendChild(ust);
    const gov = document.createElement('div'); Object.assign(gov.style, { padding: '10px 26px 8px', borderLeft: '3px solid #8a6a2a', borderRight: '3px solid #8a6a2a' } as Partial<CSSStyleDeclaration>);
    const m = document.createElement('div');
    Object.assign(m.style, { color: '#ffffff', fontSize: '24px', fontWeight: '700', lineHeight: '1.3', textShadow: '1px 2px 2px #000, 0 0 4px #000', whiteSpace: 'pre-wrap', margin: '2px 4px 20px' } as Partial<CSSStyleDeclaration>);
    m.textContent = konusma; gov.appendChild(m);
    for (const s of secenekler) {
      const b = document.createElement('div'); b.textContent = s.yazi;
      Object.assign(b.style, { color: s.pasif ? '#8c8c8c' : '#ffe600', fontSize: '21px', fontWeight: '600', padding: '7px 8px 7px 20px', textShadow: '1px 1px 2px #000', cursor: s.pasif ? 'default' : 'pointer' } as Partial<CSSStyleDeclaration>);
      if (!s.pasif) {
        b.addEventListener('mouseenter', () => { b.style.color = '#fff7a8'; b.style.background = 'rgba(255,230,0,.12)'; });
        b.addEventListener('mouseleave', () => { b.style.color = '#ffe600'; b.style.background = ''; });
        b.addEventListener('click', () => s.sec());
      }
      gov.appendChild(b);
    }
    k.appendChild(gov);
    const alt = this.altSerit = document.createElement('div');
    Object.assign(alt.style, { height: `${ALT_Y1 - ALT_Y0}px`, backgroundSize: '100% 100%' } as Partial<CSSStyleDeclaration>); k.appendChild(alt);
    if (this.atlas) this.cercevele();
    k.style.display = ''; this.acikMi = true;
    // Ekranın ortasına: ölçek pencere ve ekrana sığacak biçimde, konum ölçülen gerçek yükseklikten
    const ol = Math.max(0.45, Math.min(1, this.olcek() * 1.1, (innerWidth - 16) / GENISLIK, (innerHeight - 16) / Math.max(1, k.offsetHeight)));
    k.style.transform = `scale(${ol})`;
    k.style.left = `${Math.round((innerWidth - GENISLIK * ol) / 2)}px`; k.style.top = `${Math.round(Math.max(8, (innerHeight - k.offsetHeight * ol) / 2))}px`;
  }
  /** Kapanır; `bildir` doğruysa dışarıya haber verilir (Esc/uzaklaşma). */
  kapat(bildir = true): void { if (!this.acikMi) return; this.acikMi = false; this.kutu.style.display = 'none'; if (bildir) this.kapandi(); }
}
