// NPC diyalog penceresi: oyunun kendi "re_Quest_Npc_Menu" penceresi (konuşma metni + 15 düğme yuvası).
// Sunucu Lua betiği menüyü yollar (WIZ_SELECT_MSG); metinler Quest_Talk / Quest_Menu tablolarından (diyalog.json) gelir, düğmeye basınca seçim sunucuya gider.
import { UiPencere } from './orijinal';
import { diyalogVerisi } from '../oyun/diyalogVeri';

export interface DiyalogKancalari {
  /** Düğme seçildi (0'dan başlayan sıra). */
  sec: (sira: number) => void;
  /** Pencere kapandı (X, Esc, uzaklaşma ya da yeni menüye geçiş dışında). */
  kapandi: () => void;
  olcek: () => number;
  /** Oyuncunun adı (metindeki <selfname> yerine). */
  oyuncuAdi: () => string;
}

const GRUP_SAYISI = 15; // pencerede 15 düğme yuvası var
const ILK_GRUP_Y = 177, GRUP_YUKSEKLIK = 40, ALT_YUKSEKLIK = 56;

export class DiyalogPenceresi {
  private acikMi = false;
  private konusma: Record<string, string> = {}; private dugmeYazilari: Record<string, string> = {};
  get acik(): boolean { return this.acikMi; }

  static async olustur(k: DiyalogKancalari, ust: HTMLElement): Promise<DiyalogPenceresi> {
    const [p, tablo] = await Promise.all([UiPencere.yukle('re_Quest_Npc_Menu'), diyalogVerisi()]);
    const d = new DiyalogPenceresi(p, k, ust); d.konusma = tablo.talk; d.dugmeYazilari = tablo.menu; return d;
  }

  private constructor(private p: UiPencere, private k: DiyalogKancalari, ust: HTMLElement) {
    p.el.style.display = 'none'; p.el.style.zIndex = '8'; p.surukle(); ust.appendChild(p.el);
    p.el.querySelectorAll<HTMLElement>('.ui-yazi').forEach((y) => { if (!y.closest('.ui-t1')) y.style.pointerEvents = 'none'; });
    p.tikla.set('btn_close', () => this.kapat());
    for (let i = 0; i < GRUP_SAYISI; i++) p.tikla.set(`btn_${i}`, () => this.k.sec(i));
    for (const id of ['scroll']) p.gizle(id); // kaydırma çubuğu: uzun metin kutuda kaydırılır
    const talk = p.alan('txt_talk'); if (talk) Object.assign(talk.style, { overflowY: 'auto', alignItems: 'flex-start', pointerEvents: 'auto', color: '#f2e7c9' });
  }

  private metin(no: number | undefined, tablo: Record<string, string>): string {
    if (no === undefined || no < 0) return '';
    return this.temizle(tablo[String(no)] ?? '');
  }
  private temizle(s: string): string { return s.replace(/<selfname>/gi, this.k.oyuncuAdi()).replace(/\|/g, '\n').replace(/\^/g, '').trim(); }
  /** Konuşma numarasının (Quest_Talk) ve düğme numarasının (Quest_Menu, yoksa Quest_Talk) metni. */
  konusmaMetni(no: number): string { return this.metin(no, this.konusma); }
  dugmeMetni(no: number): string { return this.metin(no, this.dugmeYazilari) || this.metin(no, this.konusma); }

  /** Menüyü gösterir (varsa önceki menü değişir). `dugmeler`: Quest_Menu metin numaraları (−1 = boş). */
  goster(npcAdi: string, konusmaNo: number, dugmeler: number[]): void {
    const dolu = dugmeler.map((no, sira) => ({ yazi: this.metin(no, this.dugmeYazilari), sira, no })).filter((d) => d.no >= 0 && d.yazi);
    this.gosterMetin(npcAdi, this.konusmaMetni(konusmaNo), dolu.map((d) => ({ yazi: d.yazi, sec: () => this.k.sec(d.sira) })));
  }

  /** Hazır metinle menü: her düğmenin kendi seçim işlevi vardır. */
  gosterMetin(npcAdi: string, konusma: string, dolu: { yazi: string; sec: () => void; pasif?: boolean }[]): void {
    const p = this.p;
    p.metin('txt_title', npcAdi);
    p.metin('txt_talk', konusma || '...');
    // Yalnız dolu düğmeler art arda gösterilir; her görünen düğme kendi gerçek sırasına (sunucuya giden numara) bağlıdır.
    for (let i = 0; i < GRUP_SAYISI; i++) p.goster(`group_menu_${i}`, false);
    dolu.forEach((d, g) => {
      const grup = p.bul(`group_menu_${g}`)[0], btn = p.bul(`btn_${g}`)[0]; if (!grup || !btn) return;
      grup.style.display = '';
      const yazi = btn.querySelector<HTMLElement>('.ui-yazi span'); if (yazi) { yazi.textContent = d.yazi; yazi.style.color = d.pasif ? '#8a8a8a' : ''; } // pasif (kullanılamayan) seçenek gri
      btn.style.cursor = d.pasif ? 'default' : '';
      p.tikla.set(`btn_${g}`, d.pasif ? () => undefined : d.sec);
    });
    // Alt kenar resmi ve pencere yüksekliği düğme sayısına göre
    const alt = p.alan('img_bottom'), y = ILK_GRUP_Y + GRUP_YUKSEKLIK * dolu.length;
    if (alt) alt.style.top = `${y}px`;
    p.el.style.height = `${y + ALT_YUKSEKLIK}px`;
    this.acikMi = true; p.el.style.display = ''; this.yerlestir();
  }

  kapat(): void { if (!this.acikMi) return; this.acikMi = false; this.p.el.style.display = 'none'; this.k.kapandi(); }
  /** Sunucu yeni bir menü yollamadan pencere gizlenir (kapandı bildirimi yapılmaz). */
  sessizKapat(): void { this.acikMi = false; this.p.el.style.display = 'none'; }

  /** Pencere ekranın sol tarafında, üstten 40 px'e konur. */
  private yerlestir(): void {
    const ol = Math.max(0.4, Math.min(this.k.olcek(), (innerHeight - 120) / (ILK_GRUP_Y + GRUP_YUKSEKLIK * GRUP_SAYISI + ALT_YUKSEKLIK)));
    this.p.olcekAyarla(ol);
    if (!this.p.el.dataset.yerli) { this.p.el.style.left = `${Math.round(innerWidth * 0.5 - 190 * ol)}px`; this.p.el.dataset.yerli = '1'; }
    // yatay ve dikey ortala (yükseklik menü uzunluğuna göre değişir)
    const yuk = this.p.el.offsetHeight * ol; this.p.el.style.top = `${Math.round(Math.max(8, (innerHeight - yuk) / 2))}px`;
  }
}
