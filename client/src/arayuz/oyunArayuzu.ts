// Orijinal oyun arayüzünün (re_el_* pencereleri) oyun verisine bağlanması.
//   U: karakter durumu (re_el_page_state) · K: skill (re_el_skill) · I: envanter (re_el_inventory)
//   Üstte HP/MP/EXP çubuğu (re_el_hpbar), altta görev çubuğu (re_el_taskbar_main).
// Pencere düzenleri ve dokular araclar/arayuz ile oyunun kendi dosyalarından çıkarılır (docs/formatlar/uif.md).
import { GenelPencereler } from './genelPencereler';
import { SerbestPencere } from './serbestPencere';
import { UiPencere } from './orijinal';
import { KarakterOnizleme } from './karakterOnizleme';
import type { GanimetKutusu, Oyuncu } from '../oyun/varliklar';
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
  /** Ganimet sandığından altın/eşya al (main.ts → hud.ganimetAl). */
  ganimetAl: (k: GanimetKutusu, secim: 'altin' | number) => void;
  /** NPC'ye çantadaki eşyayı sat (çanta yuvası). */
  magazaSat: (yuva: number) => void;
  /** NPC mağazasından eşya satın al. */
  magazaSatinAl: (e: EsyaTanimi) => void;
  /** Skill kullan (skill numarası). */
  beceriKullan: (no: number) => void;
  /** Görev çubuğu simgeleri için anlık durum. */
  durum: () => { oturuyor: boolean; kosuyor: boolean };
}

/** Eşya simgeleri 64×64 dokunun sol üst 45×45'ine çizilir; yuvayı tam doldurmak için büyütülür. */
/** Kısayol tuşu → orijinal pencere (M ses için ayrıldı). */
const GENEL_TUSLAR: Record<string, string> = { KeyP: 're_el_party', KeyF: 're_el_page_friend', KeyQ: 're_el_page_quest', KeyL: 're_el_clan_window', KeyN: 're_el_notice', KeyO: 're_el_various_frame' };
/** Görev çubuğu düğmesi → orijinal pencere (eşleşme pencerenin metinlerinden tahmin edildi). */
const GOREV_PENCERELERI: Record<string, string> = {
  btn_map: 're_minimap', btn_exit: 're_exitmenu', btn_command: 're_el_cmdlist', btn_invite: 're_el_party', btn_option: 're_el_various_frame',
  btn_menu: 're_minimenu', btn_question: 're_seed_helper', btn_rank: 're_el_dailyoverallrank', btn_trade: 're_el_personaltrade', btn_powerup: 're_powerupstore',
};
const ESYA_SIMGE = '142.22% 142.22%';
type Ad = 'durum' | 'beceri' | 'envanter' | 'magaza' | 'depo';

export class OyunArayuzu {
  private b: ArayuzBaglami;
  private hpbar!: UiPencere; private gorev!: UiPencere;
  private sohbet!: UiPencere; private bilgi!: UiPencere;
  /** Skill çubuğu (re_el_hotkey, yatay): 8 yuva, 1-8 tuşları; yuvalara skill penceresinden sürükleyip bırakılır. */
  private cubuk!: UiPencere;
  /** Skill çubuğu: 8 sayfa × 8 yuva (sunucu en çok 64 kısayol kaydeder). */
  private cubukBeceri: (number | null)[] = new Array(64).fill(null);
  private cubukSayfa = 0;
  private cubukKilitli = false;
  private cubukImza = '';
  /** Sohbet ve bilgi pencereleri: köşeden büyütme, kenardan taşıma, sağ alttaki toptan kilit. */
  private sohbetSerbest: SerbestPencere | null = null;
  private bilgiSerbest: SerbestPencere | null = null;
  /** Oyunun öbür orijinal pencereleri (harita, parti, dost, klan, komutlar…): ad ile açılır. */
  genel!: GenelPencereler;
  /** Skill çubuğu yönü: dikey (varsayılan, ekranın solunda) ya da yatay; çevirme düğmesiyle değişir. */
  private cubukDikey = true;
  private onizleme: KarakterOnizleme | null = null;
  /** Hedef çerçevesi (re_target_framebar): seçili canavarın adı ve canı; renk çubuğu seviye farkına göre. */
  private hedefCubugu!: UiPencere;
  /** Ganimet penceresi (re_droppeditem): 12 yuva; ilk yuva Noah varsa Noah. */
  private ganimetPencere!: UiPencere;
  private ganimetKutusu: GanimetKutusu | null = null;
  private ganimetImza = '';
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
    const [hp, gorev, durum, beceri, env, sohbet, bilgi, cubuk, magaza, depo, hedefCubugu, ganimetPencere, bec] = await Promise.all([
      UiPencere.yukle('re_el_hpbar'), UiPencere.yukle('re_el_taskbar_main'), UiPencere.yukle('re_el_page_state'),
      UiPencere.yukle('re_el_skill'), UiPencere.yukle('re_el_inventory'),
      UiPencere.yukle('re_el_chatting_box'), UiPencere.yukle('re_el_information_box'), UiPencere.yukle('re_el_hotkey'), UiPencere.yukle('re_tradeinventory'), UiPencere.yukle('re_el_warehouse'), UiPencere.yukle('re_target_framebar'), UiPencere.yukle('re_droppeditem'),
      fetch('/beceri/beceriler.json').then((r) => r.json() as Promise<Beceri[]>).catch(() => [] as Beceri[]),
    ]);
    this.hpbar = hp; this.gorev = gorev; this.sohbet = sohbet; this.bilgi = bilgi; this.cubuk = cubuk; this.hedefCubugu = hedefCubugu; this.ganimetPencere = ganimetPencere; this.beceriler = Array.isArray(bec) ? bec : [];
    this.pencereler = { durum, beceri, envanter: env, magaza, depo };
    this.b.kok.classList.add('orijinal-arayuz');

    this.hpbarKur(); this.gorevKur(); this.durumKur(); this.beceriKur(); this.envanterKur(); this.sohbetKur(); this.bilgiKur(); this.cubukKur(); this.magazaKur(); this.depoKur(); this.hedefKur(); this.ganimetKur();
    this.b.kok.append(this.hpbar.el, this.sohbet.el, this.bilgi.el, this.cubuk.el, this.hedefCubugu.el, this.ganimetPencere.el, this.gorev.el, durum.el, beceri.el, env.el, magaza.el, depo.el);
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
    this.genel = new GenelPencereler({ kok: this.b.kok, altBos: () => this.gorev.boyut[1] * Math.min(1, innerWidth / (this.gorev.boyut[0] + 4)) + 14, mesaj: (m) => this.b.mesaj(m) });
    this.genel.davranis.set('re_el_clan_window', (p) => {
      this.sekmeSeridi(p, 'klan');
      // Pencere tasarım örnek verisiyle (Msoft_1098…) geliyor: örnek satırlar ve açılır kutular gizlenir; klan yok (sunucu yok)
      p.gizleDesen(/^(group_notice|group_memo|group_purge|grp_member_list_[0-4])$/);
      p.metin('text_clan_name', 'No Clan'); p.metin('text_clan_grade', '-'); p.metin('text_clan_duty', '-');
      p.metin('text_clan_member_count', 'Total users: 0'); p.metin('text_current_member_count', 'Current Connections: 0 users');
    });
    this.genel.davranis.set('re_el_page_friend', (p) => { this.sekmeSeridi(p, 'dost'); this.dostBagla(p); });
    this.genel.davranis.set('re_exitmenu', (p, kapat) => {
      p.tikla.set('btn_exit', () => { this.b.mesaj('Close this browser tab to leave the game.'); kapat(); });
      p.tikla.set('btn_option', () => { kapat(); void this.genel.ac('re_new_looting_option'); });
      p.tikla.set('btn_cancel', kapat);
    });
    const topAyari = { doku: 'co_show_icon', w: 512, h: 512, uv: [0.678, 0.178, 0.711, 0.213] as [number, number, number, number] };
    this.sohbetSerbest = new SerbestPencere(this.sohbet, { anahtar: 'ke_pencere_sohbet', xBolme: 300, yBolme: 60, enCokDw: 700, enCokDh: 400, top: topAyari }, () => this.gorevYerlestir());
    this.bilgiSerbest = new SerbestPencere(this.bilgi, { anahtar: 'ke_pencere_bilgi', xBolme: 150, yBolme: 60, enCokDw: 600, enCokDh: 400, top: topAyari }, () => this.gorevYerlestir());
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
    const genelTus = GENEL_TUSLAR[kod]; if (genelTus) { void this.genel.degistir(genelTus); return true; }
    if (kod === 'Escape' && this.genel.enUsttekiniKapat()) return true;
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
    this.sohbetSerbest?.olcek(hol); this.bilgiSerbest?.olcek(hol);
    if (!this.sohbetSerbest?.konumuUygula()) { this.sohbet.el.style.left = '0px'; this.sohbet.el.style.top = `${ust - this.sohbet.boyut[1] * hol}px`; }
    if (!this.bilgiSerbest?.konumuUygula()) { this.bilgi.el.style.left = `${innerWidth - bw * hol}px`; this.bilgi.el.style.top = `${ust - this.bilgi.boyut[1] * hol}px`; }
    // Skill çubuğu: sohbet ile bilgi penceresinin ortasında (pencere kutusu -10,-9'dan başlar; yalnızca yatay çubuk görünür)
    const orta = (sw * hol + innerWidth - bw * hol) / 2;
    let kayit: number[] | null = null;
    try { kayit = JSON.parse(localStorage.getItem(this.cubukDikey ? 'ke_skillcubugu_konum_dikey' : 'ke_skillcubugu_konum_yatay') ?? 'null'); } catch { /* kayıt yok */ }
    if (kayit && kayit.length === 2) { // kullanıcının taşıdığı konum (ekran içinde tutulur)
      const w = this.cubukKutu();
      this.cubuk.el.style.left = `${Math.max(0, Math.min(innerWidth - w[0], kayit[0]))}px`; this.cubuk.el.style.top = `${Math.max(0, Math.min(innerHeight - w[1], kayit[1]))}px`;
    } else if (this.cubukDikey) { // ekranın solunda, dikey ortada (dikey grup pencere kutusunda +10,+9 kayık)
      this.cubuk.el.style.left = `${14 * hol}px`;
      this.cubuk.el.style.top = `${Math.max(40, (innerHeight - 390 * hol) / 2 - 40 * hol) + 9 * hol}px`;
    } else {
      this.cubuk.el.style.left = `${Math.max(sw * hol, orta - (cw * hol) / 2 + 10 * hol)}px`;
      this.cubuk.el.style.top = `${ust - 62 * hol}px`;
    }
    // Hedef çerçevesi: üstte ortada
    this.hedefCubugu.olcekAyarla(hol);
    this.hedefCubugu.el.style.left = `${Math.max(350 * hol, (innerWidth - 353 * hol) / 2)}px`; this.hedefCubugu.el.style.top = `${4 * hol}px`;
  }

  // ---------------------------------------------------------------- ganimet penceresi (re_droppeditem)
  private ganimetKur(): void {
    const g = this.ganimetPencere;
    g.el.style.display = 'none'; g.el.style.zIndex = '6';
    // Dört kareli ganimet penceresi: üç sütundan yalnızca ilki (0-3) kalır
    g.gizleDesen(/^(img_([4-9]|1[01])|[4-9]|1[01])$/); g.el.style.width = '55px';
    g.el.addEventListener('click', (ev) => {
      const el = (ev.target as HTMLElement).closest('.ui-t9') as HTMLElement | null; const k = this.ganimetKutusu; if (!el || !k) return;
      const i = Number(el.dataset.id);
      const altinVar = k.altin > 0;
      if (altinVar && i === 0) this.b.ganimetAl(k, 'altin');
      else if (k.esyalar[i - (altinVar ? 1 : 0)]) this.b.ganimetAl(k, i - (altinVar ? 1 : 0));
    });
    // Sandık değişince (açılış/kapanış/eşya alma) hud bu kancayı çağırır.
    this.ganimetPencere.el.dataset.hazir = '1';
  }
  /** Ganimet sandığını gösterir/gizler. */
  ganimetGoster(k: GanimetKutusu | null): void {
    this.ganimetKutusu = k; this.ganimetImza = '';
    const g = this.ganimetPencere;
    g.el.style.display = k ? '' : 'none';
    if (k) { g.el.style.left = `${Math.max(0, (innerWidth - 55) / 2 + 190)}px`; g.el.style.top = `${Math.max(60, innerHeight * 0.3)}px`; }
  }
  private ganimetCiz(): void {
    const k = this.ganimetKutusu; if (!k) return;
    const g = this.ganimetPencere;
    const imza = `${k.altin}|${k.esyalar.map((e) => e.no).join(',')}`;
    if (imza === this.ganimetImza) return;
    this.ganimetImza = imza;
    const altinVar = k.altin > 0;
    for (let i = 0; i < 4; i++) {
      const alan = g.alan(String(i)); if (!alan) continue;
      const e = altinVar ? (i === 0 ? null : k.esyalar[i - 1]) : k.esyalar[i];
      const noah = altinVar && i === 0;
      alan.style.backgroundImage = noah ? 'radial-gradient(circle at 35% 30%, #fff2a8, #d4a640 55%, #7a5a14)' : e?.simge ? `url(${e.simge})` : '';
      alan.style.backgroundSize = noah ? '60% 60%' : ESYA_SIMGE; alan.style.backgroundPosition = noah ? 'center' : '0 0';
      alan.style.cursor = noah || e ? 'pointer' : 'default';
      alan.onmouseenter = e ? (ev) => this.b.ipucuGoster(e, ev) : null; alan.onmouseleave = () => this.b.ipucuGizle();
      g.metin(String(i), noah ? k.altin.toLocaleString('en-US') : '');
    }
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
      el.style.backgroundImage = e?.simge ? `url(${e.simge})` : ''; el.style.backgroundSize = ESYA_SIMGE; el.style.backgroundPosition = '0 0';
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
      alan.style.backgroundSize = ESYA_SIMGE; alan.style.backgroundPosition = '0 0';
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
    c.gizleDesen(/^(btn_open|btn_close|img_front2)$/);
    // Zemin resmi iki ok plakası çiziyor: ikincisi (kilit satırı) gizlenir, yerine gerçek kilit düğmesi görünür
    for (const e of c.el.querySelectorAll<HTMLElement>('.ui-t4')) if (e.style.top === '349px' && e.style.left === '2px') e.style.display = 'none';
    for (const id of ['btn_up', 'btn_down']) for (const e of c.bul(id)) for (const dd of e.querySelectorAll<HTMLElement>('.ui-durum')) dd.style.opacity = '0'; // oklar zemin resminde çizili; düğme yalnızca tıklama alanı
    c.tikla.set('btn_up', () => this.cubukSayfaDegistir(-1)); c.tikla.set('btn_down', () => this.cubukSayfaDegistir(1));
    c.el.style.overflow = 'visible'; c.el.style.zIndex = '5'; c.el.style.pointerEvents = 'none';
    try { this.cubukDikey = localStorage.getItem('ke_skillcubugu_yon') !== 'yatay'; } catch { /* kayıt yok */ }
    try { this.cubukKilitli = localStorage.getItem('ke_skillcubugu_kilit') === '1'; } catch { /* kayıt yok */ }
    c.tikla.set('btn_lock', () => { this.cubukKilitli = !this.cubukKilitli; try { localStorage.setItem('ke_skillcubugu_kilit', this.cubukKilitli ? '1' : '0'); } catch { /* depolama kapalı */ } this.cubukKilitGoster(); });
    // Üstteki top: basılı tutup sürükleyince çubuk taşınır (kilitliyse taşınmaz); çift tıklama yönü (dikey/yatay) değiştirir
    for (const top of c.bul('btn_change')) {
      top.style.touchAction = 'none';
      top.addEventListener('pointerdown', (ev) => {
        if (this.cubukKilitli || ev.button !== 0) return;
        const r = c.el.getBoundingClientRect(); const dx = ev.clientX - r.left, dy = ev.clientY - r.top;
        top.setPointerCapture(ev.pointerId);
        const tasi = (e2: PointerEvent) => { const w = this.cubukKutu(); c.el.style.left = `${Math.max(0, Math.min(innerWidth - w[0], e2.clientX - dx))}px`; c.el.style.top = `${Math.max(0, Math.min(innerHeight - w[1], e2.clientY - dy))}px`; };
        const bitir = () => { top.removeEventListener('pointermove', tasi); top.removeEventListener('pointerup', bitir); try { localStorage.setItem(this.cubukDikey ? 'ke_skillcubugu_konum_dikey' : 'ke_skillcubugu_konum_yatay', JSON.stringify([parseFloat(c.el.style.left), parseFloat(c.el.style.top)])); } catch { /* depolama kapalı */ } };
        top.addEventListener('pointermove', tasi); top.addEventListener('pointerup', bitir);
      });
      top.addEventListener('dblclick', () => { this.cubukDikey = !this.cubukDikey; try { localStorage.setItem('ke_skillcubugu_yon', this.cubukDikey ? 'dikey' : 'yatay'); } catch { /* depolama kapalı */ } this.cubukYonUygula(); this.gorevYerlestir(); });
    }
    this.cubukKilitGoster();
    this.cubukYonUygula(); this.cubukSayfaDegistir(0);
    try { const k = JSON.parse(localStorage.getItem('ke_skillcubugu') ?? 'null'); if (Array.isArray(k)) this.cubukBeceri = k.slice(0, 64).map((x) => (typeof x === 'number' ? x : null)); while (this.cubukBeceri.length < 64) this.cubukBeceri.push(null); } catch { /* kayıt yok */ }
    if (!this.cubukBeceri.some((x) => x !== null)) this.cubukBeceri = [201001, 201002, 201003, 201005, 201007, 201009, null, null, ...new Array(56).fill(null)]; // ilk açılışta temel skill'ler sırayla
    for (const alan of this.cubukYuvalari()) {
      const i = this.cubukSira(alan);
      alan.style.overflow = 'hidden';
      const bek = document.createElement('div');
      Object.assign(bek.style, { position: 'absolute', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', color: '#fff', font: 'bold 14px sans-serif', pointerEvents: 'none' });
      bek.className = 'cubuk-bekleme'; alan.appendChild(bek);
      alan.addEventListener('click', () => this.cubukKullan(i));
      alan.addEventListener('contextmenu', (e) => { e.preventDefault(); this.cubukBeceri[this.cubukSayfa * 8 + i] = null; this.cubukKaydet(); });
      alan.addEventListener('dragover', (e) => e.preventDefault());
      alan.addEventListener('drop', (e) => {
        e.preventDefault();
        const no = Number(e.dataTransfer?.getData('text/plain'));
        if (this.beceriler.some((b) => b.no === no)) { this.cubukBeceri[this.cubukSayfa * 8 + i] = no; this.cubukKaydet(); }
      });
    }
  }
  /** Çubuktaki 16 yuva: yatay 10..17, dikey 0..7 (orijinal arayüzde iki ayrı grup). */
  private cubukYuvalari(): HTMLElement[] {
    const yuva = (id: string) => this.cubuk.bul(id).filter((e) => e.classList.contains('ui-t9'));
    return [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [...yuva(String(10 + i)), ...yuva(String(i))]);
  }
  private cubukSira(alan: HTMLElement): number { const n = Number(alan.dataset.id); return n >= 10 ? n - 10 : n; }
  private cubukYonUygula(): void {
    this.cubuk.goster('Hotkey_vertical', this.cubukDikey); this.cubuk.goster('Hotkey_Horizontal', !this.cubukDikey);
    this.cubuk.el.style.height = this.cubukDikey ? '402px' : '70px';
  }
  /** Çubuğun ekrandaki (ölçekli) boyutu. */
  private cubukKutu(): [number, number] { const o = this.cubuk.olcek; return this.cubukDikey ? [74 * o, 393 * o] : [356 * o, 60 * o]; }
  private cubukSayfaDegistir(d: number): void { this.cubukSayfa = (this.cubukSayfa + d + 8) % 8; this.cubuk.metin('strpage0', this.cubukSayfa + 1); this.cubuk.metin('strpage1', this.cubukSayfa + 1); }
  private cubukKilitGoster(): void { for (const e of this.cubuk.bul('btn_lock')) { e.style.opacity = this.cubukKilitli ? '1' : '0.55'; e.title = this.cubukKilitli ? 'Locked: the bar cannot be moved' : 'Unlocked: drag the ball to move the bar'; } }
  private cubukKaydet(): void { try { localStorage.setItem('ke_skillcubugu', JSON.stringify(this.cubukBeceri)); } catch { /* depolama kapalı */ } }
  private cubukKullan(i: number): void { const no = this.cubukBeceri[this.cubukSayfa * 8 + i]; if (no !== null && no !== undefined) this.b.beceriKullan(no); }
  private cubukCiz(): void {
    const o = this.b.oyuncu, simdi = performance.now() / 1000;
    for (const alan of this.cubukYuvalari()) {
      const i = this.cubukSira(alan);
      const no = this.cubukBeceri[this.cubukSayfa * 8 + i], b = this.beceriler.find((x) => x.no === no);
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
    p.el.style.zIndex = '1'; this.sohbet.el.style.zIndex = '1'; // pencerelerin (z ≥ 11) altında kalsın
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
    g.gizleDesen(/^(base_menu|base_TaskBar|btn_option[12]|btn_uishow|btn_change|btn_close|btn_disband|btn_trade|btn_rank|img_backboard|btn_seed|btn_powerup|btn_question|btn_menu)/);
    g.tikla.set('btn_inventory', () => this.degistir('envanter'));
    g.tikla.set('btn_character', () => this.degistir('durum'));
    g.tikla.set('btn_skill', () => this.degistir('beceri'));
    g.tikla.set('btn_camera', () => this.b.kamera.arkayaDon());
    for (const [id, pencere] of Object.entries(GOREV_PENCERELERI)) g.tikla.set(id, () => { void this.genel.degistir(pencere); });
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
  // ---------------------------------------------------------------- Character / Clan / Friends sekmeleri
  /** Pencerenin üstüne (nick satırının üstüne) Character / Clan / Friends sekme şeridi koyar. */
  private sekmeSeridi(p: UiPencere, aktif: 'durum' | 'klan' | 'dost'): void {
    const sirit = document.createElement('div');
    Object.assign(sirit.style, { position: 'absolute', left: '0', top: '-24px', display: 'flex', gap: '2px', zIndex: '3' });
    const adlar: [typeof aktif, string][] = [['durum', 'Character'], ['klan', 'Clan'], ['dost', 'Friends']];
    for (const [kod, yazi] of adlar) {
      const b = document.createElement('div'); b.textContent = yazi;
      Object.assign(b.style, { width: '92px', height: '22px', lineHeight: '20px', textAlign: 'center', font: 'bold 12px Segoe UI, Tahoma, sans-serif', color: kod === aktif ? '#fff2b8' : '#b8a36a', cursor: 'pointer', border: '1px solid #8a7340', borderRadius: '3px 3px 0 0', background: kod === aktif ? 'linear-gradient(#4a4230,#2a2418)' : 'linear-gradient(#262a35,#12151c)', boxSizing: 'border-box', textShadow: '0 1px 1px #000' });
      b.addEventListener('click', () => { if (kod !== aktif) void this.sekmeGit(kod, p); });
      sirit.appendChild(b);
    }
    p.el.appendChild(sirit);
  }
  private static readonly SEKME_PENCERE = { klan: 're_el_clan_window', dost: 're_el_page_friend' } as const;
  /** Sekme değiştirir: yeni pencere aynı yerde açılır, eskisi kapanır. */
  private async sekmeGit(hedef: 'durum' | 'klan' | 'dost', kaynak: UiPencere): Promise<void> {
    const sol = kaynak.el.style.left, ust = kaynak.el.style.top, ol = kaynak.olcek;
    let yeni: UiPencere | undefined;
    if (hedef === 'durum') { this.ac('durum', true); yeni = this.pencereler.durum; }
    else { const ad = OyunArayuzu.SEKME_PENCERE[hedef]; if (!(await this.genel.ac(ad))) return; yeni = this.genel.pencere(ad); }
    if (yeni) { yeni.olcekAyarla(ol); yeni.el.style.left = sol; yeni.el.style.top = ust; }
    if (kaynak === this.pencereler.durum) this.ac('durum', false); else this.genel.kapat(kaynak.ad);
  }

  // ---------------------------------------------------------------- dost listesi (re_el_page_friend)
  /** Dost listesi şimdilik yereldir (sunucu yok): ad + durum. Renk: partide kırmızı, çevrimiçi yeşil, çevrimdışı gri. */
  private dostlar: { ad: string; durum: 'parti' | 'cevrimici' | 'cevrimdisi' }[] = [];
  private dostSecili = -1;
  private dostBagla(p: UiPencere): void {
    try { const k = JSON.parse(localStorage.getItem('ke_dostlar') ?? '[]'); if (Array.isArray(k)) this.dostlar = k; } catch { /* kayıt yok */ }
    const RENK = { parti: '#ff5a5a', cevrimici: '#5adf5a', cevrimdisi: '#9a9a9a' } as const;
    // Açıklama satırları (Green/Blue/Grey) kullanıcının renk düzenine göre
    for (const el of p.el.querySelectorAll<HTMLElement>('.ui-yazi')) {
      const sp = el.querySelector('span'); const m = sp?.textContent ?? '';
      if (m.startsWith('Green')) el.style.color = RENK.cevrimici;
      else if (m.startsWith('Blue') && sp) { sp.textContent = 'Red : In a Party'; el.style.color = RENK.parti; }
      else if (m.startsWith('Grey')) el.style.color = RENK.cevrimdisi;
    }
    const ciz = () => {
      for (let i = 0; i < 11; i++) {
        const satir = p.alan(`base_friend${i}`); if (!satir) continue;
        const f = this.dostlar[i];
        satir.style.pointerEvents = 'auto'; satir.style.cursor = f ? 'pointer' : 'default';
        satir.style.background = i === this.dostSecili && f ? '#ffffff22' : '';
        satir.replaceChildren();
        if (f) { const t = document.createElement('span'); t.textContent = f.ad; Object.assign(t.style, { position: 'absolute', left: '6px', top: '1px', font: 'bold 12px Segoe UI, Tahoma, sans-serif', color: RENK[f.durum], textShadow: '0 1px 1px #000' }); satir.appendChild(t); }
        satir.onclick = () => { this.dostSecili = i; ciz(); };
      }
    };
    const kaydet = () => { try { localStorage.setItem('ke_dostlar', JSON.stringify(this.dostlar)); } catch { /* depolama kapalı */ } };
    p.tikla.set('btn_add', () => {
      const ad = (prompt('Friend name to add:') ?? '').trim().slice(0, 20);
      if (!ad || this.dostlar.length >= 11 || this.dostlar.some((f) => f.ad.toLowerCase() === ad.toLowerCase())) return;
      this.dostlar.push({ ad, durum: 'cevrimdisi' }); kaydet(); ciz(); // sunucu olmadığı için herkes çevrimdışı görünür
    });
    p.tikla.set('Btn_Delete', () => { if (this.dostSecili >= 0 && this.dostlar[this.dostSecili]) { this.dostlar.splice(this.dostSecili, 1); this.dostSecili = -1; kaydet(); ciz(); } });
    p.tikla.set('btn_refresh', ciz);
    ciz();
  }

  private durumKur(): void {
    const p = this.pencereler.durum;
    this.sekmeSeridi(p, 'durum');
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
      el.style.backgroundSize = ESYA_SIMGE; el.style.backgroundPosition = '0 0';
      el.onmouseenter = e ? (ev) => this.b.ipucuGoster(e, ev) : null;
      el.onmouseleave = () => this.b.ipucuGizle();
      el.onclick = tikla ?? null;
    };
    // Mağaza açıkken çanta eşyasına tıklamak onu NPC'ye satar; değilse kuşanır
    this.canta().forEach((el, i) => yuvaCiz(el, o.envanter[i] ?? null, o.envanter[i] ? () => (this.acik.has('magaza') ? this.b.magazaSat(i) : this.b.esyaKusan(i)) : undefined));
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
    this.hedefCiz(); this.ganimetCiz();
    if (this.acik.has('magaza')) this.magazaCiz();
    if (this.acik.has('depo')) this.depoCiz();
    if (this.acik.has('envanter')) { this.envanterCiz(); this.onizleme?.ciz(dt, this.b.oyuncu.ekipman[6]?.no ?? 0, this.b.oyuncu.ekipman[8]?.no ?? 0, this.b.oyuncu.ekipman); }
  }
}
