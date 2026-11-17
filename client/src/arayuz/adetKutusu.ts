// Ortak "kaç tane?" kutusu (mağaza alımı, mağaza satışı, banka yatırma/çekme): oyunun kendi doku parçalarıyla çizilir; Enter onaylar, Esc iptal eder.
import { sprite, UV_DUGME, UV_KUTU } from './magazaPenceresi';

export interface AdetKutusuSecenek {
  /** Eşya adı (başlık). */ ad: string;
  /** Soru metni (ör. "How many do you want to buy?"). */ soru: string;
  /** Seçilebilecek en çok adet (en az 1). */ maks: number;
  /** Onay düğmesinin yazısı (Buy / Sell / Deposit / Withdraw). */ onayYazisi: string;
  /** Birim fiyat: toplam satırı gösterilir; 0 ise toplam satırı gizlenir. */ birimFiyat: number;
  onay: (adet: number) => void;
}

/** Kutuyu `ust` elemanının içinde (ortada) açar; kapatma işlevini döndürür. */
export function adetKutusu(ust: HTMLElement, secenek: AdetKutusuSecenek, kapandi: () => void = () => {}): () => void {
  const { soru, maks, onayYazisi, birimFiyat, onay } = secenek;
  const e = { ad: secenek.ad };
  let kutuEl: HTMLElement | null = null;
  const kapat = () => { kutuEl?.remove(); kutuEl = null; kapandi(); };
    const kutu = document.createElement('div'); kutuEl = kutu;
    Object.assign(kutu.style, { position: 'absolute', left: '42px', top: '140px', width: '280px', height: '150px', zIndex: '20', boxSizing: 'border-box', border: '2px solid #8f6128', boxShadow: '0 0 0 1px #000, 0 6px 18px #000c', font: '12px Verdana, "Segoe UI", sans-serif', color: '#fff', textAlign: 'center' });
    kutu.style.backgroundColor = 'rgba(22, 17, 12, .96)'; // envanter penceresinin koyu kahverengi zemin rengi (çizgisiz, arkadaki simgeler görünmesin)
    const yazi = (t: string, stil: Partial<CSSStyleDeclaration>) => { const x = document.createElement('div'); x.textContent = t; Object.assign(x.style, { position: 'absolute', left: '0', right: '0', ...stil }); return x; };
    const ad = yazi(e.ad, { top: '10px', fontWeight: '700', color: '#ffe9a8', fontSize: '13px', textShadow: '0 1px 2px #000' });
    const alt = yazi(soru, { top: '30px', color: '#ffffff' });
    const toplam = yazi('', { top: '88px', color: '#ffff80', fontWeight: '700' });
    const dugme = (t: string, sol: number, ust: number, gen: number, f: () => void) => {
      const b = document.createElement('div'); b.textContent = t;
      Object.assign(b.style, { position: 'absolute', left: `${sol}px`, top: `${ust}px`, width: `${gen}px`, height: '24px', lineHeight: '24px', fontWeight: '700', color: 'rgb(255,255,128)', textShadow: '0 1px 2px #000', cursor: 'pointer', userSelect: 'none' });
      sprite(b, 'ui_marketing', UV_DUGME, gen, 24); b.addEventListener('click', f); kutu.appendChild(b); return b;
    };
    const giris = document.createElement('input'); giris.type = 'text'; giris.value = '1'; giris.inputMode = 'numeric';
    Object.assign(giris.style, { position: 'absolute', left: '96px', top: '54px', width: '88px', height: '26px', boxSizing: 'border-box', textAlign: 'center', background: 'transparent', color: '#ffff80', border: '0', font: '700 14px Verdana, sans-serif', outline: 'none' });
    const cerceve = document.createElement('div'); Object.assign(cerceve.style, { position: 'absolute', left: '96px', top: '54px', width: '88px', height: '26px' }); sprite(cerceve, 'ui_marketing', UV_KUTU, 88, 26);
    const sayi = () => Math.max(1, Math.min(maks, Math.floor(Number(giris.value.replace(/\D/g, '')) || 1)));
    const yenile = () => { toplam.textContent = birimFiyat > 0 ? `Total: ${(sayi() * birimFiyat).toLocaleString('en-US')} Noah` : ''; };
    giris.addEventListener('input', () => { giris.value = giris.value.replace(/\D/g, ''); yenile(); });
    giris.addEventListener('blur', () => { giris.value = String(sayi()); yenile(); });
    const tamam = () => { const n = sayi(); kapat(); onay(n); };
    giris.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') tamam(); else if (ev.key === 'Escape') kapat(); });
    kutu.append(ad, alt, cerceve, giris, toplam);
    dugme('-', 60, 54, 30, () => { giris.value = String(Math.max(1, sayi() - 1)); yenile(); });
    dugme('+', 190, 54, 30, () => { giris.value = String(Math.min(maks, sayi() + 1)); yenile(); });
    dugme('Max', 226, 54, 44, () => { giris.value = String(maks); yenile(); });
    dugme(onayYazisi, 52, 114, 80, tamam); dugme('Cancel', 148, 114, 80, () => kapat());
    ust.appendChild(kutu); yenile(); giris.focus(); giris.select();
  return kapat;
}
