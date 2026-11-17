// NPC seçenek penceresi (Inn Hostess, Sundries…): koyu yarı saydam panel, ince altın çerçeve, iri beyaz konuşma yazısı,
// altında çerçevesiz sarı seçenekler (üzerine gelince parlar, kullanılamayan seçenek gri). Referans: oyunun kendi ekran görüntüleri.
export interface DuzSecenek { yazi: string; sec: () => void; pasif?: boolean }

export class DuzDiyalog {
  private kutu: HTMLDivElement;
  private acikMi = false;
  constructor(ust: HTMLElement, private olcek: () => number, private kapandi: () => void) {
    const k = this.kutu = document.createElement('div');
    Object.assign(k.style, {
      position: 'fixed', display: 'none', zIndex: '8', boxSizing: 'border-box', width: '613px', minHeight: '180px', padding: '12px 14px 18px',
      background: 'rgba(14,12,10,0.74)', border: '3px solid #c9a24a', borderRadius: '5px', boxShadow: '0 0 0 1px #3a2c10 inset, 0 4px 18px rgba(0,0,0,.65)',
      fontFamily: 'Verdana, Arial, sans-serif', userSelect: 'none', transformOrigin: 'top center',
    } as Partial<CSSStyleDeclaration>);
    k.addEventListener('mousedown', (e) => e.stopPropagation()); // oyun alanına tıklama sayılmasın
    ust.appendChild(k);
  }
  get acik(): boolean { return this.acikMi; }

  goster(konusma: string, secenekler: DuzSecenek[]): void {
    const k = this.kutu; k.replaceChildren();
    const m = document.createElement('div');
    Object.assign(m.style, { color: '#ffffff', fontSize: '24px', fontWeight: '700', lineHeight: '1.3', textShadow: '1px 2px 2px #000, 0 0 4px #000', whiteSpace: 'pre-wrap', margin: '4px 4px 26px' } as Partial<CSSStyleDeclaration>);
    m.textContent = konusma; k.appendChild(m);
    for (const s of secenekler) {
      const b = document.createElement('div'); b.textContent = s.yazi;
      Object.assign(b.style, { color: s.pasif ? '#8c8c8c' : '#ffe600', fontSize: '21px', fontWeight: '600', padding: '7px 8px 7px 20px', textShadow: '1px 1px 2px #000', cursor: s.pasif ? 'default' : 'pointer' } as Partial<CSSStyleDeclaration>);
      if (!s.pasif) {
        b.addEventListener('mouseenter', () => { b.style.color = '#fff7a8'; b.style.background = 'rgba(255,230,0,.12)'; });
        b.addEventListener('mouseleave', () => { b.style.color = '#ffe600'; b.style.background = ''; });
        b.addEventListener('click', () => s.sec());
      }
      k.appendChild(b);
    }
    const ol = Math.max(0.45, Math.min(1, this.olcek() * 1.1, (innerWidth - 16) / 613));
    k.style.transform = `scale(${ol})`; k.style.display = '';
    k.style.left = `${Math.round(innerWidth / 2 - (613 * ol) / 2)}px`; k.style.top = `${Math.round(Math.max(8, innerHeight * 0.12))}px`;
    this.acikMi = true;
  }
  /** Kapanır; `bildir` doğruysa dışarıya haber verilir (Esc/uzaklaşma). */
  kapat(bildir = true): void { if (!this.acikMi) return; this.acikMi = false; this.kutu.style.display = 'none'; if (bildir) this.kapandi(); }
}
