// Yama notları paneli (N tuşu): oyunun pencere diline uygun koyu kahve zemin, altın çerçeve, açık sarı yazı.
// Veri koda gömülü değildir: client/src/veri/yama-notlari.json ([{ tarih, baslik, maddeler[] }]); yalnız bu dosya güncellenir.
import notlar from '../veri/yama-notlari.json';

interface YamaNotu { tarih: string; baslik: string; maddeler: string[] }

export class YamaNotlari {
  private kutu: HTMLDivElement;
  get acik(): boolean { return this.kutu.style.display !== 'none'; }

  constructor(ust: HTMLElement) {
    const k = this.kutu = document.createElement('div');
    Object.assign(k.style, {
      position: 'fixed', display: 'none', zIndex: '9', width: '460px', maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100vh - 120px)', boxSizing: 'border-box', pointerEvents: 'auto',
      background: 'linear-gradient(#1f1810, #120e0a)', border: '2px solid #8f6128', borderRadius: '4px', boxShadow: '0 4px 22px rgba(0,0,0,.75), inset 0 0 0 1px #000',
      font: "13px Verdana, 'Segoe UI', sans-serif", color: '#f4ecd2', userSelect: 'none',
    } as Partial<CSSStyleDeclaration>);
    k.style.left = '50%'; k.style.top = '50%'; k.style.transform = 'translate(-50%, -50%)';
    for (const ad of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'contextmenu', 'wheel']) k.addEventListener(ad, (e) => e.stopPropagation()); // oyun alanına geçmesin
    const baslik = document.createElement('div');
    Object.assign(baslik.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #8f6128', background: '#2a2014', color: '#ffe9a8', fontWeight: '700', fontSize: '15px' });
    baslik.textContent = 'Patch Notes';
    const x = document.createElement('div'); x.textContent = '×'; x.title = 'Close';
    Object.assign(x.style, { cursor: 'pointer', fontSize: '20px', lineHeight: '16px', padding: '0 4px', color: '#ffe9a8' });
    x.addEventListener('click', () => this.kapat()); baslik.appendChild(x);
    const gov = document.createElement('div');
    Object.assign(gov.style, { padding: '10px 14px 12px', overflowY: 'auto', maxHeight: 'calc(100vh - 190px)' });
    for (const n of notlar as YamaNotu[]) {
      const b = document.createElement('div'); b.textContent = `${n.tarih}  ·  ${n.baslik}`;
      Object.assign(b.style, { color: '#ffe9a8', fontWeight: '700', margin: '4px 0 6px', paddingBottom: '3px', borderBottom: '1px solid #4a3a1c' }); gov.appendChild(b);
      for (const m of n.maddeler) { const d = document.createElement('div'); d.textContent = `• ${m}`; Object.assign(d.style, { margin: '3px 0 3px 6px', lineHeight: '1.4', textIndent: '-10px', paddingLeft: '10px' }); gov.appendChild(d); }
    }
    k.append(baslik, gov); ust.appendChild(k);
  }
  degistir(): void { this.kutu.style.display = this.acik ? 'none' : ''; }
  kapat(): void { this.kutu.style.display = 'none'; }
}
