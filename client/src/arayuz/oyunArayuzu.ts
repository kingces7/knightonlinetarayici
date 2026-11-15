// Orijinal oyun arayüzünün (re_el_* pencereleri) oyun verisine bağlanması.
//   U: karakter durumu (re_el_page_state) · K: skill (re_el_skill) · I: envanter (re_el_inventory)
//   Üstte HP/MP/EXP çubuğu (re_el_hpbar), altta görev çubuğu (re_el_taskbar_main).
// Pencere düzenleri ve dokular araclar/arayuz ile oyunun kendi dosyalarından çıkarılır (docs/formatlar/uif.md).
import { UiPencere } from './orijinal';
import { KarakterOnizleme } from './karakterOnizleme';
import type { Oyuncu } from '../oyun/varliklar';
import type { EsyaTanimi } from '../oyun/veri';
import { gerekenDeneyim } from '../oyun/veri';
import type { TakipKamerasi } from '../dunya/kamera';

export interface Beceri { no: number; ad: string; aciklama: string; seviye: number; msp: number; simge: string | null }

export interface ArayuzBaglami {
  kok: HTMLElement;
  oyuncu: Oyuncu;
  kamera: TakipKamerasi;
  esyaKusan: (i: number) => void;
  ipucuGoster: (e: EsyaTanimi, ev: MouseEvent) => void;
  ipucuGizle: () => void;
  mesaj: (m: string) => void;
  /** Statü puanı harcandığında oyun kuralları (en çok can/mana vb.) güncellensin. */
  statDegisti: () => void;
  /** Otur / kalk (görev çubuğu düğmesi ve C tuşu). */
  otur: () => void;
  /** Yürüme ↔ koşma geçişi (görev çubuğu düğmesi ve R tuşu). */
  yuruKos: () => void;
  /** Ekipman yuvasındaki eşyayı çantaya al. */
  esyaCikar: (yuva: number) => void;
  /** NPC mağazasından eşya satın al. */
  magazaSatinAl: (e: EsyaTanimi) => void;
  /** Skill kullan (skill numarası). */
  beceriKullan: (no: number) => void;
  /** Görev çubuğu simgeleri için anlık durum. */
  durum: () => { oturuyor: boolean; kosuyor: boolean };
}

type Ad = 'durum' | 'beceri' | 'envanter' | 'magaza' | 'depo';

export class OyunArayuzu {
  private b: ArayuzBaglami;
  private hpbar!: UiPencere; private gorev!: UiPencere;
  private sohbet!: UiPencere; private bilgi!: UiPencere;
  /** Skill çubuğu (re_el_hotkey, yatay): 8 yuva, 1-8 tuşları; yuvalara skill penceresinden sürükleyip bırakılır. */
  private cubuk!: UiPencere;
  private cubukBeceri: (number | null)[] = new Array(8).fill(null);
  private cubukImza = '';
  private onizleme: KarakterOnizleme | null = null;
  /** Hedef çerçevesi (re_target_framebar): seçili canavarın adı ve canı; renk çubuğu seviye farkına göre. */
  private hedefCubugu!: UiPencere;
  private magazaSayfalar: EsyaTanimi[][] = [];
  private magazaSayfa = 0;
  private magazaAdi = '';
  private magazaImza = '';
  private depoSayfa = 0;
  private depoImza = '';
  private sohbetGiris!: HTMLInputElement;
  private pencereler = {} as Record<Ad, UiPencere>;
  private acik = new Set<Ad>();
  private z = 10;
  private beceriler: Beceri[] = [];
  private seciliBeceri = 0;
  private fps = 60; private fpsSayac = 0;
  private sonEnvanterImza = '';

  constructor(b: ArayuzBaglami) { this.b = b; }

  async baslat(): Promise<void> {
    const [hp, gorev, durum, beceri, env, sohbet, bilgi, cubuk, magaza, depo, hedefCubugu, bec] = await Promise.all([
      UiPencere.yukle('re_el_hpbar'), UiPencere.yukle('re_el_taskbar_main'), UiPencere.yukle('re_el_page_state'),
      UiPencere.yukle('re_el_skill'), UiPencere.yukle('re_el_inventory'),
      UiPencere.yukle('re_el_chatting_box'), UiPencere.yukle('re_el_information_box'), UiPencere.yukle('re_el_hotkey'), UiPencere.yukle('re_tradeinventory'), UiPencere.yukle('re_el_warehouse'), UiPencere.yukle('re_target_framebar'),
      fetch('/beceri/beceriler.json').then((r) => r.json() as Promise<Beceri[]>).catch(() => [] as Beceri[]),
    ]);
    this.hpbar = hp; this.gorev = gorev; this.sohbet = sohbet; this.bilgi = bilgi; this.cubuk = cubuk; this.hedefCubugu = hedefCubugu; this.beceriler = Array.isArray(bec) ? bec : [];
    this.pencereler = { durum, beceri, envanter: env, magaza, depo };
    this.b.kok.classList.add('orijinal-arayuz');

    this.hpbarKur(); this.gorevKur(); this.durumKur(); this.beceriKur(); this.envanterKur(); this.sohbetKur(); this.bilgiKur(); this.cubukKur(); this.magazaKur(); this.depoKur(); this.hedefKur();
    this.b.kok.append(this.hpbar.el, this.sohbet.el, this.bilgi.el, this.cubuk.el, this.hedefCubugu.el, this.gorev.el, durum.el, beceri.el, env.el, magaza.el, depo.el);
    this.hpbar.el.style.left = '0px'; this.hpbar.el.style.top = '0px';
    // Skill ve envanter sağdan, aynı yerden açılır; durum penceresi soldan. Konum ve ölçek pencereYerlestir()'de.
    const yerles: [Ad, number][] = [['durum', -150], ['beceri', 150], ['envanter', 150], ['magaza', -150], ['depo', -150]];
    for (const [ad, kay] of yerles) {
      const p = this.pencereler[ad];
      p.el.style.display = 'none';
      // 2. kayarak açılma/kapanma (stil.css: .ui-pencere.kayan / .kapali)
      p.el.classList.add('kayan', 'kapali'); p.el.style.setProperty('--kay', `${kay}px`);
      p.surukle();
      p.el.addEventListener('pointerdown', () => { p.el.style.zIndex = String(++this.z); });
    }
    this.pencereYerlestir(true); this.gorevYerlestir();
    addEventListener('resize', () => { this.pencereYerlestir(false); this.gorevYerlestir(); });
  }

  /**
   * Açılır pencereleri (durum, skill, envanter) ekrana sığdırır: görev çubuğunun üstünde kalacak şekilde ölçeği küçültür (en az 0,45),
   * ilk yerleşimde varsayılan konuma koyar, yeniden boyutlandırmada konumu ekran içinde tutar.
   */
  private pencereYerlestir(ilk: boolean): void {
    const altBos = this.gorev.boyut[1] * Math.min(1, innerWidth / (this.gorev.boyut[0] + 4)) + 14;
    for (const ad of ['durum', 'beceri', 'envanter', 'magaza', 'depo'] as Ad[]) {
      const p = this.pencereler[ad];
      const [w, h] = p.boyut;
      const ol = Math.max(0.45, Math.min(1, (innerWidth - 16) / w, (innerHeight - altBos - 8) / h));
      p.olcekAyarla(ol);
      const gw = w * ol, gh = h * ol;
      let x = ilk ? (ad === 'durum' || ad === 'magaza' || ad === 'depo' ? 24 : innerWidth - gw - 35) : parseFloat(p.el.style.left) || 0;
      let y = ilk ? (ad === 'durum' ? 110 : ad === 'magaza' ? 40 : ad === 'depo' ? 20 : 70) : parseFloat(p.el.style.top) || 0;
      x = Math.max(0, Math.min(x, innerWidth - gw)); y = Math.max(0, Math.min(y, innerHeight - altBos - gh));
      p.el.style.left = `${x}px`; p.el.style.top = `${y}px`;
    }
  }


  // ---------------------------------------------------------------- pencere yönetimi
  ac(ad: Ad, acik: boolean): void {
    const p = this.pencereler[ad]; if (!p) return;
    if (acik) {
      this.acik.add(ad); p.el.style.display = ''; p.el.style.zIndex = String(++this.z);
      void p.el.offsetWidth; // başlangıç konumu işlensin, sonra kayarak gelsin
      p.el.classList.remove('kapali');
    } else {
      this.acik.delete(ad); p.el.classList.add('kapali');
      setTimeout(() => { if (!this.acik.has(ad)) p.el.style.display = 'none'; }, 300);
    }
    this.sonEnvanterImza = '';
  }
  degistir(ad: Ad): void { this.ac(ad, !this.acik.has(ad)); }

  /** Kısayol tuşlarını işler; işlendiyse true. */
  tus(kod: string): boolean {
    if (kod === 'KeyU') { this.degistir('durum'); return true; }
    if (kod === 'KeyK') { this.degistir('beceri'); return true; }
    if (kod === 'KeyI') { this.degistir('envanter'); return true; }
    if (kod === 'Enter') { this.sohbetGiris?.focus(); return true; }
    const rakam = /^Digit([1-8])$/.exec(kod);
    if (rakam) { this.cubukKullan(Number(rakam[1]) - 1); return true; }
    if (kod === 'Escape' && this.acik.size) {
      const son = [...this.acik].sort((a, c) => Number(this.pencereler[a].el.style.zIndex) - Number(this.pencereler[c].el.style.zIndex)).pop()!;
      this.ac(son, false); return true;
    }
    return false;
  }

  private gorevYerlestir(): void {
    const ol = Math.min(1, innerWidth / (this.gorev.boyut[0] + 4));
    const s = this.gorev.el.style;
    s.transformOrigin = '0 0'; s.transform = `scale(${ol})`;
    s.left = `${Math.max(0, (innerWidth - this.gorev.boyut[0] * ol) / 2)}px`;
    s.top = `${innerHeight - this.gorev.boyut[1] * ol - 6}px`;
    // Sohbet (sol) ve bilgi/hasar penceresi (sağ) görev çubuğunun hemen üstünde.
    const ust = innerHeight - this.gorev.boyut[1] * ol - 6 - 4;
    // Dar ekranda üçü birden aynı oranda küçülür (sohbet | skill çubuğu | bilgi yan yana sığsın).
    const sw = this.sohbet.boyut[0], bw = this.bilgi.boyut[0], cw = 356;
    const hol = Math.min(1, innerWidth / (sw + bw + cw + 24));
    for (const x of [this.sohbet, this.bilgi, this.cubuk]) x.olcekAyarla(hol);
    this.sohbet.el.style.left = '0px'; this.sohbet.el.style.top = `${ust - this.sohbet.boyut[1] * hol}px`;
    this.bilgi.el.style.left = `${innerWidth - bw * hol}px`; this.bilgi.el.style.top = `${ust - this.bilgi.boyut[1] * hol}px`;
    // Skill çubuğu: sohbet ile bilgi penceresinin ortasında (pencere kutusu -10,-9'dan başlar; yalnızca yatay çubuk görünür)
    const orta = (sw * hol + innerWidth - bw * hol) / 2;
    this.cubuk.el.style.left = `${Math.max(sw * hol, orta - (cw * hol) / 2 + 10 * hol)}px`;
    this.cubuk.el.style.top = `${ust - 62 * hol}px`;
    // Hedef çerçevesi: üstte ortada
    this.hedefCubugu.olcekAyarla(hol);
    this.hedefCubugu.el.style.left = `${Math.max(350 * hol, (innerWidth - 353 * hol) / 2)}px`; this.hedefCubugu.el.style.top = `${4 * hol}px`;
  }

  // ---------------------------------------------------------------- hedef çerçevesi (re_target_framebar)
  private hedefKur(): void {
    const h = this.hedefCubugu;
    h.gizleDesen(/^(frame_[1-9][0-9]?|base_mon_hp_level_long|base_player_hp_state|base_cover|Button_Board|mark_pos)$/); // yalnız frame_0 (sade çerçeve) kullanılır
    h.el.style.display = 'none'; h.el.style.zIndex = '4';
  }
  private hedefCiz(): void {
    const h = this.hedefCubugu, hd = this.b.oyuncu.hedef;
    if (!hd || hd.olu) { if (h.el.style.display !== 'none') h.el.style.display = 'none'; return; }
    h.el.style.display = '';
    // Seviye farkına göre renk çubuğu (grpg_level_0..3); eşikler tahmin: orijinal kural bilinmiyor
    const fark = hd.tur.seviye - this.b.oyuncu.seviye;
    const k = fark <= -5 ? 0 : fark <= 1 ? 1 : fark <= 5 ? 2 : 3;
    for (let i = 0; i < 4; i++) h.goster(`grpg_level_${i}`, i === k);
    h.metin('name', hd.tur.ad);
    h.metin('Text_Health', `${Math.ceil(hd.can)} / ${hd.enCok}`);
    for (let i = 0; i < 4; i++) h.ilerleme(`grpg_level_${i}`, hd.can / hd.enCok);
  }

  // ---------------------------------------------------------------- banka (re_el_warehouse)
  /** Bankayı açar: üstte depo sayfası (6×4), altta çanta; yuvaya tıklayınca eşya öbür tarafa geçer. */
  depoAc(): void { this.depoSayfa = 0; this.depoImza = ''; this.ac('depo', true); }
  private depoUst(): HTMLElement[] { return this.pencereler.depo.tumAlanlar().filter((a) => a.offsetTop < 300 && /^\d+$/.test(a.dataset.id ?? '')).sort((a, c) => Number(a.dataset.id) - Number(c.dataset.id)); }
  private depoAlt(): HTMLElement[] { return this.pencereler.depo.tumAlanlar().filter((a) => a.offsetTop >= 340 && /^\d+$/.test(a.dataset.id ?? '')).sort((a, c) => Number(a.dataset.id) - Number(c.dataset.id)); }
  private depoKur(): void {
    const p = this.pencereler.depo, o = this.b.oyuncu;
    p.gizleDesen(/^(Edt_search|Btn_search)$/);
    p.tikla.set('btn_close', () => this.ac('depo', false));
    const sayfaDegistir = (d: number) => { this.depoSayfa = (this.depoSayfa + d + 8) % 8; this.depoImza = ''; };
    p.tikla.set('btn_page_up', () => sayfaDegistir(-1)); p.tikla.set('btn_page_down', () => sayfaDegistir(1));
    // Noah: çantadaki tüm Noah'yı yatır / depodakinin tamamını çek
    p.tikla.set('btn_gold', () => { if (o.altin > 0) { o.depoAltin += o.altin; this.b.mesaj(`${o.altin.toLocaleString('en-US')} Noah deposited.`); o.altin = 0; this.depoImza = ''; } });
    p.tikla.set('btn_gold_warehouse', () => { if (o.depoAltin > 0) { o.altin += o.depoAltin; this.b.mesaj(`${o.depoAltin.toLocaleString('en-US')} Noah withdrawn.`); o.depoAltin = 0; this.depoImza = ''; } });
    // Yuva tıklamaları pencere düzeyinde ve tıklama anında çözülür (yuvalar pencere gizliyken konumlanmamış olur).
    p.el.addEventListener('click', (ev) => {
      const el = (ev.target as HTMLElement).closest('.ui-t9') as HTMLElement | null; if (!el) return;
      const ust = this.depoUst().indexOf(el);
      if (ust >= 0) {
        const j = this.depoSayfa * 24 + ust, e = o.depo[j]; if (!e) return;
        if (!o.esyaEkle(e)) { this.b.mesaj('Your inventory is full.'); return; }
        o.depo[j] = null; this.depoImza = ''; return;
      }
      const alt = this.depoAlt().indexOf(el);
      if (alt >= 0) {
        const e = o.envanter[alt]; if (!e) return;
        const bos = o.depo.indexOf(null);
        if (bos < 0) { this.b.mesaj('Your warehouse is full.'); return; }
        o.depo[bos] = e; o.envanter[alt] = null; this.depoImza = '';
      }
    });
  }
  private depoCiz(): void {
    const p = this.pencereler.depo, o = this.b.oyuncu;
    const imza = `${this.depoSayfa}|${o.altin}|${o.depoAltin}|${o.depo.map((e) => e?.no ?? 0).join(',')}|${o.envanter.map((e) => e?.no ?? 0).join(',')}`;
    if (imza === this.depoImza) return;
    this.depoImza = imza;
    const yuvaCiz = (el: HTMLElement, e: EsyaTanimi | null) => {
      el.style.backgroundImage = e?.simge ? `url(${e.simge})` : ''; el.style.backgroundSize = '100% 100%';
      el.onmouseenter = e ? (ev) => this.b.ipucuGoster(e, ev) : null; el.onmouseleave = () => this.b.ipucuGizle();
    };
    this.depoUst().forEach((el, i) => yuvaCiz(el, o.depo[this.depoSayfa * 24 + i] ?? null));
    this.depoAlt().forEach((el, i) => yuvaCiz(el, o.envanter[i] ?? null));
    p.metin('string_page', this.depoSayfa + 1);
    p.metin('string_item_name', o.altin.toLocaleString('en-US')); p.metin('string_wareitem_name', o.depoAltin.toLocaleString('en-US'));
    p.metin('text_weight', `${o.envanter.filter(Boolean).length} / 28`);
  }

  // ---------------------------------------------------------------- NPC mağazası (re_tradeinventory)
  /** Mağazayı açar (envanterle birlikte). Sayfalar: satış grubunun sayfaları. */
  magazaAc(npcAdi: string, sayfalar: EsyaTanimi[][]): void {
    this.magazaAdi = npcAdi; this.magazaSayfalar = sayfalar; this.magazaSayfa = 0; this.magazaImza = '';
    this.ac('magaza', true); this.ac('envanter', true);
  }
  private magazaKur(): void {
    const p = this.pencereler.magaza;
    p.gizleDesen(/^(edit_message|btn_ok|at[0-9]+)$/); // at0-at11: öne çıkan eşya alanı (kullanılmıyor)
    p.tikla.set('btn_cancel', () => this.ac('magaza', false));
    for (let i = 0; i < 28; i++) {
      const alan = p.alan(`a${i}`); if (!alan) continue;
      alan.addEventListener('click', () => { const e = this.magazaSayfalar[this.magazaSayfa]?.[i]; if (e) this.b.magazaSatinAl(e); });
    }
    // Sayfa değiştirme: sayfa yazısına sol tık = sonraki, sağ tık = önceki
    const sayfaEl = p.bul('text_sell_money')[0];
    if (sayfaEl) {
      sayfaEl.style.pointerEvents = 'auto'; sayfaEl.style.cursor = 'pointer';
      const don = (d: number) => { const n = this.magazaSayfalar.length || 1; this.magazaSayfa = (this.magazaSayfa + d + n) % n; this.magazaImza = ''; };
      sayfaEl.addEventListener('click', () => don(1));
      sayfaEl.addEventListener('contextmenu', (ev) => { ev.preventDefault(); don(-1); });
    }
  }
  private magazaCiz(): void {
    const p = this.pencereler.magaza, o = this.b.oyuncu;
    const imza = `${this.magazaSayfa}|${o.altin}|${this.magazaAdi}`;
    if (imza === this.magazaImza) return;
    this.magazaImza = imza;
    const sayfa = this.magazaSayfalar[this.magazaSayfa] ?? [];
    for (let i = 0; i < 28; i++) {
      const alan = p.alan(`a${i}`); if (!alan) continue;
      const e = sayfa[i] ?? null;
      alan.style.backgroundImage = e?.simge ? `url(${e.simge})` : '';
      alan.style.backgroundSize = '100% 100%';
      alan.onmouseenter = e ? (ev) => this.b.ipucuGoster(e, ev) : null;
      alan.onmouseleave = () => this.b.ipucuGizle();
      alan.style.opacity = e && o.altin < e.fiyat ? '0.55' : '1';
      p.metin(String(200 + i), e ? e.fiyat.toLocaleString('en-US') : '');
    }
    p.metin('text_money', o.altin.toLocaleString('en-US'));
    p.metin('text_sell_KnightCash', this.magazaAdi);
    p.metin('text_sell_money', `Page ${this.magazaSayfa + 1}/${this.magazaSayfalar.length || 1}`);
  }

  // ---------------------------------------------------------------- skill çubuğu
  private cubukKur(): void {
    const c = this.cubuk;
    c.gizleDesen(/^(Hotkey_vertical|btn_down|btn_up|btn_lock|btn_open|btn_close|btn_change|strpage\d|img_front2)$/);
    c.el.style.height = '70px'; c.el.style.overflow = 'visible'; c.el.style.zIndex = '5';
    try { const k = JSON.parse(localStorage.getItem('ke_skillcubugu') ?? 'null'); if (Array.isArray(k)) this.cubukBeceri = k.slice(0, 8).map((x) => (typeof x === 'number' ? x : null)); } catch { /* kayıt yok */ }
    if (!this.cubukBeceri.some((x) => x !== null)) this.cubukBeceri = [201001, 201002, 201003, 201005, 201007, 201009, null, null]; // ilk açılışta temel skill'ler sırayla
    for (let i = 0; i < 8; i++) {
      const alan = c.alan(String(10 + i)); if (!alan) continue;
      alan.style.overflow = 'hidden';
      const bek = document.createElement('div');
      Object.assign(bek.style, { position: 'absolute', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', color: '#fff', font: 'bold 14px sans-serif', pointerEvents: 'none' });
      bek.className = 'cubuk-bekleme'; alan.appendChild(bek);
      alan.addEventListener('click', () => this.cubukKullan(i));
      alan.addEventListener('contextmenu', (e) => { e.preventDefault(); this.cubukBeceri[i] = null; this.cubukKaydet(); });
      alan.addEventListener('dragover', (e) => e.preventDefault());
      alan.addEventListener('drop', (e) => {
        e.preventDefault();
        const no = Number(e.dataTransfer?.getData('text/plain'));
        if (this.beceriler.some((b) => b.no === no)) { this.cubukBeceri[i] = no; this.cubukKaydet(); }
      });
    }
  }
  private cubukKaydet(): void { try { localStorage.setItem('ke_skillcubugu', JSON.stringify(this.cubukBeceri)); } catch { /* depolama kapalı */ } }
  private cubukKullan(i: number): void { const no = this.cubukBeceri[i]; if (no !== null && no !== undefined) this.b.beceriKullan(no); }
  private cubukCiz(): void {
    const o = this.b.oyuncu, simdi = performance.now() / 1000;
    for (let i = 0; i < 8; i++) {
      const alan = this.cubuk.alan(String(10 + i)); if (!alan) continue;
      const no = this.cubukBeceri[i], b = this.beceriler.find((x) => x.no === no);
      const imza = `${no}|${b && o.seviye >= b.seviye}`;
      if (alan.dataset.imza !== imza) {
        alan.dataset.imza = imza;
        alan.style.backgroundImage = b?.simge ? `url(/beceri/${b.simge})` : '';
        alan.style.backgroundSize = '100% 100%';
        alan.style.opacity = b && o.seviye < b.seviye ? '0.45' : '1';
        alan.title = b ? `${b.ad} (MP ${b.msp}) — ${b.aciklama}` : '';
      }
      const kalan = no ? (o.beceriBekleme.get(no) ?? 0) - simdi : 0;
      const bek = alan.querySelector<HTMLElement>('.cubuk-bekleme');
      if (bek) { const goster = kalan > 0; bek.style.display = goster ? 'flex' : 'none'; if (goster) bek.textContent = kalan.toFixed(kalan < 10 ? 1 : 0); }
    }
  }

  // ---------------------------------------------------------------- sohbet ve bilgi (hasar) pencereleri
  private satirKabi(el: HTMLElement | undefined, boyut: number): HTMLElement {
    if (!el) throw new Error('metin alanı yok');
    el.classList.remove('ui-yazi'); el.replaceChildren();
    Object.assign(el.style, { display: 'block', overflowY: 'auto', overflowX: 'hidden', pointerEvents: 'auto', fontSize: `${boyut}px`, lineHeight: '1.25', color: '#fff', textShadow: '0 1px 2px #000' });
    el.classList.add('ui-gunluk');
    return el;
  }

  private satirEkle(kap: HTMLElement, metin: string, renk: string): void {
    const sat = document.createElement('div');
    sat.textContent = metin; sat.style.color = renk;
    const alttaydi = kap.scrollHeight - kap.scrollTop - kap.clientHeight < 24;
    kap.appendChild(sat);
    while (kap.childElementCount > 120) kap.firstElementChild!.remove();
    if (alttaydi) kap.scrollTop = kap.scrollHeight;
  }

  private sohbetKur(): void {
    const p = this.sohbet;
    p.gizleDesen(/^(base_mapuserlist|BaseChangeChattingMode|base_filter|base_scroll|btn_chatroom|btn_noah_knights|btn_clan$|btn_union$|btn_chat_lock|btn_check_)/);
    this.satirKabi(p.alan('text0'), 12);
    const e = p.alan('edit0');
    if (e) {
      const g = document.createElement('input');
      g.type = 'text'; g.maxLength = 120; g.spellcheck = false; g.autocomplete = 'off';
      Object.assign(g.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', boxSizing: 'border-box', background: 'transparent', border: '0', outline: '0', color: '#fff', font: '12px Segoe UI, Tahoma, sans-serif', padding: '0 6px', pointerEvents: 'auto' });
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          const m = g.value.trim(); g.value = '';
          if (m) this.sohbetYaz(`[Normal] KnightEmpire: ${m}`, '#ffffff');
          g.blur();
        } else if (ev.key === 'Escape') { g.value = ''; g.blur(); }
        ev.stopPropagation();
      });
      g.addEventListener('keyup', (ev) => ev.stopPropagation());
      g.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      e.appendChild(g); this.sohbetGiris = g;
    }
    this.sohbetYaz('Welcome to KnightEmpire! Press Enter to chat.', '#8fd0ff');
  }

  private bilgiKur(): void {
    const p = this.bilgi;
    p.gizleDesen(/^(btn_msgwnd_lock|btn_minimizeui|btn_option|img_sizechange|scroll)/);
    this.satirKabi(p.alan('text_message'), 12);
  }

  /** Sohbet penceresine satır ekler. */
  sohbetYaz(metin: string, renk = '#ffffff'): void { const k = this.sohbet.alan('text0'); if (k) this.satirEkle(k, metin, renk); }
  /** Bilgi (hasar, ganimet, sistem) penceresine satır ekler. */
  bilgiMesaji(metin: string, tur: 'bilgi' | 'hasar' | 'odul' | 'sistem' = 'bilgi'): void {
    const renk = { hasar: '#ff8a7a', odul: '#ffd76b', sistem: '#8fd0ff', bilgi: '#dddddd' }[tur];
    const k = this.bilgi.alan('text_message'); if (k) this.satirEkle(k, metin, renk);
  }

  // ---------------------------------------------------------------- HP çubuğu
  private hpbarKur(): void {
    const p = this.hpbar;
    p.gizleDesen(/^(img_mail|img_Reporter|progress_Rexp|progress_Sexp|progress_HP_slow|progress_HP_drop|progress_HP_lasting|text_level_id|str_exp)/);
    p.metin('text_Nick', 'KnightEmpire');
  }

  // ---------------------------------------------------------------- görev çubuğu
  private gorevKur(): void {
    const g = this.gorev;
    g.gizleDesen(/^(base_menu|base_TaskBar|btn_option|btn_uishow|btn_change|btn_close|btn_disband|btn_invite|btn_command|btn_trade|btn_rank|img_backboard|btn_seed|btn_powerup|btn_question|btn_menu)/);
    g.tikla.set('btn_inventory', () => this.degistir('envanter'));
    g.tikla.set('btn_character', () => this.degistir('durum'));
    g.tikla.set('btn_skill', () => this.degistir('beceri'));
    g.tikla.set('btn_camera', () => this.b.kamera.arkayaDon());
    // Her çift aynı yerde durur; durumun simgesi gösterilir (guncelle → simgeleriUygula).
    for (const id of ['btn_stand', 'btn_sit']) g.tikla.set(id, () => this.b.otur());
    for (const id of ['btn_run', 'btn_walk']) g.tikla.set(id, () => this.b.yuruKos());
    this.simgeler = null; this.simgeleriUygula();
  }

  private simgeler: string | null = null;
  /** Duruyor/oturuyor ve koşuyor/yürüyor simgelerini gösterir. */
  private simgeleriUygula(): void {
    const d = this.b.durum();
    const imza = `${d.oturuyor}|${d.kosuyor}`;
    if (imza === this.simgeler) return;
    this.simgeler = imza;
    const g = this.gorev;
    g.goster('btn_stand', !d.oturuyor); g.goster('btn_sit', d.oturuyor);
    g.goster('btn_run', d.kosuyor); g.goster('btn_walk', !d.kosuyor);
  }

  // ---------------------------------------------------------------- karakter durumu (U)
  private durumKur(): void {
    const p = this.pencereler.durum;
    p.gizleDesen(/^(icon_level_|btn_rebirth_preset|btn_preset|base_perks|Text_HP$|Text_MP$)/); // base_perks: Myko'nun ekstra özellik listesi (şimdilik yok)
    const harca = (ad: 'str' | 'sta' | 'dex' | 'int') => () => {
      if (this.b.oyuncu.statArtir(ad)) { this.b.statDegisti(); this.durumCiz(); }
    };
    p.tikla.set('btn_str', harca('str')); p.tikla.set('btn_sta', harca('sta'));
    p.tikla.set('btn_Dex', harca('dex')); p.tikla.set('btn_Int', harca('int'));
    p.tikla.set('btn_Magic', harca('int'));
    p.tikla.set('btn_reset_stat', () => {
      const iade = this.b.oyuncu.statSifirla();
      this.b.statDegisti(); this.durumCiz();
      this.b.mesaj(iade > 0 ? `Stat points reset: ${iade} points returned.` : 'There are no stat points to reset.');
    });
  }

  private durumCiz(): void {
    const p = this.pencereler.durum, o = this.b.oyuncu;
    p.metin('Text_Id', 'KnightEmpire'); p.metin('Text_Nation', 'El Morad'); p.metin('Text_Class', 'Warrior'); p.metin('Text_Race', 'Human');
    p.metin('Text_Level', o.seviye);
    p.metin('Text_Exp', `${o.deneyim} / ${gerekenDeneyim(o.seviye)}`);
    p.metin('Text_HP', `${Math.ceil(o.can)} / ${o.enCok}`); p.metin('Text_MP', `${Math.ceil(o.mana)} / ${o.enCokMana}`);
    p.metin('Text_AP', o.toplamVurus()); p.metin('Text_GP', o.savunma());
    p.metin('Text_Weight', `${o.envanter.filter(Boolean).length} / 28`);
    p.metin('Text_BonusPoint', o.bonusPuan);
    p.metin('Text_Strength', o.stat.str); p.metin('Text_Stamina', o.stat.sta); p.metin('Text_Dexterity', o.stat.dex);
    p.metin('Text_Intelligence', o.stat.int); p.metin('Text_MagicAttack', Math.max(0, o.stat.int - 30));
    p.metin('Text_RealmPoint', 0); p.metin('Text_Manner', 0);
    for (const d of ['btn_str', 'btn_sta', 'btn_Dex', 'btn_Int', 'btn_Magic']) p.dugmePasif(d, o.bonusPuan <= 0);
  }

  // ---------------------------------------------------------------- skill (K)
  private beceriKur(): void {
    const p = this.pencereler.beceri;
    p.gizleDesen(/^(img_|string_[4-7]$|string_skill_level|btn_(mage|ranger|blade|cleric|reaper|master|[4-7]$|EXbuf|preset|reset_skill))/); // sınıfa özel sekmeler/başlıklar; temel skill sayfasında görünmez
    p.tikla.set('btn_close', () => this.ac('beceri', false));
    p.goster('img_public');
    for (const m of ['Master']) p.gizleMetin(m);
    for (const id of ['btn_right', 'btn_left']) p.dugmePasif(id, true);
    for (let i = 0; i < 8; i++) {
      const alan = p.alan(String(i)); if (!alan) continue;
      alan.draggable = true;
      alan.addEventListener('dragstart', (e) => { if (this.beceriler[i]) e.dataTransfer?.setData('text/plain', String(this.beceriler[i].no)); else e.preventDefault(); });
      alan.addEventListener('click', () => { if (this.beceriler[i]) { this.seciliBeceri = i; this.beceriCiz(); } });
      alan.addEventListener('dblclick', () => { if (this.beceriler[i]) this.b.beceriKullan(this.beceriler[i].no); });
    }
    p.metin('string_page', 1);
  }

  private beceriCiz(): void {
    const p = this.pencereler.beceri, o = this.b.oyuncu;
    p.metin('string_skillpoint', 0);
    for (let i = 0; i < 8; i++) {
      const b = this.beceriler[i];
      p.metin(`string_list_${i}`, b ? `${b.ad}\nLv. ${b.seviye}` : '');
      const alan = p.alan(String(i)); if (!alan) continue;
      alan.style.backgroundImage = b?.simge ? `url(/beceri/${b.simge})` : '';
      alan.style.backgroundSize = '100% 100%';
      alan.style.opacity = b && o.seviye < b.seviye ? '0.4' : '1';
      alan.style.outline = b && i === this.seciliBeceri ? '1px solid #f0d48a' : '';
      alan.title = b?.aciklama ?? '';
    }
    const s = this.beceriler[this.seciliBeceri];
    p.metin('string_info', s ? s.aciklama : '');
    p.metin('string_skill_mp', s ? `MP ${s.msp}` : '');
    p.metin('string_skill_vp', s ? `Required level ${s.seviye}` : '');
    p.metin('string_skill_point', s ? (o.seviye >= s.seviye ? 'Available' : 'Not available yet') : '');
    for (const id of ['string_skill_item0', 'string_skill_item1', 'string_skill_item2']) p.metin(id, '');
  }

  // ---------------------------------------------------------------- envanter (I)
  private envanterKur(): void {
    const p = this.pencereler.envanter;
    p.gizleDesen(/(Destroy|_bag|string_Bag|btn_bag|PreView|close_cos|Emblem|Pathos|helmetview|ecli666|TrashLock|^btn_gold$|^base_(inven_notice|bag|LockImg|cos)$)/);
    for (let i = 28; i <= 39; i++) p.goster(String(i), false);
    // Karakter alanı: animasyonlu oyuncu önizlemesi
    const kap = p.bul('area_char')[0];
    if (kap && this.b.oyuncu.modelNo) { this.onizleme = new KarakterOnizleme(kap, this.b.oyuncu.modelNo); void this.onizleme.baslat(); }
  }

  /** Çanta yuvaları: kutunun alt yarısındaki 28 alan (kimlik 0..27); ekipman alanları üstte. */
  private canta(): HTMLElement[] {
    const p = this.pencereler.envanter;
    return p.tumAlanlar().filter((a) => a.offsetTop >= 340 && /^\d+$/.test(a.dataset.id ?? '')).sort((a, c) => Number(a.dataset.id) - Number(c.dataset.id));
  }
  /** Ekipman yuvası (sağ üst ızgara; kimlik = Knight Online yuva numarası: 4 göğüs zırhı, 6 sağ el silahı). */
  private ekipman(id: number): HTMLElement | undefined {
    return this.pencereler.envanter.tumAlanlar().find((a) => a.offsetTop < 320 && a.offsetLeft >= 360 && a.dataset.id === String(id));
  }

  private envanterCiz(): void {
    const o = this.b.oyuncu, p = this.pencereler.envanter;
    const imza = `${o.envanter.map((e) => e?.no ?? 0).join(',')}|${o.ekipman.map((e) => e?.no ?? 0).join(',')}|${o.altin}`;
    if (imza === this.sonEnvanterImza) return;
    this.sonEnvanterImza = imza;
    const yuvaCiz = (el: HTMLElement, e: EsyaTanimi | null, tikla?: () => void) => {
      el.style.backgroundImage = e ? `url(${e.simge})` : '';
      el.style.backgroundSize = '100% 100%';
      el.onmouseenter = e ? (ev) => this.b.ipucuGoster(e, ev) : null;
      el.onmouseleave = () => this.b.ipucuGizle();
      el.onclick = tikla ?? null;
    };
    this.canta().forEach((el, i) => yuvaCiz(el, o.envanter[i] ?? null, o.envanter[i] ? () => this.b.esyaKusan(i) : undefined));
    for (let yuva = 0; yuva < 15; yuva++) {
      const el = this.ekipman(yuva);
      if (el) yuvaCiz(el, o.ekipman[yuva], o.ekipman[yuva] ? () => this.b.esyaCikar(yuva) : undefined);
    }
    p.metin('text_gold', o.altin.toLocaleString('en-US'));
    p.metin('text_weight', `${o.envanter.filter(Boolean).length} / 28`);
  }

  // ---------------------------------------------------------------- her kare
  guncelle(dt: number): void {
    const o = this.b.oyuncu, h = this.hpbar;
    this.simgeleriUygula();
    this.cubukCiz();
    this.fpsSayac += dt;
    if (this.fpsSayac > 0.5) { this.fps = Math.round(1 / Math.max(dt, 1e-4)); this.fpsSayac = 0; h.metin('text_fps', `${this.fps} fps`); }
    h.metin('Text_HP', `${Math.ceil(o.can)}/${o.enCok}`); h.metin('Text_MSP', `${Math.ceil(o.mana)}/${o.enCokMana}`);
    h.ilerleme('progress_HP', o.can / o.enCok); h.ilerleme('progress_msp', o.mana / o.enCokMana);
    const g = gerekenDeneyim(o.seviye);
    h.ilerleme('progress_exp', o.deneyim / g); h.metin('Text_ExpP', `${((o.deneyim / g) * 100).toFixed(1)}%`);
    h.metin('text_Level', `Level ${o.seviye}`);
    h.metin('text_cordinate', `${o.konum.x.toFixed(0)}, ${o.konum.y.toFixed(0)}`);
    if (this.acik.has('durum')) this.durumCiz();
    if (this.acik.has('beceri')) this.beceriCiz();
    this.hedefCiz();
    if (this.acik.has('magaza')) this.magazaCiz();
    if (this.acik.has('depo')) this.depoCiz();
    if (this.acik.has('envanter')) { this.envanterCiz(); this.onizleme?.ciz(dt, this.b.oyuncu.ekipman[6]?.no ?? 0, this.b.oyuncu.ekipman[8]?.no ?? 0); }
  }
}
