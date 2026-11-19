// Işınlanma kapısı penceresi: oyunun kendi "Zone List" penceresi (re_el_warp / re_ka_warp). Mantık orijinal CUIWarp'tan (OpenKO UIWarp.cpp):
//  - üstte bölge adları listesi (en çok 9 satır), seçili satır yeşil çerçeveli seçim çubuğuyla işaretlenir; açılışta ilk satır seçilidir,
//  - satır seçilince alttaki kutuda o kapının duyurusu (szAgreement) gösterilir,
//  - Confirm (ya da Enter / satıra çift tık) seçili kapıya ışınlar; Cancel (ya da Esc) kapatır.
// Sunucu kapı listesini yollar (WIZ_WARP_LIST); seçim sunucuya gider (main.ts).
import { UiPencere } from './orijinal';

export interface KapiSatiri {
  ad: string;
  /** Sunucunun kapı duyurusu (yazı kutusunda gösterilir). */
  duyuru: string;
  ucret: number;
  /** Haritası henüz yok: gri görünür, onaylanamaz. */
  pasif?: boolean;
  sec: () => void;
}

const SATIR_SAYISI = 9, ILK_SATIR_Y = 40, SATIR_YUKSEKLIK = 17;

// Oyunda Korece/bozuk (CP949 → Latin) yazı görünmez (kullanıcı kararı). main.ts kapı metinlerini zaten sunucu.json'daki İngilizce metinden alır;
// buradaki süzgeç son güvenlik ağıdır: ASCII dışı her karakter atılır, boş kalan metin '-' olur.
function sadeceAscii(metin: string): string { return metin.replace(/[^\u0020-\u007e\n]/g, '').trim(); }

export class IsinlanmaPenceresi {
  private acikMi = false;
  private satirlar: KapiSatiri[] = [];
  private secili = 0;
  get acik(): boolean { return this.acikMi; }

  /** @param ad Pencere dosyası: `re_el_warp` (El Morad) ya da `re_ka_warp` (Karus). */
  static async olustur(ad: string, ust: HTMLElement, olcek: () => number, bilgi: (m: string) => void): Promise<IsinlanmaPenceresi> {
    return new IsinlanmaPenceresi(await UiPencere.yukle(ad), ust, olcek, bilgi);
  }

  private constructor(private p: UiPencere, ust: HTMLElement, private olcek: () => number, private bilgi: (m: string) => void) {
    p.el.style.display = 'none'; p.el.style.zIndex = '8'; p.surukle(); ust.appendChild(p.el);
    p.el.querySelectorAll<HTMLElement>('.ui-yazi').forEach((y) => { y.style.pointerEvents = 'none'; });
    p.tikla.set('Btn_Ok', () => this.onayla());
    p.tikla.set('Btn_Cancel', () => this.kapat()); p.tikla.set('btn_close', () => this.kapat()); // iki düğme aynı yerde durur
    // Her satırın üstüne saydam bir tıklama alanı: tek tık seçer, çift tık onaylar
    for (let i = 0; i < SATIR_SAYISI; i++) {
      const alan = document.createElement('div'); alan.className = 'ui-dugum'; alan.dataset.satir = String(i);
      Object.assign(alan.style, { left: '14px', top: `${ILK_SATIR_Y + i * SATIR_YUKSEKLIK - 1}px`, width: '291px', height: `${SATIR_YUKSEKLIK + 1}px`, cursor: 'pointer', zIndex: '3' });
      alan.addEventListener('click', () => this.sec(i));
      alan.addEventListener('dblclick', () => this.onayla());
      p.el.appendChild(alan);
    }
    // Pencere şablonundaki örnek yazılar ("MORADON" satırları, "lv35 ~ lv45") sunucu verisiyle gelmeyenler için gizlenir
    p.gizle('str_level');
  }

  /** Kapı listesini gösterir (yeni liste öncekinin yerine geçer). */
  goster(satirlar: KapiSatiri[]): void {
    this.satirlar = satirlar.slice(0, SATIR_SAYISI);
    const p = this.p;
    for (let i = 0; i < SATIR_SAYISI; i++) {
      const s = this.satirlar[i];
      p.goster(`str_warp${i}`, !!s);
      if (s) { p.metin(`str_warp${i}`, sadeceAscii(s.ad)); for (const e of p.bul(`str_warp${i}`)) e.style.color = s.pasif ? '#8c8c8c' : ''; }
      for (const e of p.el.querySelectorAll<HTMLElement>(`[data-satir="${i}"]`)) e.style.display = s ? '' : 'none';
    }
    this.sec(0);
    this.acikMi = true; p.el.style.display = ''; this.yerlestir();
  }

  private sec(i: number): void {
    if (i >= this.satirlar.length) return;
    this.secili = i;
    for (const e of this.p.bul('img_select')) { e.style.display = ''; e.style.top = `${ILK_SATIR_Y - 1 + i * SATIR_YUKSEKLIK}px`; }
    const s = this.satirlar[i];
    const ucret = s.ucret > 0 ? `Fee: ${s.ucret.toLocaleString('en-US')} Coin` : '';
    this.p.metin('Text_Agreement', [sadeceAscii(s.duyuru), ucret].filter(Boolean).join('\n\n') || '-');
  }

  onayla(): void {
    const s = this.satirlar[this.secili]; if (!this.acikMi || !s) return;
    if (s.pasif) { this.bilgi('This zone is not available yet.'); return; }
    this.kapat(); s.sec();
  }
  kapat(): void { if (!this.acikMi) return; this.acikMi = false; this.p.el.style.display = 'none'; }

  /** Ekranın ortasına, ekrana sığacak ölçekle. */
  private yerlestir(): void {
    const [w, h] = this.p.boyut;
    const ol = Math.max(0.45, Math.min(this.olcek(), (innerHeight - 24) / h, (innerWidth - 24) / w));
    this.p.olcekAyarla(ol);
    if (!this.p.el.dataset.yerli) { this.p.el.style.left = `${Math.round((innerWidth - w * ol) / 2)}px`; this.p.el.dataset.yerli = '1'; }
    this.p.el.style.top = `${Math.round(Math.max(8, (innerHeight - h * ol) / 2))}px`;
  }
}
