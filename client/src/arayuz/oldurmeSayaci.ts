// PvP öldürme sayacı: ekranın üst ortasında kalıcı bir "KILLS" plakası ve her öldürmede beliren büyük bildirim ("ENEMY SLAIN", seri yapınca Double/Triple Kill…).
// Görünüm (çapraz kılıç amblemi, altın çerçeve, koyu kırmızı zemin) tamamen CSS ve satır içi SVG ile çizilir; ek resim dosyası gerekmez.
const STIL = `
.ke-kill-plaka { position: fixed; left: 50%; top: 84px; transform: translateX(-50%); z-index: 30; display: flex; align-items: center; gap: 8px; pointer-events: none;
  padding: 3px 16px 3px 6px; border-radius: 22px; font-family: 'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif; color: #f5deb3;
  background: linear-gradient(180deg, rgba(74,16,16,.88), rgba(28,6,6,.92)); border: 1px solid #c9a24a; box-shadow: 0 0 0 1px #2a1006 inset, 0 0 12px rgba(201,162,74,.35), 0 3px 10px rgba(0,0,0,.6);
  opacity: 0; transition: opacity .4s; }
.ke-kill-plaka.ac { opacity: .95; }
.ke-kill-plaka svg { width: 30px; height: 30px; filter: drop-shadow(0 0 4px rgba(255,190,90,.7)); }
.ke-kill-plaka .etiket { font-size: 10px; letter-spacing: 3px; color: #d9b46a; line-height: 1; }
.ke-kill-plaka .sayi { font-size: 24px; font-weight: 700; line-height: 1; min-width: 26px; text-align: center; color: #ffe9a8; text-shadow: 0 0 8px rgba(255,170,60,.8), 0 1px 0 #000; }
.ke-kill-plaka.vur .sayi { animation: ke-kill-vur .45s ease-out; }
@keyframes ke-kill-vur { 0% { transform: scale(2.1); color: #fff; } 60% { transform: scale(.9); } 100% { transform: scale(1); } }
.ke-kill-afis { position: fixed; left: 50%; top: 150px; transform: translateX(-50%); z-index: 31; pointer-events: none; text-align: center; opacity: 0;
  font-family: 'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif; }
.ke-kill-afis .baslik { font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #ffe9a8; text-shadow: 0 0 14px rgba(255,120,30,.9), 0 2px 0 #3a0c08, 0 0 2px #000; white-space: nowrap; }
.ke-kill-afis .alt { margin-top: 2px; font-size: 13px; letter-spacing: 4px; color: #e9c77a; text-shadow: 0 1px 2px #000; }
.ke-kill-afis .cizgi { height: 2px; margin: 6px auto 0; width: 260px; background: linear-gradient(90deg, transparent, #c9a24a 25%, #ffe9a8 50%, #c9a24a 75%, transparent); }
.ke-kill-afis.goster { animation: ke-kill-afis 2.6s ease-out forwards; }
@keyframes ke-kill-afis { 0% { opacity: 0; transform: translateX(-50%) scale(1.7); } 10% { opacity: 1; transform: translateX(-50%) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(.96); } }
`;

/** Çapraz iki kılıç (kabzalı) amblemi. */
const KILICLAR = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <defs><linearGradient id="ke-bicak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6dc"/><stop offset=".55" stop-color="#cfd3d8"/><stop offset="1" stop-color="#7d838c"/></linearGradient>
  <linearGradient id="ke-kabza" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c75c"/><stop offset="1" stop-color="#9a6a1c"/></linearGradient></defs>
  <g transform="rotate(45 32 32)"><path d="M32 4 L36 36 L32 40 L28 36 Z" fill="url(#ke-bicak)" stroke="#2a1006" stroke-width="1.2"/><rect x="21" y="39" width="22" height="5" rx="2" fill="url(#ke-kabza)" stroke="#2a1006" stroke-width="1"/><rect x="29.5" y="44" width="5" height="12" rx="1.5" fill="#6b2a14" stroke="#2a1006" stroke-width="1"/><circle cx="32" cy="58" r="3" fill="url(#ke-kabza)" stroke="#2a1006" stroke-width="1"/></g>
  <g transform="rotate(-45 32 32)"><path d="M32 4 L36 36 L32 40 L28 36 Z" fill="url(#ke-bicak)" stroke="#2a1006" stroke-width="1.2"/><rect x="21" y="39" width="22" height="5" rx="2" fill="url(#ke-kabza)" stroke="#2a1006" stroke-width="1"/><rect x="29.5" y="44" width="5" height="12" rx="1.5" fill="#6b2a14" stroke="#2a1006" stroke-width="1"/><circle cx="32" cy="58" r="3" fill="url(#ke-kabza)" stroke="#2a1006" stroke-width="1"/></g>
</svg>`;

const SERI_ADLARI: Record<number, string> = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUADRA KILL', 5: 'PENTA KILL', 6: 'RAMPAGE', 7: 'UNSTOPPABLE', 8: 'DOMINATING', 9: 'GODLIKE' };

export class OldurmeSayaci {
  private plaka: HTMLElement; private sayi: HTMLElement; private afis: HTMLElement; private baslik: HTMLElement; private alt: HTMLElement;
  private toplam = 0;

  constructor(kok: HTMLElement) {
    const stil = document.createElement('style'); stil.textContent = STIL; document.head.appendChild(stil);
    this.plaka = document.createElement('div'); this.plaka.className = 'ke-kill-plaka';
    this.plaka.innerHTML = `${KILICLAR}<div><div class="etiket">KILLS</div></div><div class="sayi">0</div>`;
    this.sayi = this.plaka.querySelector('.sayi') as HTMLElement;
    this.afis = document.createElement('div'); this.afis.className = 'ke-kill-afis';
    this.afis.innerHTML = '<div class="baslik"></div><div class="cizgi"></div><div class="alt"></div>';
    this.baslik = this.afis.querySelector('.baslik') as HTMLElement; this.alt = this.afis.querySelector('.alt') as HTMLElement;
    kok.append(this.plaka, this.afis);
  }

  /** Yeni öldürme: sayaç artar, plaka vurgulanır, bildirim çıkar. `seri` = 30 sn içindeki kesintisiz öldürme sayısı (sunucudan; yoksa 1). */
  ekle(seri = 1, ad?: string): void {
    this.toplam++; this.guncelle();
    this.baslik.textContent = SERI_ADLARI[Math.min(seri, 9)] ?? 'ENEMY SLAIN';
    this.alt.textContent = seri >= 2 ? `${seri} IN A ROW` : ad ? `BY ${ad.toUpperCase()}` : '';
    this.afis.classList.remove('goster'); void this.afis.offsetWidth; this.afis.classList.add('goster');
  }

  /** Sunucu sayacı sıfırladı (15 dk sessizlik ya da bölge değişimi). */
  sifirla(): void { this.toplam = 0; this.guncelle(); }

  private guncelle(): void {
    this.sayi.textContent = String(this.toplam);
    this.plaka.classList.toggle('ac', this.toplam > 0);
    this.plaka.classList.remove('vur'); void this.plaka.offsetWidth; if (this.toplam > 0) this.plaka.classList.add('vur');
  }
}
