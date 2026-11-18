import * as THREE from 'three';
// Orijinal oyun arayüzünün (re_el_* pencereleri) oyun verisine bağlanması.
//   U: karakter durumu (re_el_page_state) · K: skill (re_el_skill) · I: envanter (re_el_inventory)
//   Üstte HP/MP/EXP çubuğu (re_el_hpbar), altta görev çubuğu (re_el_taskbar_main).
// Pencere düzenleri ve dokular araclar/arayuz ile oyunun kendi dosyalarından çıkarılır (docs/formatlar/uif.md).
import { GenelPencereler } from './genelPencereler';
import { SerbestPencere } from './serbestPencere';
import { UiPencere, arayuzOlcegi } from './orijinal';
import { KarakterOnizleme } from './karakterOnizleme';
import type { GanimetKutusu, Oyuncu, YuvaKonumu } from '../oyun/varliklar';
import type { EsyaTanimi } from '../oyun/veri';
import { MagazaPenceresi } from './magazaPenceresi';
import { adetKutusu } from './adetKutusu';
import { yuvaSurukle } from './yuvaSurukle';
import { DiyalogPenceresi } from './diyalogPenceresi';
import { DuzDiyalog, type DuzSecenek } from './duzDiyalog';
import { diyalogVerisi } from '../oyun/diyalogVeri';
import { baskinStatlar, sinifMesleki, statRengiUygula, statRengiUygulaRenk, SEKME_SECILI_RENK } from './baskinStat';
import { tamirUcreti } from '../../../kopru/protokol/envanter.ts';
import { gerekenDeneyim, giyimEkipmani, kurallar } from '../oyun/veri';
import type { TakipKamerasi } from '../dunya/kamera';

export interface Beceri { /** yakın dövüş skill'inin VURUŞ animasyonu (skill_magic_1 iAct[0]); hazırlık süresi olan skill'lerde hazırlık animasyonu ayrı, vuruş bunla oynar */ vurusAnim?: number; /** yakın dövüş kombo animasyonları (orijinal iAct[0..2]); yalnız birden çok vuruşlu skill'lerde */ kombo?: number[]; /** yakın dövüş skill'inin silah hasarı yüzdesi (skill_magic_1) */ hasarYuzde?: number; /** skill sayfası: ulus × 1000 + meslek × 10 (2010 El Morad Warrior, 2020 Rogue, 2030 Mage, 2040 Priest; Karus 1010–1040) */ sayfa?: number; no: number; ad: string; aciklama: string; seviye: number; msp: number; simge: string | null; /** oyuncu iskeletindeki animasyon numarası (tablo iSelfAnimID1) */ anim?: number; /** fx.tbl numaraları: kendinde / hedefte / uçan efekt */ efektKendi?: number | null; efektHedef?: number | null; efektUcan?: number | null }

export interface ArayuzBaglami {
  kok: HTMLElement;
  oyuncu: Oyuncu;
  kamera: TakipKamerasi;
  esyaKusan: (i: number) => void;
  /** Sunucudan gelen görev durumları: [görev no, durum] (1 sürüyor, 2 tamamlandı, 3 teslim edilebilir…). */
  gorevler?: () => [number, number][];
  /** NPC diyaloğunda düğme seçildi (sunucuya gider) / diyalog kapatıldı. */
  /** Parti: üye listesi ve işlemler (sunucu WIZ_PARTY). */
  parti?: () => { uyeler: { id: number; ad: string; enCokCan: number; can: number; seviye: number; sinif: number; enCokMana: number; mana: number }[]; benimId: number };
  hedefOyuncu?: () => { ad: string; seviye: number; can: number; enCok: number } | null; partiSec?: (id: number) => void; partiAyril?: (id: number) => void; partiLider?: (id: number) => void; partiDagit?: () => void;
  /** Boş skill puanını bir ağaca ver (5–8). */
  skillPuaniVer?: (agac: number) => void;
  diyalogSec?: (sira: number) => void; diyalogKapandi?: () => void;
  /** Envanterde sürükle-bırak: kaynak yuvadaki eşyayı hedef yuvaya taşır/yer değiştirir. */
  esyaTasi: (kaynak: YuvaKonumu, hedef: YuvaKonumu) => void;
  ipucuGoster: (e: EsyaTanimi, ev: MouseEvent, satin?: boolean, tamir?: number) => void;
  /** Tamir modunda tıklanan eşyayı tamir ettirir; açık mağaza tamirci NPC'ye mi ait? */
  tamirEt?: (k: YuvaKonumu) => void; tamirmi?: () => boolean;
  ipucuGizle: () => void;
  mesaj: (m: string) => void;
  /** Yüklü haritanın adı ve kenar uzunluğu (m): mini harita için. */
  haritaBilgi: () => { ad: string; genislik: number };
  /** Haritadaki dost NPC'ler (mini harita işaretleri ve NPC listesi). */
  npcler: () => { ad: string; x: number; y: number }[];
  /** Statü puanı harcandığında oyun kuralları (en çok can/mana vb.) güncellensin. */
  statDegisti: () => void;
  /** Sunucu modunda stat harcama/sıfırlama sunucuda yapılır (true = ele alındı). `ad`: str | sta | dex | int | reset. */
  statSunucu?: (ad: string) => boolean;
  /** Eşyayı yok et (çöp kutusu, onaydan sonra). Sunucu modunda sunucuya gider. */
  esyaAt?: (k: YuvaKonumu) => void;
  /** Sunucu modunda banka işlemi sunucuya gider (true = ele alındı; sonuç sunucudan gelince uygulanır). */
  /** Banka işlemleri (sunucu modunda true döner = işlem sunucuya gitti). `hedef` verilirse eşya o yuvaya konur (sürükle-bırak); yoksa ilk boş yuvaya. */
  bankaIslem?: (i: { tur: 'esya-yatir'; canta: number; hedef?: number; adet?: number } | { tur: 'esya-cek'; banka: number; hedef?: number; adet?: number } | { tur: 'banka-ici'; kaynak: number; hedef: number } | { tur: 'canta-ici'; kaynak: number; hedef: number } | { tur: 'altin-yatir'; miktar?: number } | { tur: 'altin-cek'; miktar?: number }) => boolean;
  /** Town komutu: Moradon'daki şehir noktasına ışınlan. */
  sehreDon: () => void;
  /** Oyuncu animasyonu numarasını oynat (selamlama, savaş çığlığı). */
  emote: (animNo: number) => void;
  /** Seçili oyuncuya parti daveti gönder (görev çubuğundaki Party düğmesi). */
  partiDavet: () => void;
  /** Otur / kalk (görev çubuğu düğmesi ve C tuşu). */
  otur: () => void;
  /** Yürüme ↔ koşma geçişi (görev çubuğu düğmesi ve R tuşu). */
  yuruKos: () => void;
  /** Ekipman yuvasındaki eşyayı çantaya al. */
  esyaCikar: (yuva: number) => void;
  /** Ganimet sandığından altın/eşya al (main.ts → hud.ganimetAl). */
  ganimetAl: (k: GanimetKutusu, secim: 'altin' | number) => void;
  /** Sunucu modunda sohbet mesajı sunucuya gider (true = ele alındı; false = yerel yankı). `mod`: normal | shout | party | clan. */
  sohbetGonder?: (mod: string, mesaj: string) => boolean;
  /** NPC'ye çantadaki eşyayı sat (çanta yuvası). */
  magazaSat: (yuva: number, adet?: number) => void;
  /** NPC mağazasından eşya satın al. */
  magazaSatinAl: (e: EsyaTanimi) => void;
  /** Skill kullan (skill numarası). */
  beceriKullan: (no: number) => void;
  /** Görev çubuğu simgeleri için anlık durum. */
  durum: () => { oturuyor: boolean; kosuyor: boolean };
}

/** Eşya simgeleri 64×64 dokunun sol üst 45×45'ine çizilir; yuvayı tam doldurmak için büyütülür. */
/** Kısayol tuşu → pencere (P/F/L/N istek üzerine eklendi; orijinal kaynakta yalnız M/H/F10 pencere tuşudur, bkz. tus()). */
const GENEL_TUSLAR: Record<string, string> = { KeyP: 're_el_party', KeyF: 're_el_page_friend', KeyL: 're_el_clan_window', KeyN: 're_el_notice', };
/** Görev çubuğu düğmesi → orijinal pencere (eşleşme pencerenin metinlerinden tahmin edildi). */
const GOREV_PENCERELERI: Record<string, string> = {
  btn_map: 're_minimap', btn_exit: 're_exitmenu', btn_command: 're_el_cmdlist', btn_invite: 're_el_party', btn_option: 're_el_various_frame',
  btn_menu: 're_minimenu', btn_question: 're_seed_helper', btn_rank: 're_el_dailyoverallrank', btn_trade: 're_el_personaltrade', btn_powerup: 're_powerupstore',
};
/** Sohbette sistem iletilerinin rengi (oyundaki ### ... ### satırları sarı). */
/** Bilgi penceresi arka planı sohbet penceresiyle aynı saydamlıkta. */
const ARKA_PLAN_SAYDAMLIK = 0.55;
/** Oyundaki skill'lerin en yüksek seviyesi (temel sayfada seviye, ağaçlarda ağaç puanı): 70. */
export const BECERI_EN_YUKSEK = 70;
const SISTEM_SARI = '#e8e84a';
const ESYA_SIMGE = '142.22% 142.22%';
type Ad = 'durum' | 'beceri' | 'envanter' | 'magaza' | 'depo';

/** Eşyanın tamir ücreti (sunucu formülü); tamir gerekmiyorsa 0. */
function tamirUcretiHesapla(e: EsyaTanimi): number { const azami = e.dayanim ?? 0; return tamirUcreti(e.fiyat, azami, e.suru ?? azami); }

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
  private minimapCiz: (() => void) | null = null;
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
  private tumBeceriler: Beceri[] = [];
  private cubukSinif = 201;
  private seciliBeceri = 0;
  /** Sınıfın tüm skill'leri (çubuk/kullanım için) ve skill penceresindeki sekmeler: 0 temel, 1–3 ağaçlar, 4 Master; her sekme sayfalara bölünür. */
  private sinifBecerileri: Beceri[] = [];
  private sekmeBeceriler: Beceri[][] = [[], [], [], [], []];
  private sekmeRengiUygula: () => void = () => {};
  private beceriSekme = 0; private beceriSayfa = 0; private beceriYuvaSayisi = 6;
  /** Pasif skill (kullanılmaz, kendiliğinden etki eder: sunucu tablosunda tür 0 ve MP 0): skill ağacında yalnızca bilgi verir; çubuğa konmaz, basılmaz. */
  private pasifMi(no: number): boolean { const v = kurallar?.beceri[String(no)]; return !!v && v.tip === 0 && v.msp === 0; }
  private beceriBul(no: number): Beceri | undefined { return this.sinifBecerileri.find((x) => x.no === no) ?? this.tumBeceriler.find((x) => x.no === no); }
  /** Skill kullanılabilir mi: temel sayfada seviye, ağaçlarda o ağaca verilen puan yeter mi. */
  private beceriAcik(b: Beceri): boolean {
    const o = this.b.oyuncu, agac = (b.sayfa ?? 0) % 10;
    return agac >= 5 && agac <= 8 ? (o.skillPuanlari[agac] ?? 0) >= b.seviye : o.seviye >= b.seviye;
  }
  private fps = 60; private fpsSayac = 0;
  private sonEnvanterImza = '';

  constructor(b: ArayuzBaglami) { this.b = b; }

  async baslat(): Promise<void> {
    const [hp, gorev, durum, beceri, env, sohbet, bilgi, cubuk, magaza, depo, hedefCubugu, ganimetPencere, bec] = await Promise.all([
      UiPencere.yukle('re_el_hpbar'), UiPencere.yukle('re_el_taskbar_main'), UiPencere.yukle('re_el_page_state'),
      UiPencere.yukle('re_el_skill'), UiPencere.yukle('re_el_inventory'),
      UiPencere.yukle('el_chat_us'), UiPencere.yukle('re_el_information_box'), UiPencere.yukle('re_el_hotkey'), UiPencere.yukle('re_tradeinventory'), UiPencere.yukle('re_el_warehouse'), UiPencere.yukle('re_target_framebar'), UiPencere.yukle('re_droppeditem'),
      fetch('/beceri/beceriler.json').then((r) => r.json() as Promise<Beceri[]>).catch(() => [] as Beceri[]),
    ]);
    this.hpbar = hp; this.gorev = gorev; this.sohbet = sohbet; this.bilgi = bilgi; this.cubuk = cubuk; this.hedefCubugu = hedefCubugu; this.ganimetPencere = ganimetPencere; this.tumBeceriler = Array.isArray(bec) ? bec.filter((b: Beceri) => b.seviye <= BECERI_EN_YUKSEK && b.ad !== 'Dribble' && b.ad !== 'Shoot') : []; // oyunda skill'ler en çok 70'e kadar; üstündekiler kullanım dışı (veritabanında durur, gösterilmez) this.beceriler = this.tumBeceriler.filter((b) => b.sayfa === 2010);
    this.pencereler = { durum, beceri, envanter: env, magaza, depo };
    this.b.kok.classList.add('orijinal-arayuz');

    this.hpbarKur(); this.gorevKur(); this.durumKur(); this.beceriKur(); this.envanterKur(); this.sohbetKur(); this.bilgiKur(); this.cubukKur(); this.magazaKur(); this.depoKur(); this.hedefKur(); this.ganimetKur();
    this.b.kok.append(this.hpbar.el, this.sohbet.el, this.bilgi.el, this.cubuk.el, this.hedefCubugu.el, this.ganimetPencere.el, this.gorev.el, durum.el, beceri.el, env.el, magaza.el, depo.el);
    this.hpbar.el.style.left = '0px'; this.hpbar.el.style.top = '0px';
    // Skill ve envanter sağdan, aynı yerden açılır; durum penceresi soldan. Konum ve ölçek pencereYerlestir()'de.
    const yerles: [Ad, number][] = [['durum', -150], ['beceri', 150], ['envanter', 150], ['magaza', -150], ['depo', 150]]; // banka sağdan açılır
    for (const [ad, kay] of yerles) {
      const p = this.pencereler[ad];
      p.el.style.display = 'none';
      // 2. kayarak açılma/kapanma (stil.css: .ui-pencere.kayan / .kapali)
      p.el.classList.add('kayan', 'kapali'); p.el.style.setProperty('--kay', `${kay}px`);
      p.surukle();
      p.el.addEventListener('pointerdown', () => { p.el.style.zIndex = String(++this.z); });
    }
    this.genel = new GenelPencereler({ kok: this.b.kok, altBos: () => this.gorev.boyut[1] * this.gorevOlcegi() + 14, mesaj: (m) => this.b.mesaj(m), acilirken: (ad) => { if (ad === 're_el_cmdlist') for (const o of ['envanter', 'beceri'] as Ad[]) if (this.acik.has(o)) this.ac(o, false); } });
    this.genel.davranis.set('re_el_clan_window', (p) => {
      this.sekmeSeridi(p, 'klan');
      // Pencere tasarım örnek verisiyle (Msoft_1098…) geliyor: örnek satırlar ve açılır kutular gizlenir; klan yok (sunucu yok)
      p.gizleDesen(/^(group_notice|group_memo|group_purge|grp_member_list_[0-4])$/);
      p.metin('text_clan_name', 'No Clan'); p.metin('text_clan_grade', '-'); p.metin('text_clan_duty', '-');
      p.metin('text_clan_member_count', 'Total users: 0'); p.metin('text_current_member_count', 'Current Connections: 0 users');
    });
    // Mini harita (re_minimap): oyunun kendi mini harita resmi (Zones/<harita>.dxt → harita/<ad>/minimap.png), oyuncu noktası, koordinat ve yakınlaştırma
    this.genel.davranis.set('re_minimap', (p) => {
      p.gizleDesen(/^(Group_NpcList|Group_Battle|Group_Toggle|Group_Note|Group_WarMap|scroll_Alpah_line|btn_battle_[apn]|Btn_WarMap|btn_paper|Btn_globalmap|area_note)$/);
      const hb = this.b.haritaBilgi();
      p.metin('str_zoneid', 'Moradon:');
      const kap = p.alan('Img_MiniMap'); if (!kap) return;
      const kutu = document.createElement('div'); Object.assign(kutu.style, { position: 'absolute', inset: '0', overflow: 'hidden', background: '#000' });
      const harita = document.createElement('div'); Object.assign(harita.style, { position: 'absolute', backgroundImage: `url(/harita/${hb.ad}/minimap.png)`, backgroundSize: '100% 100%' });
      const nokta = document.createElement('div'); Object.assign(nokta.style, { position: 'absolute', width: '9px', height: '9px', marginLeft: '-5px', marginTop: '-5px', borderRadius: '50%', background: '#ffe84a', border: '1px solid #000', boxShadow: '0 0 4px #fff', zIndex: '2' });
      kutu.append(harita); kap.appendChild(kutu);
      // NPC işaretleri (camgöbeği) ve NPC listesi (btn_NpcListopen ile açılır): ad listesi haritadaki NPC'lerden, tekrarsız
      const npcler = this.b.npcler();
      const npcNoktalari = npcler.map(() => { const e = document.createElement('div'); Object.assign(e.style, { position: 'absolute', width: '5px', height: '5px', marginLeft: '-3px', marginTop: '-3px', borderRadius: '50%', background: '#4fe3ff', border: '1px solid #000', zIndex: '1' }); kutu.appendChild(e); return e; });
      kutu.appendChild(nokta);
      const adlar = [...new Set(npcler.map((n) => n.ad))];
      for (let i = 0; i < 12; i++) p.metin(`str_NpcName_${i}`, adlar[i] ?? '');
      p.tikla.set('btn_NpcListopen', () => p.goster('Group_NpcList', true));
      p.tikla.set('btn_Listminimize', () => p.gizle('Group_NpcList'));
      let yakin = 1;
      p.tikla.set('Btn_ZoomIn', () => { yakin = Math.min(4, yakin * 2); });
      p.tikla.set('Btn_ZoomOut', () => { yakin = Math.max(1, yakin / 2); });
      this.minimapCiz = () => {
        const o = this.b.oyuncu, w = kutu.clientWidth, h = kutu.clientHeight; if (!w) return;
        const px = o.konum.x / hb.genislik, py = 1 - o.konum.y / hb.genislik; // kuzey yukarıda (z büyüdükçe yukarı)
        const ox = yakin > 1 ? Math.min(0, Math.max(w - w * yakin, w / 2 - px * w * yakin)) : 0, oy = yakin > 1 ? Math.min(0, Math.max(h - h * yakin, h / 2 - py * h * yakin)) : 0;
        Object.assign(harita.style, { width: `${w * yakin}px`, height: `${h * yakin}px`, left: `${ox}px`, top: `${oy}px` });
        nokta.style.left = `${ox + px * w * yakin}px`; nokta.style.top = `${oy + py * h * yakin}px`;
        npcler.forEach((n, i) => { const e = npcNoktalari[i]; e.style.left = `${ox + (n.x / hb.genislik) * w * yakin}px`; e.style.top = `${oy + (1 - n.y / hb.genislik) * h * yakin}px`; });
        p.metin('Text_Position', `${Math.round(o.konum.x)} ${Math.round(o.konum.y)}`);
      };
    });
    this.genel.davranis.set('re_el_cmdlist', (p) => this.komutListesi(p));
    this.genel.acilista.set('re_el_cmdlist', (p) => this.komutListesi(p)); // her açılışta yeşil çerçeve Private ve PM üzerinde başlar
    this.genel.davranis.set('re_title_window', (p) => this.sekmeSeridi(p, 'baslik'));
    this.genel.davranis.set('re_el_page_quest', (p) => { this.sekmeSeridi(p, 'gorev'); this.gorevSayfasiKur(p); });
    this.genel.davranis.set('re_el_party', (p) => this.partiKur(p));
    this.genel.acilista.set('re_el_party', (p) => this.partiCiz(p));
    this.genel.acilista.set('re_el_page_quest', (p) => void this.gorevSayfasiDoldur(p));
    this.genel.davranis.set('re_el_page_friend', (p) => { this.sekmeSeridi(p, 'dost'); this.dostBagla(p); });
    this.genel.davranis.set('re_exitmenu', (p, kapat) => {
      p.tikla.set('btn_exit', () => { this.b.mesaj('Close this browser tab to leave the game.'); kapat(); });
      p.tikla.set('btn_option', () => { kapat(); void this.genel.ac('re_new_looting_option'); });
      p.tikla.set('btn_cancel', kapat);
    });
    const topAyari = { doku: 'co_show_icon', w: 512, h: 512, uv: [0.678, 0.178, 0.711, 0.213] as [number, number, number, number] };
    this.sohbetSerbest = new SerbestPencere(this.sohbet, { anahtar: 'ke_pencere_sohbet', xBolme: 300, yBolme: 60, enCokDw: 700, enCokDh: 400, top: topAyari, topSol: true, seritY: 122, tasi: { sol: 20, genislik: 76, yukseklik: 24 } }, () => this.gorevYerlestir());
    this.bilgiSerbest = new SerbestPencere(this.bilgi, { anahtar: 'ke_pencere_bilgi', xBolme: 150, yBolme: 60, enCokDw: 600, enCokDh: 400, top: topAyari, seritY: 116, seritSag: true, tasi: { sag: 20, genislik: 85, yukseklik: 22 } }, () => this.gorevYerlestir());
    this.pencereYerlestir(true); this.gorevYerlestir();
    // Skill çubuğunun resim dosyasındaki saydam sol boşluk piksel taramasıyla atılır; sonra yeniden yerleştirilir (çubuk ekranın sol kenarına tam yapışır).
    void this.cubuk.sinirKesinles().then((tamam) => { if (tamam) this.gorevYerlestir(); });
    addEventListener('resize', () => { this.pencereYerlestir(false); this.gorevYerlestir(); });
  }

  /**
   * Açılır pencereleri (durum, skill, envanter) ekrana sığdırır: görev çubuğunun üstünde kalacak şekilde ölçeği küçültür (en az 0,45),
   * ilk yerleşimde varsayılan konuma koyar, yeniden boyutlandırmada konumu ekran içinde tutar.
   */
  private pencereYerlestir(ilk: boolean): void {
    const altBos = this.gorev.boyut[1] * this.gorevOlcegi() + 14;
    for (const ad of ['durum', 'beceri', 'envanter', 'magaza', 'depo'] as Ad[]) {
      const p = this.pencereler[ad];
      // Pencere kutusundaki saydam boşluklar atılır: yalnızca görünen resim ekrana yaslanır (sinir()).
      const [sl, st, sr, sb] = p.sinir();
      const ol = Math.max(0.45, Math.min(arayuzOlcegi(), (innerWidth - 16) / (sr - sl), (innerHeight - altBos - 8) / (sb - st)));
      p.olcekAyarla(ol);
      const [l2, t2, r2, b2] = p.sinir();
      let x = ilk ? (ad === 'durum' || ad === 'magaza' ? -l2 * ol : innerWidth - r2 * ol) : parseFloat(p.el.style.left) || 0;
      let y = ilk ? (ad === 'durum' ? 110 : ad === 'magaza' ? 40 : ad === 'depo' ? 20 : 70) : parseFloat(p.el.style.top) || 0;
      x = Math.max(-l2 * ol, Math.min(x, innerWidth - r2 * ol)); y = Math.max(-t2 * ol, Math.min(y, innerHeight - altBos - b2 * ol));
      p.el.style.left = `${x}px`; p.el.style.top = `${y}px`;
    }
  }


  // ---------------------------------------------------------------- pencere yönetimi
  ac(ad: Ad, acik: boolean): void {
    const p = this.pencereler[ad]; if (!p) return;
    if (acik) {
      // Sağdan açılan pencereler (envanter, skill, Command) aynı yeri kullanır: biri açılınca öbürleri kapanır.
      if (ad === 'envanter' || ad === 'beceri') {
        this.genel?.kapat('re_el_cmdlist');
        for (const o of ['envanter', 'beceri'] as Ad[]) if (o !== ad && this.acik.has(o)) this.ac(o, false);
      }
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
    // Orijinal tuş tablosu (GameDef.h eKeyMap): M mini harita, H komut listesi, F10 yardım, PageUp/PageDown skill çubuğu sayfası
    if (kod === 'KeyM') { void this.genel.degistir('re_minimap'); return true; }
    if (kod === 'KeyH') { void this.genel.degistir('re_el_cmdlist'); return true; }
    if (kod === 'F10') { void this.genel.degistir('re_seed_helper'); return true; }
    if (kod === 'PageUp') { if (this.cubukSayfa > 0) this.cubukSayfaDegistir(-1); return true; }
    if (kod === 'PageDown') { if (this.cubukSayfa < 7) this.cubukSayfaDegistir(1); return true; }
    if (kod === 'Enter') { this.sohbetGiris?.focus(); return true; }
    const fSayfa = /^F([1-8])$/.exec(kod);
    if (fSayfa) { this.cubukSayfa = Number(fSayfa[1]) - 1; this.cubukSayfaDegistir(0); return true; }
    const rakam = /^Digit([1-8])$/.exec(kod);
    if (rakam) { this.cubukKullan(Number(rakam[1]) - 1); return true; }
    const genelTus = GENEL_TUSLAR[kod]; if (genelTus) { void this.genel.degistir(genelTus); return true; }
    if (kod === 'Escape' && this.magazaYeni?.acik) { this.magazaYeni.kapat(); return true; }
    if (kod === 'Escape' && this.duz?.acik) { this.duz.kapat(); return true; }
    if (kod === 'Escape' && this.diyalog?.acik) { this.diyalog.kapat(); return true; }
    if (kod === 'Escape' && this.genel.enUsttekiniKapat()) return true;
    if (kod === 'Escape' && this.acik.size) {
      const son = [...this.acik].sort((a, c) => Number(this.pencereler[a].el.style.zIndex) - Number(this.pencereler[c].el.style.zIndex)).pop()!;
      this.ac(son, false); return true;
    }
    return false;
  }

  /** Alttaki görev çubuğu diğer pencerelerden %25 büyük çizilir (kullanıcı isteği); ekrana sığmazsa küçülür. */
  private gorevOlcegi(): number { return Math.min(arayuzOlcegi() * 1.25, innerWidth / (this.gorev.boyut[0] + 4)); }
  private gorevYerlestir(): void {
    const ol = this.gorevOlcegi();
    const s = this.gorev.el.style;
    s.transformOrigin = '0 0'; s.transform = `scale(${ol})`;
    // Görev çubuğu ekranın ALT kenarına yapışır: pencere kutusundaki saydam alt boşluk sinir() ile hesaba katılır (resmin alt kenarı = ekran alt kenarı).
    this.gorev.olcek = ol; this.gorev.sinirTemizle();
    const [gsl, gst, gsr, gsb] = this.gorev.sinir();
    s.left = `${(innerWidth - (gsr - gsl) * ol) / 2 - gsl * ol}px`;
    s.top = `${innerHeight - gsb * ol}px`;
    const gorevUst = innerHeight - (gsb - gst) * ol; // görev çubuğu resminin üst kenarı (ekran koordinatı)
    // Sohbet (sol) ve bilgi/hasar penceresi (sağ) görev çubuğunun hemen üstünde; resimlerinin alt kenarı görev çubuğuna değmez.
    const ust = gorevUst - 3;
    // Dar ekranda üçü birden aynı oranda küçülür (sohbet | skill çubuğu | bilgi yan yana sığsın).
    const sw = this.sohbet.boyut[0], bw = this.bilgi.boyut[0], cw = 356;
    const hol = Math.min(arayuzOlcegi(), innerWidth / (sw + bw + cw + 24));
    for (const x of [this.sohbet, this.bilgi, this.cubuk, this.hpbar]) x.olcekAyarla(hol);
    this.sohbetSerbest?.olcek(hol); this.bilgiSerbest?.olcek(hol);
    this.sohbet.sinirTemizle(); this.bilgi.sinirTemizle();
    const yerles = (p: UiPencere, ser: SerbestPencere | null, sag: boolean): void => {
      if (ser?.konumuUygula()) return;
      const [l, t, r, b] = p.sinir();
      p.el.style.left = `${sag ? innerWidth - r * hol : -l * hol}px`;
      p.el.style.top = `${ust - b * hol}px`;
    };
    yerles(this.sohbet, this.sohbetSerbest, false); yerles(this.bilgi, this.bilgiSerbest, true);
    // Kayıtlı (kullanıcının taşıdığı) konumlar başka çözünürlükte çakışabilir: sohbet/bilgi birbirine ya da görev çubuğuna değiyorsa varsayılana dönerler.
    const kutu = (p: UiPencere) => { const [l, t, r, b] = p.sinir(), x = parseFloat(p.el.style.left) || 0, y = parseFloat(p.el.style.top) || 0; return { l: x + l * hol, t: y + t * hol, r: x + r * hol, b: y + b * hol }; };
    const kesisir = (x: { l: number; t: number; r: number; b: number }, y: { l: number; t: number; r: number; b: number }) => x.l < y.r - 1 && x.r > y.l + 1 && x.t < y.b - 1 && x.b > y.t + 1;
    const gk = { l: (innerWidth - (gsr - gsl) * ol) / 2, t: gorevUst, r: (innerWidth + (gsr - gsl) * ol) / 2, b: innerHeight };
    const sk = kutu(this.sohbet), bk = kutu(this.bilgi);
    if (kesisir(sk, gk) || kesisir(bk, gk) || kesisir(sk, bk)) {
      this.sohbetSerbest?.sifirla(); this.bilgiSerbest?.sifirla();
      for (const [p, sag] of [[this.sohbet, false], [this.bilgi, true]] as [UiPencere, boolean][]) { const [l, , r, b] = p.sinir(); p.el.style.left = `${sag ? innerWidth - r * hol : -l * hol}px`; p.el.style.top = `${ust - b * hol}px`; }
    }
    // Skill çubuğu: sohbet ile bilgi penceresinin ortasında (pencere kutusu -10,-9'dan başlar; yalnızca yatay çubuk görünür)
    const orta = (sw * hol + innerWidth - bw * hol) / 2;
    let kayit: number[] | null = null;
    try { kayit = JSON.parse(localStorage.getItem(this.cubukDikey ? 'ke_skillcubugu_konum_dikey' : 'ke_skillcubugu_konum_yatay') ?? 'null'); } catch { /* kayıt yok */ }
    if (kayit && kayit.length === 2) { // kullanıcının taşıdığı konum (ekran içinde tutulur)
      const w = this.cubukKutu();
      this.cubuk.el.style.left = `${Math.max(0, Math.min(innerWidth - w[0], kayit[0]))}px`; this.cubuk.el.style.top = `${Math.max(0, Math.min(innerHeight - w[1], kayit[1]))}px`;
    } else if (this.cubukDikey) { // ekranın solunda, dikey ortada (dikey grup pencere kutusunda +10,+9 kayık)
      this.cubuk.el.style.left = `${-this.cubuk.sinir()[0] * hol}px`; // görünen çubuk ekranın sol kenarına yaslanır
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
      if (i === k.altinSatiri) { if (k.altin > 0) this.b.ganimetAl(k, 'altin'); }
      else { const j = k.yerler.indexOf(i); if (j >= 0 && k.esyalar[j]) this.b.ganimetAl(k, j); } // satır sabit: eşya kendi satırından alınır
    });
    // Sandık değişince (açılış/kapanış/eşya alma) hud bu kancayı çağırır.
    this.ganimetPencere.el.dataset.hazir = '1';
  }
  /** Ganimet sandığını gösterir/gizler. */
  ganimetGoster(k: GanimetKutusu | null): void {
    this.ganimetKutusu = k; this.ganimetImza = '';
    const g = this.ganimetPencere;
    g.el.style.display = k ? '' : 'none';
    if (k) this.ganimetCiz(); // içerik pencere açılır açılmaz çizilir (bir kare sonra belirmesin)
    if (k) {
      // Pencere sandığın hemen yanında açılır: sandığın ekrandaki yeri hesaplanır, pencere sağına (sığmazsa soluna) dikey ortalı konur.
      const ol = arayuzOlcegi(); g.olcekAyarla(ol);
      const p = new THREE.Vector3(k.konum.x, this.b.oyuncu.grup.position.y + 0.4, -k.konum.y).project(this.b.kamera.kamera); // sandık yerde, oyuncuyla yaklaşık aynı yükseklikte
      const sx = (p.x * 0.5 + 0.5) * innerWidth, sy = (-p.y * 0.5 + 0.5) * innerHeight;
      const w = 55 * ol, sn = g.sinir(), h = (sn[3] - sn[1] || 160) * ol, bos = this.gorev.boyut[1] * this.gorevOlcegi() + 14;
      let sol = sx + 44 * ol; if (sol + w > innerWidth - 8) sol = sx - 44 * ol - w;
      g.el.style.left = `${Math.max(8, sol)}px`;
      g.el.style.top = `${Math.max(8, Math.min(sy - h / 2, innerHeight - bos - h)) - sn[1] * ol}px`;
    }
  }
  private ganimetCiz(): void {
    const k = this.ganimetKutusu; if (!k) return;
    const g = this.ganimetPencere;
    const imza = `${k.altin}|${k.altinSatiri}|${k.esyalar.map((e, j) => `${e.no}x${e.adet ?? 1}@${k.yerler[j]}`).join(',')}`;
    if (imza === this.ganimetImza) return;
    this.ganimetImza = imza;
    const altinKaldi = k.altin > 0;
    for (let i = 0; i < 4; i++) {
      const alan = g.alan(String(i)); if (!alan) continue;
      const j = k.yerler.indexOf(i), e = i === k.altinSatiri || j < 0 ? null : k.esyalar[j];
      const noah = i === k.altinSatiri && altinKaldi;
      alan.style.backgroundImage = noah ? 'url(/esya/noah.png)' : e?.simge ? `url(${e.simge})` : ''; // Noah simgesi oyunun eşya tablosundan (Coin, 90001000) alan.dataset.adet = (e?.adet ?? 1) > 1 ? String(e!.adet) : '';
      alan.style.backgroundSize = ESYA_SIMGE; alan.style.backgroundPosition = '0 0';
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
    // Referans görünüm: canavar adı kırmızı-somon ve büyük, altında yazısız parlak kırmızı can çubuğu.
    for (const e of h.bul('name')) { e.style.color = '#ff5a5a'; e.querySelectorAll<HTMLElement>('*').forEach((k) => { k.style.color = '#ff5a5a'; k.style.fontSize = '17px'; k.style.fontWeight = '600'; k.style.textShadow = '0 1px 2px #000'; }); }
  }
  private hedefAdi = '';
  /** Canavar adı çubuğun üstünde ortalanır ve kesilmez; çubuğun ≈1,6 katından uzunsa yazı tipi küçülür (en uzun ad: 35 karakter). */
  private hedefAdiSigdir(ad: string): void {
    for (const e of this.hedefCubugu.bul('name')) {
      e.style.overflow = 'visible'; e.style.whiteSpace = 'nowrap'; e.style.textAlign = 'center'; e.style.justifyContent = 'center';
      const ic = [e, ...Array.from(e.querySelectorAll<HTMLElement>('*'))];
      const sar = (px: number) => { for (const k of ic) { k.style.fontSize = `${px}px`; k.style.whiteSpace = 'nowrap'; k.style.overflow = 'visible'; k.style.textOverflow = 'clip'; } };
      const cubuk = this.hedefCubugu.bul('grpg_level_1')[0], genis = (cubuk?.offsetWidth || 179) * 1.6;
      let px = 17; sar(px);
      const span = e.querySelector('span') ?? e;
      for (let i = 0; i < 12 && span.scrollWidth > genis && px > 10; i++) { px -= 1; sar(px); }
      if (span.scrollWidth > genis) sar(Math.max(8, Math.floor(px * genis / span.scrollWidth)));
    }
    void ad;
  }
  private opHedef: { olu: boolean; tur: { ad: string; seviye: number }; can: number; enCok: number } | null = null;
  private hedefCubukHedef: unknown = null; private hedefCubukSon = 0; private hedefCubukOran = 1;
  private hedefCiz(): void {
    const h = this.hedefCubugu, hd0 = this.b.oyuncu.hedef, op = !hd0 ? this.b.hedefOyuncu?.() ?? null : null;
    // seçili başka oyuncu (PvP) de aynı çerçevede görünür; nesne kimliği sabit tutulur ki can çubuğunun 'geriden gelen' animasyonu çalışsın (her karede yeni nesne animasyonu sıfırlıyordu)
    if (op) { if (!this.opHedef || this.opHedef.tur.ad !== op.ad) this.opHedef = { olu: false, tur: { ad: op.ad, seviye: op.seviye }, can: op.can, enCok: op.enCok }; this.opHedef.can = op.can; this.opHedef.enCok = op.enCok; this.opHedef.tur.seviye = op.seviye; } else this.opHedef = null;
    const hd = hd0 ?? this.opHedef;
    if (!hd || hd.olu) { if (h.el.style.display !== 'none') h.el.style.display = 'none'; return; }
    h.el.style.display = '';
    // Seviye farkına göre renk çubuğu (grpg_level_0..3); eşikler tahmin: orijinal kural bilinmiyor
    const fark = hd.tur.seviye - this.b.oyuncu.seviye;
    const k = fark <= -5 ? 0 : fark <= 1 ? 1 : fark <= 5 ? 2 : 3;
    for (let i = 0; i < 4; i++) h.goster(`grpg_level_${i}`, i === k);
    h.metin('name', hd.tur.ad);
    if (this.hedefAdi !== hd.tur.ad) { this.hedefAdi = hd.tur.ad; this.hedefAdiSigdir(hd.tur.ad); }
    h.metin('Text_Health', ''); // referans görünüm: çubuğun üstünde yazı yok, can çubuğun doluluğundan izlenir
    // Can çubuğu: ön katman gerçek canı anında gösterir; arkadaki katman (orijinaldeki "geriden gelen") ~0,8 sn'de yavaşça akarak kaybolan canı gösterir.
    const oran = Math.max(0, hd.can / Math.max(1, hd.enCok)), simdi = performance.now(), dt = Math.min(0.1, (simdi - this.hedefCubukSon) / 1000); this.hedefCubukSon = simdi;
    if (this.hedefCubukHedef !== hd) { this.hedefCubukHedef = hd; this.hedefCubukOran = oran; }
    else if (this.hedefCubukOran > oran) this.hedefCubukOran = Math.max(oran, this.hedefCubukOran - Math.max(0.12, (this.hedefCubukOran - oran) * 0.9) * dt * 1.6); // beklemeden, orantılı + en az 0,12/sn hızla akar
    else this.hedefCubukOran = oran;
    for (let i = 0; i < 4; i++) { h.ilerleme(`grpg_level_${i}`, oran); h.ilerleme(`grpg_level_${i}:geri`, this.hedefCubukOran); }
  }

  // ---------------------------------------------------------------- banka (re_el_warehouse)
  /** Bankayı açar: üstte depo sayfası (6×4), altta çanta; yuvaya tıklayınca eşya öbür tarafa geçer. */
  depoAc(): void {
    this.npcPencereAcilis = performance.now();
    this.depoSayfa = 0; this.depoImza = ''; this.ac('depo', true);
    // Sağ kenara boşluksuz yaslanır (mağaza gibi), üstten 10 px; görev çubuğunun üstünde kalacak şekilde ölçeklenir.
    const p = this.pencereler.depo; p.olcekAyarla(1);
    const [sl, st, sr, sb] = p.sinir(), altBos = this.gorev.boyut[1] * this.gorevOlcegi() + 14;
    const ol = Math.max(0.4, Math.min(arayuzOlcegi(), (innerWidth - 16) / (sr - sl), (innerHeight - altBos - 14) / (sb - st)));
    p.olcekAyarla(ol); const [, t2, r2] = p.sinir();
    p.el.style.left = `${innerWidth - r2 * ol}px`; p.el.style.top = `${10 - t2 * ol}px`;
  }
  private depoUst(): HTMLElement[] { return this.pencereler.depo.tumAlanlar().filter((a) => a.offsetTop < 300 && /^\d+$/.test(a.dataset.id ?? '')).sort((a, c) => Number(a.dataset.id) - Number(c.dataset.id)); }
  private depoAlt(): HTMLElement[] { return this.pencereler.depo.tumAlanlar().filter((a) => a.offsetTop >= 340 && /^\d+$/.test(a.dataset.id ?? '')).sort((a, c) => Number(a.dataset.id) - Number(c.dataset.id)); }
  private depoKur(): void {
    const p = this.pencereler.depo, o = this.b.oyuncu;
    p.gizleDesen(/^(Edt_search|Btn_search)$/);
    for (const el of p.tumDugmeler()) if (/close|cancel/i.test(el.dataset.id ?? '')) p.tikla.set(el.dataset.id!, () => { this.ac('depo', false); }); // sağ üstteki çarpı dahil her kapatma düğmesi
    const sayfaDegistir = (d: number) => { this.depoSayfa = (this.depoSayfa + d + 8) % 8; this.depoImza = ''; };
    p.tikla.set('btn_page_up', () => sayfaDegistir(-1)); p.tikla.set('btn_page_down', () => sayfaDegistir(1));
    // Fare tekerleği (Mouse3 topu): aşağı çevirince sayfa 1→2→3…, yukarı çevirince 3→2→1 (her tık bir sayfa)
    p.el.addEventListener('wheel', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const yeni = Math.max(0, Math.min(7, this.depoSayfa + (ev.deltaY > 0 ? 1 : ev.deltaY < 0 ? -1 : 0)));
      if (yeni !== this.depoSayfa) { this.depoSayfa = yeni; this.depoImza = ''; }
    }, { passive: false });
    // Noah: çantadaki tüm Noah'yı yatır / depodakinin tamamını çek
    // Noah: kaç tane yatırılacağı / çekileceği sorulur (hepsini tek tıkla aktarmaz)
    const noahSor = (yatir: boolean) => {
      const toplam = yatir ? o.altin : o.depoAltin; if (toplam <= 0) { this.b.mesaj(yatir ? 'You have no Noah to deposit.' : 'There is no Noah in the warehouse.'); return; }
      adetKutusu(p.el, {
        ad: 'Noah', soru: yatir ? 'How much Noah do you want to deposit?' : 'How much Noah do you want to withdraw?', maks: toplam, onayYazisi: yatir ? 'Deposit' : 'Withdraw', birimFiyat: 0,
        onay: (miktar) => {
          if (this.b.bankaIslem?.({ tur: yatir ? 'altin-yatir' : 'altin-cek', miktar })) return;
          if (yatir) { o.depoAltin += miktar; o.altin -= miktar; } else { o.altin += miktar; o.depoAltin -= miktar; }
          this.b.mesaj(`${miktar.toLocaleString('en-US')} Noah ${yatir ? 'deposited' : 'withdrawn'}.`); this.depoImza = ''; this.sonEnvanterImza = '';
        },
      });
    };
    p.tikla.set('btn_gold', () => noahSor(true));
    p.tikla.set('btn_gold_warehouse', () => noahSor(false));
    // Yuva tıklamaları pencere düzeyinde ve tıklama anında çözülür (yuvalar pencere gizliyken konumlanmamış olur).
    // Yuvaların üzerindeki adet/fiyat yazı katmanları fare olaylarını yakalamasın: yuvanın alt kısmından da tutup sürüklenebilsin ve sağ tık çalışsın
    p.el.querySelectorAll<HTMLElement>('.ui-yazi').forEach((y) => { if (!y.closest('.ui-t1')) y.style.pointerEvents = 'none'; });
    // Yuva çözümü olay anında yapılır: { yer: 'depo' (sayfadaki sıra → genel yuva) | 'canta', i }
    const yuvaBul = (hedef: EventTarget | null): { yer: 'depo' | 'canta'; i: number } | null => {
      const el = (hedef as HTMLElement | null)?.closest('.ui-t9') as HTMLElement | null; if (!el) return null;
      const ust = this.depoUst().indexOf(el); if (ust >= 0) return { yer: 'depo', i: this.depoSayfa * 24 + ust };
      const alt = this.depoAlt().indexOf(el); return alt >= 0 ? { yer: 'canta', i: alt } : null;
    };
    type Yuva = { yer: 'depo' | 'canta'; i: number };
    const dolu = (x: Yuva) => (x.yer === 'depo' ? o.depo[x.i] : o.envanter[x.i]);
    /** Aynı eşyanın bankada (herhangi bir sayfada) bulunan yığını: sağ tıkta üstüne yığılır. */
    const bankadaAyniYigin = (e: EsyaTanimi) => (e.sayilabilir ? o.depo.findIndex((x) => !!x && x.no === e.no) : -1);
    /** Bulunulan sayfadaki ilk boş yuva; sayfa doluysa sayfaya en yakın boş yuva. */
    const bankaBosYuva = () => {
      const a = this.depoSayfa * 24, b = a + 23;
      for (let j = a; j <= b; j++) if (!o.depo[j]) return j;
      let en = -1, uzak = 1e9;
      for (let j = 0; j < o.depo.length; j++) if (!o.depo[j]) { const m = j < a ? a - j : j - b; if (m < uzak) { uzak = m; en = j; } }
      return en;
    };
    /** Seçilen adetle (yığınsa) işlemi uygular; yerel modda envanter/banka dizilerini kendisi günceller. */
    const aktar = (k: Yuva, hedef: number, n: number) => {
      const e = dolu(k)!;
      if (k.yer === 'canta') {
        if (this.b.bankaIslem?.({ tur: 'esya-yatir', canta: k.i, hedef, adet: n })) return;
        const m = o.depo[hedef]; if (m && e.sayilabilir && m.no === e.no) m.adet = (m.adet ?? 1) + n; else o.depo[hedef] = e.sayilabilir ? { ...e, adet: n } : e;
        const kalan = (e.adet ?? 1) - n; o.envanter[k.i] = kalan > 0 && e.sayilabilir ? { ...e, adet: kalan } : null;
      } else {
        if (this.b.bankaIslem?.({ tur: 'esya-cek', banka: k.i, hedef, adet: n })) return;
        const m = o.envanter[hedef]; if (m && e.sayilabilir && m.no === e.no) m.adet = (m.adet ?? 1) + n; else o.envanter[hedef] = e.sayilabilir ? { ...e, adet: n } : e;
        const kalan = (e.adet ?? 1) - n; o.depo[k.i] = kalan > 0 && e.sayilabilir ? { ...e, adet: kalan } : null;
      }
      this.depoImza = ''; this.sonEnvanterImza = '';
    };
    /** Yığınlanabilir eşyada (1'den çok) "kaç tane?" kutusu açılır; diğerlerinde doğrudan aktarılır. */
    const adetliAktar = (k: Yuva, hedef: number) => {
      const e = dolu(k)!, toplam = e.adet ?? 1;
      if (!e.sayilabilir || toplam <= 1) { aktar(k, hedef, toplam); return; }
      this.b.ipucuGizle();
      adetKutusu(p.el, { ad: e.ad, soru: k.yer === 'canta' ? 'How many do you want to deposit?' : 'How many do you want to withdraw?', maks: toplam, onayYazisi: k.yer === 'canta' ? 'Deposit' : 'Withdraw', birimFiyat: 0, onay: (n) => aktar(k, hedef, n) });
    };
    /** Eşyayı kaynak yuvadan hedef yuvaya taşır (hedef yoksa otomatik: bankada aynı yığın → bulunulan sayfanın boş yuvası → en yakın boş yuva). */
    const tasi = (k: Yuva, h: Yuva | null) => {
      const e = dolu(k); if (!e) return;
      if (h && h.yer === k.yer && h.i === k.i) return;
      const hedefDolu = h ? dolu(h) : null;
      const yiginUstu = !!h && !!hedefDolu && !!e.sayilabilir && hedefDolu.no === e.no && h.yer !== k.yer; // aynı eşyanın yığınının üstüne bırakma
      if (h && hedefDolu && !yiginUstu) h = null; // başka eşyanın üstü: otomatik yuvaya düşer
      if (k.yer === 'canta' && (!h || h.yer === 'depo')) { // çantadan bankaya
        let hedef = bankadaAyniYigin(e); // bankada aynı eşyanın yığını varsa, hangi yuvaya bırakılırsa bırakılsın üstüne yığılır
        if (hedef < 0) hedef = h ? h.i : bankaBosYuva();
        if (hedef < 0) { this.b.mesaj('Your warehouse is full.'); return; }
        adetliAktar(k, hedef);
      } else if (k.yer === 'depo' && (!h || h.yer === 'canta')) { // bankadan çantaya
        let hedef = e.sayilabilir ? o.envanter.findIndex((x) => !!x && x.no === e.no) : -1; // çantada aynı yığın varsa üstüne yığılır
        if (hedef < 0) hedef = h ? h.i : o.envanter.indexOf(null);
        if (hedef < 0) { this.b.mesaj('Your inventory is full.'); return; }
        adetliAktar(k, hedef);
      } else if (k.yer === 'depo' && h) { // banka içinde taşıma (aynı sayfada; sunucu: hedef boş olmalı)
        if (Math.floor(h.i / 24) !== this.depoSayfa || Math.floor(k.i / 24) !== this.depoSayfa) return;
        if (this.b.bankaIslem?.({ tur: 'banka-ici', kaynak: k.i, hedef: h.i })) return;
        o.depo[h.i] = e; o.depo[k.i] = null; this.depoImza = ''; this.sonEnvanterImza = '';
      } else if (k.yer === 'canta' && h) { // çanta içinde taşıma
        if (this.b.bankaIslem?.({ tur: 'canta-ici', kaynak: k.i, hedef: h.i })) return;
        o.envanter[h.i] = e; o.envanter[k.i] = null; this.depoImza = ''; this.sonEnvanterImza = '';
      }
    };
    // SAĞ tık: çanta eşyası bankaya, banka eşyası çantaya (ilk boş yuva)
    p.el.addEventListener('contextmenu', (ev) => { const k = yuvaBul(ev.target); if (!k) return; ev.preventDefault(); this.b.ipucuGizle(); tasi(k, null); });
    // SÜRÜKLE-BIRAK (fare olaylarıyla; tarayıcının HTML5 sürüklemesine bağlı değil): sol tuşla tut → yuvaya bırak
    // çanta ↔ banka (herhangi bir yuva), banka içinde (aynı sayfa), çanta içinde
    yuvaSurukle<Yuva>(p.el, {
      yuvaBul,
      kaynakEleman: (k) => (dolu(k) ? (k.yer === 'depo' ? this.depoUst()[k.i - this.depoSayfa * 24] : this.depoAlt()[k.i]) ?? null : null),
      birak: (k, h) => { if (h) tasi(k, h); },
    });
  }
  private depoCiz(): void {
    const p = this.pencereler.depo, o = this.b.oyuncu;
    const imza = `${this.depoSayfa}|${o.altin}|${o.depoAltin}|${o.depo.map((e) => `${e?.no ?? 0}x${e?.adet ?? 1}`).join(',')}|${o.envanter.map((e) => `${e?.no ?? 0}x${e?.adet ?? 1}`).join(',')}`;
    if (imza === this.depoImza) return;
    this.depoImza = imza;
    const yuvaCiz = (el: HTMLElement, e: EsyaTanimi | null) => { el.draggable = false;
      el.style.backgroundImage = e?.simge ? `url(${e.simge})` : ''; el.style.backgroundSize = ESYA_SIMGE; el.style.backgroundPosition = '0 0'; el.dataset.adet = (e?.adet ?? 1) > 1 ? String(e!.adet) : '';
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
  /** Tamir modu (orijinaldeki INV_STATE_REPAIR): açıkken çanta/giyili eşyaya tıklamak onu tamir ettirir, bilgi kutusu tamir ücretini gösterir. */
  private tamirModu = false;
  private magazaYeni: MagazaPenceresi | null = null;
  private npcPencereAcilis = 0;
  /** Mağaza ya da banka (NPC penceresi) açık mı? */
  npcPencereAcik(): boolean { return !!this.magazaYeni?.acik || this.acik.has('depo') || !!this.diyalog?.acik || !!this.duz?.acik; }
  private diyalog: DiyalogPenceresi | null = null;
  /** NPC diyalog menüsü (sunucudan gelen SelectMsg): pencere ilk kullanımda yüklenir. */
  diyalogGoster(npcAdi: string, konusmaNo: number, dugmeler: number[]): void {
    this.npcPencereAcilis = performance.now();
    if (!this.diyalog) {
      void DiyalogPenceresi.olustur({ sec: (i) => this.b.diyalogSec?.(i), kapandi: () => this.b.diyalogKapandi?.(), olcek: () => arayuzOlcegi(), oyuncuAdi: () => this.b.oyuncu.ad }, this.b.kok).then((d) => { this.diyalog = d; d.goster(npcAdi, konusmaNo, dugmeler); });
      return;
    }
    this.diyalog.goster(npcAdi, konusmaNo, dugmeler);
  }
  /** Hazır metinle diyalog (görev NPC konuşması): düğmelerin her biri kendi işlevini çalıştırır. `konusmaNo` Quest_Talk numarası. */
  diyalogMetinle(npcAdi: string, konusmaNo: number, dugmeler: { metinNo: number; sec: () => void }[]): void {
    this.npcPencereAcilis = performance.now();
    const ac = (d: DiyalogPenceresi) => d.gosterMetin(npcAdi, d.konusmaMetni(konusmaNo), dugmeler.map((x) => ({ yazi: d.dugmeMetni(x.metinNo), sec: x.sec })));
    if (this.diyalog) { ac(this.diyalog); return; }
    void DiyalogPenceresi.olustur({ sec: (i) => this.b.diyalogSec?.(i), kapandi: () => this.b.diyalogKapandi?.(), olcek: () => arayuzOlcegi(), oyuncuAdi: () => this.b.oyuncu.ad }, this.b.kok).then((d) => { this.diyalog = d; ac(d); });
  }
  /** Düz metinli diyalog (sunucu Lua betiği olmayan NPC'ler: Inn Hostess, Sundries): `pasif` seçenek gri görünür ve tıklanmaz. */
  private duz: DuzDiyalog | null = null;
  diyalogDuz(npcAdi: string, konusma: string, dugmeler: DuzSecenek[]): void {
    this.npcPencereAcilis = performance.now();
    this.diyalog?.sessizKapat();
    this.duz ??= new DuzDiyalog(this.b.kok, () => arayuzOlcegi(), () => this.b.diyalogKapandi?.());
    this.duz.goster(konusma, dugmeler, npcAdi);
  }
  diyalogKapat(): void { this.diyalog?.sessizKapat(); this.duz?.kapat(false); }
  /** Oyuncu hareket edince NPC pencereleri (mağaza, banka) kapanır; açılışın hemen ardından 0,4 sn tolerans vardır. */
  // ---------------------------------------------------------------- parti penceresi (re_el_party: 8 üye satırı, can/mana çubukları, lider menüsü)
  private partiPenceresi: UiPencere | null = null; private partiSecili = -1;
  private partiKur(p: UiPencere): void {
    this.partiPenceresi = p; p.goster('Base_menu', false);
    for (let i = 0; i < 8; i++) {
      for (const e of p.bul(`base_choice${i}`)) { e.style.pointerEvents = 'auto'; e.style.cursor = 'pointer'; e.addEventListener('click', () => { this.partiSecili = i; const u = this.b.parti?.().uyeler[i]; if (u) this.b.partiSec?.(u.id); this.partiCiz(p); }); }
      for (const id of [`btn_up_${i}`, `btn_down_${i}`, `btn_commander_zoom_${i}`]) p.goster(id, false); // sıra değiştirme okları bu sürümde yok
    }
    const sec = () => this.b.parti?.().uyeler[this.partiSecili];
    p.tikla.set('btn_out', () => { const u = sec(), pt = this.b.parti?.(); if (u && pt) { if (u.id === pt.benimId && pt.uyeler[0]?.id === pt.benimId && pt.uyeler.length > 1) this.b.partiDagit?.(); else this.b.partiAyril?.(u.id); } this.partiSecili = -1; });
    p.tikla.set('btn_chief', () => { const u = sec(); if (u) this.b.partiLider?.(u.id); this.partiSecili = -1; });
  }
  /** Üye satırlarını sunucudaki parti bilgisiyle doldurur; boş satırlar gizlenir. */
  private partiCiz(p: UiPencere): void {
    const pt = this.b.parti?.(); const uyeler = pt?.uyeler ?? [];
    for (let i = 0; i < 8; i++) {
      const u = uyeler[i]; p.goster(`Base_Party${i}`, !!u);
      if (!u) continue;
      p.metin(`str_name${i}`, `${u.ad}${i === 0 ? ' (Leader)' : ''}  Lv.${u.seviye}`);
      p.ilerleme(`progress_hp_${i}`, u.enCokCan ? u.can / u.enCokCan : 0); p.ilerleme(`progress_mp_${i}_curse`, u.enCokMana ? u.mana / u.enCokMana : 0);
      for (const e of p.bul(`base_choice${i}`)) e.style.outline = i === this.partiSecili ? '1px solid #8fd6e6' : '';
    }
    const benLider = !!pt && uyeler[0]?.id === pt.benimId, sec = uyeler[this.partiSecili];
    p.goster('Base_menu', !!sec && (benLider || sec.id === pt?.benimId));
    p.goster('btn_chief', !!sec && benLider && sec.id !== pt?.benimId);
  }

  // ---------------------------------------------------------------- görev sayfası (re_el_page_quest)
  private gorevSayfa = 0; private gorevSecili = -1;
  private static readonly GOREV_SATIRI = 15;
  private static readonly GOREV_DURUMU: Record<number, string> = { 1: 'In progress', 2: 'Completed', 3: 'Complete it', 4: 'Finished' };
  /** Sayfa tekerleği ve satır seçimi: pencere açıldıkça Quest_Npc_Desc adlarıyla gerçek görev durumları listelenir. */
  private gorevSayfasiKur(p: UiPencere): void {
    p.el.addEventListener('wheel', (ev) => { ev.preventDefault(); this.gorevSayfa = Math.max(0, this.gorevSayfa + (ev.deltaY > 0 ? 1 : -1)); void this.gorevSayfasiDoldur(p); }, { passive: false });
    for (let i = 0; i < OyunArayuzu.GOREV_SATIRI; i++) p.tikla.set(`btn_selectquest${String(i).padStart(2, '0')}`, () => { this.gorevSecili = i; void this.gorevSayfasiDoldur(p); });
    p.tikla.set('btn_right', () => { this.gorevSayfa++; void this.gorevSayfasiDoldur(p); });
    p.tikla.set('btn_left', () => { this.gorevSayfa = Math.max(0, this.gorevSayfa - 1); void this.gorevSayfasiDoldur(p); });
  }
  private async gorevSayfasiDoldur(p: UiPencere): Promise<void> {
    const v = await diyalogVerisi(), liste = (this.b.gorevler?.() ?? []).filter(([no, d]) => d !== 0 && v.gorev[String(no)]).sort((a, c) => (a[1] === 2 ? 1 : 0) - (c[1] === 2 ? 1 : 0) || a[0] - c[0]);
    const N = OyunArayuzu.GOREV_SATIRI, sayfaSayisi = Math.max(1, Math.ceil(liste.length / N));
    this.gorevSayfa = Math.min(this.gorevSayfa, sayfaSayisi - 1);
    for (let i = 0; i < N; i++) {
      const g = p.bul(`group_quest_${String(i).padStart(2, '0')}`)[0]; if (!g) continue;
      const s = liste[this.gorevSayfa * N + i];
      const yaz = (id: string, t: string) => { const e = g.querySelector<HTMLElement>(`[data-id="${id}"] span`); if (e) e.textContent = t; };
      yaz('txt_quest_title', s ? v.gorev[String(s[0])][0] : ''); yaz('txt_quest_status', s ? OyunArayuzu.GOREV_DURUMU[s[1]] ?? String(s[1]) : ''); yaz('txt_quest_time', ''); yaz('txt_quest_type', ''); yaz('txt_quest_zone', '');
      g.style.outline = s && i === this.gorevSecili ? '1px solid #f0d48a' : '';
    }
    p.metin('text_page', this.gorevSayfa + 1);
    const sec = liste[this.gorevSayfa * N + this.gorevSecili];
    p.metin('text_quest_name', sec ? v.gorev[String(sec[0])][0] : ''); p.metin('text_zone', sec ? v.gorev[String(sec[0])][1].slice(0, 60) : '');
    p.metin('text_hunt_name', ''); p.metin('text_hunt_count', '');
    for (const id of ['Reward1', 'Reward2', 'Reward3', 'Reward4']) { const r = p.bul(id)[0]; if (r) for (const y of r.querySelectorAll<HTMLElement>('.ui-yazi span')) y.textContent = ''; }
  }

  /** Oyun alanına (pencere dışına) tıklanınca: envanter, skill, karakter, mağaza, banka, diyalog ve bütün genel pencereler kapanır. */
  tumPencereleriKapat(): void {
    for (const a of [...this.acik]) this.ac(a, false);
    if (this.magazaYeni?.acik) this.magazaYeni.kapat();
    if (this.diyalog?.acik) this.diyalog.kapat();
    if (this.duz?.acik) this.duz.kapat(false);
    this.genel.hepsiniKapat();
  }
  npcPencereleriniKapat(): void {
    if (performance.now() - this.npcPencereAcilis < 400) return;
    if (this.magazaYeni?.acik) this.magazaYeni.kapat();
    if (this.acik.has('depo')) this.ac('depo', false);
    if (this.diyalog?.acik) this.diyalog.kapat();
    if (this.duz?.acik) this.duz.kapat(false);
  }
  private tamirModuDegistir(ac: boolean): void {
    this.tamirModu = ac; this.sonEnvanterImza = ''; this.b.ipucuGizle();
    document.body.classList.toggle('tamir-modu', ac);
    const d = this.pencereler.magaza.bul('btn_ok1')[0]; if (d) d.style.filter = ac ? 'brightness(1.6) sepia(1) hue-rotate(60deg)' : '';
    if (ac) this.b.mesaj('Repair mode: click an item to repair it.');
  }
  magazaAc(npcAdi: string, sayfalar: EsyaTanimi[][]): void {
    this.npcPencereAcilis = performance.now();
    // Mağaza + envanter tek "Store" penceresi (magazaPenceresi.ts); eski ayrı mağaza/envanter pencereleri kullanılmaz.
    this.magazaAdi = npcAdi; this.magazaSayfalar = sayfalar;
    this.ac('envanter', false);
    const tamirci = !!this.b.tamirmi?.();
    if (!this.magazaYeni) {
      void MagazaPenceresi.olustur({
        envanter: () => this.b.oyuncu.envanter, altin: () => this.b.oyuncu.altin, satinAl: (e) => this.b.magazaSatinAl(e), sat: (y, adet) => this.b.magazaSat(y, adet), tamirEt: (k) => this.b.tamirEt?.(k),
        ipucu: (e, ev, s, t) => this.b.ipucuGoster(e, ev, s, t), ipucuGizle: () => this.b.ipucuGizle(), mesaj: (m) => this.b.mesaj(m),
        altBos: () => this.gorev.boyut[1] * this.gorevOlcegi() + 14, olcek: () => arayuzOlcegi(), kapandi: () => {},
      }, this.b.kok).then((m) => { this.magazaYeni = m; m.ac(npcAdi, sayfalar, tamirci); });
      return;
    }
    this.magazaYeni.ac(npcAdi, sayfalar, tamirci);
  }
  /**
   * Mağaza ve envanter TEK pencere gibi üst üste durur (orijinal "Store" düzeni): mağaza üstte, envanter hemen altında, ikisi de sağ kenarda.
   * Birlikte ekrana sığmıyorsa ikisi aynı oranda küçülür.
   */
  private magazaYerlestir(): void {
    const m = this.pencereler.magaza, e = this.pencereler.envanter;
    m.olcekAyarla(1); e.olcekAyarla(1);
    const [ml, mt, mr, mb] = m.sinir(), [el, et, er, eb] = e.sinir();
    const hM = mb - mt, hE = eb - et, gen = Math.max(mr - ml, er - el);
    const altBos = this.gorev.boyut[1] * this.gorevOlcegi() + 14;
    const ol = Math.max(0.4, Math.min(arayuzOlcegi(), (innerHeight - altBos - 8) / (hM + hE), (innerWidth - 16) / gen));
    m.olcekAyarla(ol); e.olcekAyarla(ol);
    const y0 = 4, cx = innerWidth - (gen * ol) / 2 - 2;
    m.el.style.left = `${cx - ((ml + mr) / 2) * ol}px`; m.el.style.top = `${y0 - mt * ol}px`;
    e.el.style.left = `${cx - ((el + er) / 2) * ol}px`; e.el.style.top = `${y0 + hM * ol - et * ol}px`;
    m.el.style.zIndex = String(++this.z); e.el.style.zIndex = String(++this.z);
  }
  private magazaKur(): void {
    const p = this.pencereler.magaza;
    p.gizleDesen(/^(edit_message|btn_ok|at[0-9]+)$/); // at0-at11: öne çıkan eşya alanı (kullanılmıyor)
    for (const el of p.tumDugmeler()) if (/close|cancel/i.test(el.dataset.id ?? '')) p.tikla.set(el.dataset.id!, () => { this.tamirModuDegistir(false); this.ac('magaza', false); }); // sağ üstteki çarpı (close) ve btn_cancel
    p.tikla.set('btn_ok1', () => this.tamirModuDegistir(!this.tamirModu)); // tamirci NPC'de: Repair (tamir modu aç/kapat)
    const rb = p.bul('btn_ok1')[0]; if (rb) { rb.title = 'Repair'; rb.style.color = '#ffe9a8'; rb.style.font = '700 13px Segoe UI, sans-serif'; rb.style.textShadow = '0 1px 2px #000'; rb.style.display = 'flex'; rb.style.alignItems = 'center'; rb.style.justifyContent = 'center'; rb.textContent = 'Repair'; }
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
      alan.onmouseenter = e ? (ev) => this.b.ipucuGoster(e, ev, true) : null; // mağaza: alış fiyatı
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
    if (!this.sinifBecerileri.length) { this.sekmeBeceriler[0] = [...this.beceriler]; this.sinifBecerileri = [...this.beceriler]; } // sunucusuz (yerel) mod: sınıf bilgisi gelmeden temel Warrior skill'leri
    const c = this.cubuk;
    c.gizleDesen(/^(btn_open|btn_close|img_front2|btn_lock|strpage[0-9])$/); // sayfa numarası görünmez; kilit ve yön düğmeleri aşağıda kendi simgeleriyle kurulur
    // Zemin resmi iki ok plakası çiziyor: ikincisi (kilit satırı) gizlenir, yerine gerçek kilit düğmesi görünür
    for (const e of c.el.querySelectorAll<HTMLElement>('.ui-t4')) if (e.style.top === '349px' && e.style.left === '2px') e.style.display = 'none';
    // Topun yanındaki sayfa numarası karesi (zemin resminin parçası) gizlenir
    for (const e of c.el.querySelectorAll<HTMLElement>('.ui-t4')) { const l = e.style.left, tp = e.style.top; if ((l === '36px' && tp === '13px') || (l === '14px' && tp === '2px') || (l === '33px' && tp === '10px') || (l === '11px' && tp === '1px')) e.style.display = 'none'; }
    for (const id of ['btn_up', 'btn_down']) for (const e of c.bul(id)) for (const dd of e.querySelectorAll<HTMLElement>('.ui-durum')) dd.style.opacity = '0'; // oklar zemin resminde çizili; düğme yalnızca tıklama alanı
    c.tikla.set('btn_up', () => this.cubukSayfaDegistir(-1)); c.tikla.set('btn_down', () => this.cubukSayfaDegistir(1));
    c.el.style.overflow = 'visible'; c.el.style.zIndex = '5'; c.el.style.pointerEvents = 'none';
    try { this.cubukDikey = localStorage.getItem('ke_skillcubugu_yon') !== 'yatay'; } catch { /* kayıt yok */ }
    try { this.cubukKilitli = localStorage.getItem('ke_skillcubugu_kilit') === '1'; } catch { /* kayıt yok */ }
    this.cubukDugmeleriKur();
    // Üstteki top: basılı tutup sürükleyince çubuk taşınır (kilitliyse taşınmaz); çift tıklama yönü (dikey/yatay) değiştirir
    for (const top of c.bul('btn_change')) {
      top.style.touchAction = 'none';
      top.addEventListener('pointerdown', (ev) => {
        if (this.cubukKilitli || ev.button !== 0) return;
        const r = c.el.getBoundingClientRect(); const dx = ev.clientX - r.left, dy = ev.clientY - r.top;
        top.setPointerCapture(ev.pointerId);
        const tasi = (e2: PointerEvent) => { const w = this.cubukKutu(); c.el.style.left = `${Math.max(0, Math.min(innerWidth - w[0], e2.clientX - dx))}px`; c.el.style.top = `${Math.max(0, Math.min(innerHeight - w[1], e2.clientY - dy))}px`; };
        const bitir = () => { top.removeEventListener('pointermove', tasi); top.removeEventListener('pointerup', bitir); if (this.cubukSolaYakin()) { this.cubukSifirla(); return; } try { localStorage.setItem(this.cubukDikey ? 'ke_skillcubugu_konum_dikey' : 'ke_skillcubugu_konum_yatay', JSON.stringify([parseFloat(c.el.style.left), parseFloat(c.el.style.top)])); } catch { /* depolama kapalı */ } };
        top.addEventListener('pointermove', tasi); top.addEventListener('pointerup', bitir);
      });
    }
    for (const top of c.bul('btn_change')) top.addEventListener('contextmenu', (ev) => { ev.preventDefault(); this.cubukSifirla(); }); // sağ tık: konumu varsayılana al
    this.cubukKilitGoster();
    this.cubukYonUygula(); this.cubukSayfaDegistir(0);
    this.cubukYukle();
    for (const alan of this.cubukYuvalari()) {
      const i = this.cubukSira(alan);
      alan.style.overflow = 'hidden';
      const bek = document.createElement('div');
      Object.assign(bek.style, { position: 'absolute', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }); // bekleme: yuvarlak (saat yönünde) süpürme, sayı yok
      bek.className = 'cubuk-bekleme'; alan.appendChild(bek);
      alan.addEventListener('click', () => this.cubukKullan(i));
      this.skillIpucuBagla(alan, () => this.cubukBeceri[this.cubukSayfa * 8 + i]);
      alan.addEventListener('contextmenu', (e) => { e.preventDefault(); this.cubukBeceri[this.cubukSayfa * 8 + i] = null; this.cubukKaydet(); });
      alan.draggable = false; // sürükleme fare olaylarıyla (skillSurukleKur)
    }
    this.skillSurukleKur();
  }
  /**
   * Skill sürükle-bırak (fare olaylarıyla; tarayıcının HTML5 sürüklemesine bağlı değil): skill penceresinden çubuğa koy, çubukta iki yuvayı yer değiştir, çubuktan dışarı bırakınca çubuktan kaldır.
   */
  private skillSurukleKur(): void {
    type Yuva = { k: 'beceri' | 'cubuk'; i: number };
    const p = this.pencereler.beceri;
    yuvaSurukle<Yuva>(this.b.kok, {
      yuvaBul: (hedef) => {
        const el = hedef as HTMLElement | null; if (!el?.closest) return null;
        for (const a of this.cubukYuvalari()) if (a === el || a.contains(el)) return { k: 'cubuk', i: this.cubukSira(a) };
        for (let i = 0; i < this.beceriYuvaSayisi; i++) { const a = p.alan(String(i)); if (a && (a === el || a.contains(el))) return { k: 'beceri', i }; }
        return null;
      },
      kaynakEleman: (k) => {
        if (k.k === 'beceri') return this.beceriler[k.i] ? p.alan(String(k.i)) ?? null : null;
        const no = this.cubukBeceri[this.cubukSayfa * 8 + k.i]; if (no === null || no === undefined) return null;
        return this.cubukYuvalari().find((a) => this.cubukSira(a) === k.i) ?? null;
      },
      birak: (k, h) => {
        const kaynakNo = k.k === 'beceri' ? this.beceriler[k.i]?.no : this.cubukBeceri[this.cubukSayfa * 8 + k.i];
        if (kaynakNo === null || kaynakNo === undefined) return;
        if (h && h.k === 'cubuk') {
          const hedef = this.cubukSayfa * 8 + h.i;
          if (k.k === 'cubuk') { const ks = this.cubukSayfa * 8 + k.i; if (ks === hedef) return; const t = this.cubukBeceri[hedef]; this.cubukBeceri[hedef] = this.cubukBeceri[ks]; this.cubukBeceri[ks] = t; this.cubukKaydet(); }
          else this.cubugaKoy(kaynakNo, hedef);
        } else if (k.k === 'cubuk') { this.cubukBeceri[this.cubukSayfa * 8 + k.i] = null; this.cubukKaydet(); } // çubuk dışına bırakılan skill çubuktan kalkar
      },
    });
  }
  /** Skill'i çubuğun belirtilen yuvasına koyar; seviyesi yetmiyorsa koymaz. Koyduysa true. */
  private cubugaKoy(no: number, yuva: number): boolean {
    const b = this.beceriBul(no); if (!b) return false;
    if (this.pasifMi(no)) { this.b.mesaj(`${b.ad} is a passive skill and cannot be placed on the skill bar.`); return false; }
    if (!this.beceriAcik(b)) { const agac = (b.sayfa ?? 0) % 10; this.b.mesaj(agac >= 5 && agac <= 8 ? `${b.ad} requires ${b.seviye} skill points in this tree.` : `${b.ad} requires level ${b.seviye}.`); return false; }
    this.cubukBeceri[yuva] = no; this.cubukKaydet(); return true;
  }
  /** Skill penceresinde sağ tık: skill, çubukta (bu sayfadan başlayarak) ilk boş yuvaya konur. */
  private hizliKoy(no: number): void {
    const b = this.beceriBul(no); if (!b) return;
    if (this.pasifMi(no)) { this.b.mesaj(`${b.ad} is a passive skill: it works automatically and is not placed on the skill bar.`); return; }
    if (this.cubukBeceri.includes(no)) { this.b.mesaj(`${b.ad} is already on the skill bar.`); return; }
    for (let k = 0; k < 64; k++) { const y = (this.cubukSayfa * 8 + k) % 64; if (this.cubukBeceri[y] === null || this.cubukBeceri[y] === undefined) { this.cubugaKoy(no, y); return; } }
    this.b.mesaj('The skill bar is full.');
  }
  /** Skill'in oyuncu iskeletindeki animasyon numarası (tablo iSelfAnimID1). */
  /** Skill'in client tablosundaki adı (sunucu tablosunda adı boş olan skill'ler için). */
  beceriAdi(no: number): string | undefined { return this.beceriBul(no)?.ad; }
  beceriAnimNo(no: number): number | undefined { return this.beceriBul(no)?.anim; }
  beceriVurusAnim(no: number): number | undefined { return this.beceriBul(no)?.vurusAnim; }
  beceriKombo(no: number): number[] | undefined { return this.beceriBul(no)?.kombo; }
  /** Skill'in efekt numaraları (fx.tbl): kendinde ve hedefte oynayan. */
  beceriEfekt(no: number): { kendi: number | null; hedef: number | null; ucan: number | null } { const b = this.beceriBul(no); return { kendi: b?.efektKendi ?? null, hedef: b?.efektHedef ?? null, ucan: b?.efektUcan ?? null }; }
  /** Çubuktaki 16 yuva: yatay 10..17, dikey 0..7 (orijinal arayüzde iki ayrı grup). */
  private cubukYuvalari(): HTMLElement[] {
    const yuva = (id: string) => this.cubuk.bul(id).filter((e) => e.classList.contains('ui-t9'));
    return [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [...yuva(String(10 + i)), ...yuva(String(i))]);
  }
  private cubukSira(alan: HTMLElement): number { const n = Number(alan.dataset.id); return n >= 10 ? n - 10 : n; }
  /** Çubuk ekranın sol kenarına (dikey) ya da varsayılan yerine (yatay) 60 px'ten yakın bırakıldı mı? Öyleyse varsayılana yapışır. */
  private cubukSolaYakin(): boolean {
    const x = parseFloat(this.cubuk.el.style.left) || 0, y = parseFloat(this.cubuk.el.style.top) || 0;
    if (this.cubukDikey) return x + this.cubuk.sinir()[0] * this.cubuk.olcek < 60;
    return y > innerHeight - 160 * this.cubuk.olcek && Math.abs(x + 178 * this.cubuk.olcek - innerWidth / 2) < 120; // yatay: görev çubuğunun üstünde, ortada
  }
  /** Kayıtlı konumu siler, çubuğu varsayılan yerine (dikey: ekranın soluna yapışık) koyar. */
  private cubukSifirla(): void {
    for (const k of ['ke_skillcubugu_konum_dikey', 'ke_skillcubugu_konum_yatay']) { try { localStorage.removeItem(k); } catch { /* depolama kapalı */ } }
    this.gorevYerlestir(); this.b.mesaj('Skill bar position was reset.');
  }
  private cubukYonUygula(): void {
    this.cubuk.goster('Hotkey_vertical', this.cubukDikey); this.cubuk.goster('Hotkey_Horizontal', !this.cubukDikey);
    this.cubuk.el.style.height = this.cubukDikey ? '402px' : '70px';
  }
  /** Çubuğun ekrandaki (ölçekli) boyutu. */
  private cubukKutu(): [number, number] { const o = this.cubuk.olcek; return this.cubukDikey ? [74 * o, 393 * o] : [356 * o, 60 * o]; }
  private cubukSayfaDegistir(d: number): void { this.cubukSayfa = (this.cubukSayfa + d + 8) % 8; this.cubuk.metin('strpage0', this.cubukSayfa + 1); this.cubuk.metin('strpage1', this.cubukSayfa + 1); }
  private cubukKilitDugmeleri: HTMLElement[] = [];
  /** Kilit ve yön (dikey/yatay) düğmeleri: oyunun kendi simge sayfasından (knight1.dxt) çizilir; iki çubuk yönünde de görünür. */
  private cubukDugmeleriKur(): void {
    const yap = (x: number, y: number, u: number, hazirla: (e: HTMLElement) => void): HTMLElement => {
      const e = document.createElement('div');
      Object.assign(e.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: '41px', height: '12px', cursor: 'pointer', pointerEvents: 'auto', backgroundImage: 'url(/arayuz/doku/knight1.png)', backgroundSize: '512px 512px', backgroundPosition: `${-u}px -336px`, backgroundRepeat: 'no-repeat' });
      hazirla(e); return e;
    };
    const gruplar: [string, number, number, number, number][] = [['Hotkey_vertical', 5, 353, 5, 369], ['Hotkey_Horizontal', 250, 64, 298, 64]];
    for (const [ad, kx, ky, yx, yy] of gruplar) {
      const g = this.cubuk.bul(ad)[0]; if (!g) continue;
      const kilit = yap(kx, ky, 191, (e) => e.addEventListener('click', () => { this.cubukKilitli = !this.cubukKilitli; try { localStorage.setItem('ke_skillcubugu_kilit', this.cubukKilitli ? '1' : '0'); } catch { /* depolama kapalı */ } this.cubukKilitGoster(); }));
      const yon = yap(yx, yy, 236, (e) => {
        e.title = 'Switch the bar between vertical and horizontal';
        // Oyunun kare (pencere) simgesi: knight1.dxt (221,420), üzerine gelince alttaki kare
        Object.assign(e.style, { width: '13px', height: '13px', backgroundPosition: '-221px -420px' });
        e.addEventListener('pointerenter', () => { e.style.backgroundPosition = '-221px -433px'; }); e.addEventListener('pointerleave', () => { e.style.backgroundPosition = '-221px -420px'; });
        e.addEventListener('click', () => { this.cubukDikey = !this.cubukDikey; try { localStorage.setItem('ke_skillcubugu_yon', this.cubukDikey ? 'dikey' : 'yatay'); } catch { /* depolama kapalı */ } this.cubukYonUygula(); this.cubuk.sinirTemizle(); this.gorevYerlestir(); void this.cubuk.sinirKesinles().then((tamam) => { if (tamam) this.gorevYerlestir(); }); });
      });
      g.append(kilit, yon); this.cubukKilitDugmeleri.push(kilit);
    }
  }
  private cubukKilitGoster(): void { for (const e of this.cubukKilitDugmeleri) { e.style.backgroundPositionY = `${-(this.cubukKilitli ? 360 : 336)}px`; e.title = this.cubukKilitli ? 'Locked: the bar cannot be moved (click to unlock)' : 'Unlocked: drag the ball to move the bar (click to lock)'; } }
  /** Sınıfın skill çubuğu kaydı (Warrior eski kayıt anahtarını kullanmaya devam eder). */
  private cubukAnahtari(): string { return this.cubukSinif === 201 ? 'ke_skillcubugu' : `ke_skillcubugu_${this.cubukSinif}`; }
  private cubukKaydet(): void { try { localStorage.setItem(this.cubukAnahtari(), JSON.stringify(this.cubukBeceri)); } catch { /* depolama kapalı */ } }
  private cubukYukle(): void {
    this.cubukBeceri = new Array(64).fill(null);
    try { const k = JSON.parse(localStorage.getItem(this.cubukAnahtari()) ?? 'null'); if (Array.isArray(k)) this.cubukBeceri = k.slice(0, 64).map((x) => (typeof x === 'number' ? x : null)); while (this.cubukBeceri.length < 64) this.cubukBeceri.push(null); } catch { /* kayıt yok */ }
    // Kayıttaki skill'ler bu sınıfa ait olmalı; hiçbiri yoksa 1. seviyedeki temel skill'ler sırayla konur
    const gecerli = new Set(this.sinifBecerileri.filter((b) => !this.pasifMi(b.no)).map((b) => b.no)); // pasif skill'ler çubukta durmaz
    this.cubukBeceri = this.cubukBeceri.map((no) => (no !== null && gecerli.has(no) ? no : null));
    if (!this.cubukBeceri.some((x) => x !== null)) { const ilk = this.sekmeBeceriler[0].filter((b) => b.seviye <= 1).map((b) => b.no); this.cubukBeceri = [...ilk, ...new Array(64 - ilk.length).fill(null)].slice(0, 64); }
  }
  /** Oyuncunun sınıfı belli olunca (sunucudan ya da yerel): skill listesi ve çubuğu o sınıfa göre yenilenir. Sınıf kodu = ulus × 100 + meslek (105/106 Warrior, 107/108 Rogue, 109/110 Mage, 111/112 Priest). */
  sinifAyarla(sinif: number): void {
    const ulus = Math.floor(sinif / 100), m = sinif % 100, meslek = m <= 4 ? m : m <= 6 ? 1 : m <= 8 ? 2 : m <= 10 ? 3 : 4;
    const terfili = m >= 5 && m <= 12;
    // Sayfa kodu = sınıf kodu × 10 (201 → 2010 temel, 205 → 2050 novice temel, 206 → 2060 master temel); ağaçlar +5, +6, +7, +8
    const taban = terfili ? sinif * 10 : ulus * 1000 + meslek * 10;
    const sirala = (l: Beceri[]) => l.sort((a, c) => a.seviye - c.seviye || a.no - c.no);
    this.sekmeBeceriler = [
      terfili ? sirala(this.tumBeceriler.filter((b) => b.sayfa === taban)) : this.tumBeceriler.filter((b) => b.sayfa === taban && b.seviye <= 30).slice(0, 8),
      ...(terfili ? [5, 6, 7, 8].map((k) => sirala(this.tumBeceriler.filter((b) => b.sayfa === taban + k))) : [[], [], [], []]),
    ];
    this.sinifBecerileri = this.sekmeBeceriler.flat();
    this.beceriSekme = 0; this.beceriSayfa = 0; this.beceriListesiniYenile();
    this.beceriSekmeleriniKur(sinif);
    this.cubukSinif = sinif; this.seciliBeceri = 0; this.cubukYukle();
  }
  /** Skill'in hasar/etki bilgisi (sunucu tablolarından): yakın dövüş silah hasarının yüzdesi + sabit hasar, okçuluk yüzdesi, büyü hasarı/iyileştirme, alan skill'i hasarı. */
  private beceriHasarYazisi(no: number): string {
    const v = kurallar?.beceri[String(no)]; if (!v) return '';
    if (v.tip1) { const y = this.beceriBul(no)?.hasarYuzde ?? v.tip1.vurus; return `Damage: ${y}% of weapon damage${v.tip1.ekHasar ? ` + ${v.tip1.ekHasar}` : ''}`; }
    if (v.tip2v) return `Damage: ${v.tip2v.hasar}% of weapon damage (arrow)`;
    if (v.tip3) {
      const t = v.tip3, parca: string[] = [];
      if (t.ilk < 0) parca.push(`Damage: ${-t.ilk}`); else if (t.ilk > 0) parca.push(`Heals: ${t.ilk}`);
      if (t.sureli < 0) parca.push(`${-t.sureli} per second for ${t.sure} s`); else if (t.sureli > 0) parca.push(`Heals ${t.sureli} per second for ${t.sure} s`);
      return parca.join(' + ');
    }
    if (v.tip7) return v.tip7.hasar > 0 ? `Damage: ${v.tip7.hasar} (area ${v.tip7.yaricap} m)` : '';
    if (v.tip4) return `Duration: ${v.tip4.sure} s`;
    return '';
  }
  private beceriSureYazisi(no: number): string {
    const v = kurallar?.beceri[String(no)]; if (!v) return '';
    const p: string[] = []; if (v.hazirlik) p.push(`Cast ${(v.hazirlik / 10).toFixed(1)} s`); if (v.yenidenKullanim) p.push(`Cooldown ${(v.yenidenKullanim * 0.09).toFixed(1)} s`); if (v.menzil) p.push(`Range ${v.menzil} m`);
    return p.join(' · ');
  }
  /** Seçili sekme ve sayfaya göre penceredeki skill listesi. */
  private beceriListesiniYenile(): void {
    const tum = this.sekmeBeceriler[this.beceriSekme] ?? [];
    this.beceriSayfa = Math.max(0, Math.min(this.beceriSayfa, Math.max(0, Math.ceil(tum.length / this.beceriYuvaSayisi) - 1)));
    this.beceriler = tum.slice(this.beceriSayfa * this.beceriYuvaSayisi, (this.beceriSayfa + 1) * this.beceriYuvaSayisi);
    this.seciliBeceri = 0;
  }
  /** Terfi etmiş sınıfta sekme düğmeleri (Basic / 3 ağaç / Master), ağaç puanları ve + düğmeleri; sınıfa göre doğru düğme ve yazılar. */
  private beceriSekmeleriniKur(sinif: number): void {
    const p = this.pencereler.beceri, m = sinif % 100, terfili = m >= 5 && m <= 12, usta = terfili && m % 2 === 0;
    const grup = [1, 5, 6].includes(m) ? ['blade', 'berserker'] : [2, 7, 8].includes(m) ? ['ranger', 'hunter'] : [3, 9, 10].includes(m) ? ['mage', 'sorcerer'] : ['cleric', 'shaman'];
    p.gizleDesen(/^(btn_(mage|ranger|blade|cleric|reaper)\d|btn_master|btn_[4-7]$|img_(sorcerer|hunter|berserker|shaman|reaper)_\d|string_[4-7]$)/);
    p.gizleMetin('Master');
    if (!terfili) return;
    const sekmeDugmeleri = [['btn_public'], [0, 1, 2].map((t) => `btn_${grup[0]}${t}`)].flat();
    const sekmeRengi = () => { // seçili sekmenin yazısı pastel, göz yormayan gri; diğerleri özgün renginde
      const adlar = ['btn_public', `btn_${grup[0]}0`, `btn_${grup[0]}1`, `btn_${grup[0]}2`, 'btn_master'];
      adlar.forEach((id, i) => { for (const e of p.bul(id)) for (const y of e.querySelectorAll<HTMLElement>('.ui-yazi')) statRengiUygulaRenk(y, i === this.beceriSekme ? SEKME_SECILI_RENK : null); });
    };
    void sekmeDugmeleri;
    this.sekmeRengiUygula = sekmeRengi;
    const sec = (s: number) => { this.beceriSekme = s; this.beceriSayfa = 0; this.beceriListesiniYenile(); this.beceriCiz(); sekmeRengi(); };
    p.tikla.set('btn_public', () => sec(0));
    for (let t = 0; t < 3; t++) {
      p.goster(`btn_${grup[0]}${t}`); p.goster(`img_${grup[1]}_${t}`); p.goster(`string_${4 + t}`); p.goster(`btn_${4 + t}`);
      p.tikla.set(`btn_${grup[0]}${t}`, () => sec(t + 1));
      p.tikla.set(`btn_${4 + t}`, () => this.b.skillPuaniVer?.(5 + t));
    }
    for (const id of ['btn_public', 'btn_master', ...[0, 1, 2].map((t) => `btn_${grup[0]}${t}`)]) for (const e of p.bul(id)) e.querySelectorAll<HTMLElement>('.ui-yazi').forEach((y) => { if (/rgb\(69, 224, 252\)|#45e0fc/i.test(y.style.color)) { y.dataset.renk0 = '#f4ecd2'; y.style.color = '#f4ecd2'; } }); // sekme düğmelerinin mavi durum rengi açık krem
    sekmeRengi();
    if (usta) { p.goster('btn_master'); p.goster('string_7'); p.goster('btn_7'); p.tikla.set('btn_master', () => sec(4)); p.tikla.set('btn_7', () => this.b.skillPuaniVer?.(8)); }
  }
  private cubukKullan(i: number): void { const no = this.cubukBeceri[this.cubukSayfa * 8 + i]; if (no !== null && no !== undefined) this.b.beceriKullan(no); }
  private cubukCiz(): void {
    const o = this.b.oyuncu, simdi = performance.now() / 1000;
    for (const alan of this.cubukYuvalari()) {
      const i = this.cubukSira(alan);
      const no = this.cubukBeceri[this.cubukSayfa * 8 + i], b = this.sinifBecerileri.find((x) => x.no === no);
      const imza = `${no}|${b && this.beceriAcik(b)}|${b ? o.skillPuanlari[(b.sayfa ?? 0) % 10] : 0}`;
      if (alan.dataset.imza !== imza) {
        alan.dataset.imza = imza;
        alan.style.backgroundImage = b?.simge ? `url(/beceri/${b.simge})` : '';
        alan.style.backgroundSize = '100% 100%';
        alan.style.opacity = b && o.seviye < b.seviye ? '0.45' : '1';
        alan.removeAttribute('title');
      }
      const kalan = no ? (o.beceriBekleme.get(no) ?? 0) - simdi : 0;
      const bek = alan.querySelector<HTMLElement>('.cubuk-bekleme');
      if (bek) {
        const goster = kalan > 0; bek.style.display = goster ? 'flex' : 'none';
        if (goster) { // yeni bekleme başladıysa toplam süre kaydedilir; geçen oran kadar açı açılır (12 yönünden saat yönünde)
          const onceki = Number(bek.dataset.toplam ?? 0), sonKalan = Number(bek.dataset.kalan ?? 0);
          const toplam = kalan > sonKalan + 0.3 || !onceki ? kalan : onceki; bek.dataset.toplam = String(toplam); bek.dataset.kalan = String(kalan);
          const aci = Math.max(0, Math.min(1, 1 - kalan / toplam)) * 360;
          bek.style.background = `conic-gradient(from 0deg, rgba(0,0,0,0) 0deg ${aci}deg, rgba(0,0,0,0.62) ${aci}deg 360deg)`;
        } else { bek.dataset.toplam = '0'; bek.dataset.kalan = '0'; }
      }
    }
  }

  // ---------------------------------------------------------------- aktif buff göstergesi (Sprint, Swift, Gain…)
  /**
   * Etkin buff'ların simgeleri (şeffaf, çerçevesiz). Her simgenin üzerinde skill çubuğundaki bekleme animasyonuyla aynı daire vardır, ama SAAT YÖNÜNÜN TERSİNE açılır:
   * geçen süre kadar koyu bir dilim 12 yönünden başlayıp sola doğru büyür; süre bitince simge kaybolur.
   */
  private buffSeridi: HTMLElement | null = null;
  private buffImza = ''; private buffKap: HTMLElement | null = null;
  private buffleriCiz(): void {
    if (!this.buffSeridi) {
      // Dış kap: solda süslü sürükleme tutacağı (sol tıkla tutup istenen yere bırakılır, konum hatırlanır) + simge şeridi.
      const kap = this.buffKap = document.createElement('div');
      let konum = { x: 6, y: 108 };
      try { const k = JSON.parse(localStorage.getItem('ke.buffKonum') ?? 'null') as { x: number; y: number } | null; if (k && Number.isFinite(k.x) && Number.isFinite(k.y)) konum = k; } catch { /* kayıt yok */ }
      Object.assign(kap.style, { position: 'fixed', left: konum.x + 'px', top: konum.y + 'px', display: 'none', gap: '3px', alignItems: 'stretch', zIndex: '9', pointerEvents: 'none' });
      const tutac = document.createElement('div'); tutac.title = 'Drag to move';
      Object.assign(tutac.style, { width: '16px', minHeight: '28px', cursor: 'grab', pointerEvents: 'auto', borderRadius: '3px', border: '1px solid #c9a24a', background: 'linear-gradient(90deg,#3b2f18,#6b5628 50%,#3b2f18)', boxShadow: 'inset 0 0 3px #000, 0 1px 3px #000a', position: 'relative' });
      const im = new Image(); im.onload = () => { // oyunun UI dokusundan süslü şerit başı: dikey olarak yinelenir
        const c = document.createElement('canvas'); c.width = 14; c.height = 32; c.getContext('2d')!.drawImage(im, 4, 429, 14, 32, 0, 0, 14, 32);
        Object.assign(tutac.style, { backgroundImage: 'url(' + c.toDataURL('image/png') + ')', backgroundRepeat: 'repeat-y', backgroundPosition: 'center top' });
      }; im.src = '/arayuz/doku/ui_quest.png';
      tutac.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); tutac.setPointerCapture(e.pointerId); tutac.style.cursor = 'grabbing';
        const dx = e.clientX - kap.offsetLeft, dy = e.clientY - kap.offsetTop;
        const tasi = (ev: PointerEvent) => { kap.style.left = Math.max(0, Math.min(innerWidth - 40, ev.clientX - dx)) + 'px'; kap.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + 'px'; };
        const birak = () => { tutac.style.cursor = 'grab'; tutac.removeEventListener('pointermove', tasi); tutac.removeEventListener('pointerup', birak);
          try { localStorage.setItem('ke.buffKonum', JSON.stringify({ x: kap.offsetLeft, y: kap.offsetTop })); } catch { /* depolama kapalı */ } };
        tutac.addEventListener('pointermove', tasi); tutac.addEventListener('pointerup', birak);
      });
      tutac.addEventListener('pointerdown', (e) => e.stopPropagation()); // oyun alanına tıklama geçmesin
      this.buffSeridi = document.createElement('div');
      Object.assign(this.buffSeridi.style, { display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '300px', pointerEvents: 'none' });
      kap.appendChild(tutac); kap.appendChild(this.buffSeridi); this.b.kok.appendChild(kap);
    }
    const o = this.b.oyuncu, simdi = performance.now() / 1000, liste = o.buflar.filter((x) => x.bitis > simdi && x.sure);
    const imza = liste.map((x) => x.no).join(',');
    if (this.buffKap) this.buffKap.style.display = liste.length ? 'flex' : 'none';
    if (imza !== this.buffImza) {
      this.buffImza = imza; this.buffSeridi.replaceChildren();
      for (const x of liste) {
        const b = this.beceriBul(x.no), kutu = document.createElement('div'); kutu.dataset.no = String(x.no);
        Object.assign(kutu.style, { position: 'relative', width: '28px', height: '28px', opacity: '0.82', borderRadius: '4px', overflow: 'hidden', backgroundImage: b?.simge ? `url(/beceri/${b.simge})` : '', backgroundSize: '100% 100%', backgroundColor: b?.simge ? '' : 'rgba(143,214,230,.35)' });
        const kaplama = document.createElement('div'); kaplama.className = 'buff-kaplama';
        Object.assign(kaplama.style, { position: 'absolute', inset: '0', transform: 'scaleX(-1)' }); // aynalı: saat yönünün tersine açılır
        kutu.appendChild(kaplama); this.buffSeridi.appendChild(kutu);
      }
    }
    for (const kutu of Array.from(this.buffSeridi.children) as HTMLElement[]) {
      const x = liste.find((y) => String(y.no) === kutu.dataset.no); if (!x) continue;
      const toplam = x.sure ?? 1, gecen = Math.max(0, Math.min(1, 1 - (x.bitis - simdi) / toplam)) * 360;
      (kutu.firstElementChild as HTMLElement).style.background = `conic-gradient(from 0deg, rgba(0,0,0,0.62) 0deg ${gecen}deg, rgba(0,0,0,0) ${gecen}deg 360deg)`;
    }
  }

  // ---------------------------------------------------------------- skill ipucu (üzerine gelince ad, açıklama, hasar, MP, süreler)
  private skillIpucu: HTMLElement | null = null;
  private skillIpucuBagla(alan: HTMLElement, no: () => number | null | undefined): void {
    alan.addEventListener('mouseenter', (ev) => {
      const n = no(); const b = n ? this.beceriBul(n) : undefined; if (!b) return;
      if (!this.skillIpucu) { this.skillIpucu = document.createElement('div'); Object.assign(this.skillIpucu.style, { position: 'fixed', zIndex: '2147483000', pointerEvents: 'none', maxWidth: '260px', padding: '7px 10px', background: 'rgba(22,17,12,.94)', border: '1px solid #c9a24a', borderRadius: '4px', color: '#f4ecd2', font: '12px Verdana, sans-serif', lineHeight: '1.4', boxShadow: '0 3px 10px rgba(0,0,0,.6)' }); document.body.appendChild(this.skillIpucu); }
      const satir = (t: string, renk = '#f4ecd2') => (t ? `<div style="color:${renk}">${t.replace(/</g, '&lt;')}</div>` : '');
      const pasif = this.pasifMi(b.no);
      this.skillIpucu.innerHTML = satir(b.ad, '#ffe9a8') + satir(b.aciklama, '#d8d0b8') + satir(this.beceriHasarYazisi(b.no), '#ffd98a') + satir(pasif ? 'Passive skill' : `MP ${b.msp}`) + satir(this.beceriSureYazisi(b.no), '#bfc6cc');
      this.skillIpucu.style.display = ''; this.skillIpucuKonumla(ev);
    });
    alan.addEventListener('mousemove', (ev) => this.skillIpucuKonumla(ev));
    alan.addEventListener('mouseleave', () => { if (this.skillIpucu) this.skillIpucu.style.display = 'none'; });
  }
  private skillIpucuKonumla(ev: MouseEvent): void {
    const k = this.skillIpucu; if (!k) return;
    const w = k.offsetWidth, h = k.offsetHeight;
    k.style.left = `${Math.max(4, Math.min(innerWidth - w - 4, ev.clientX + 16))}px`; k.style.top = `${Math.max(4, Math.min(innerHeight - h - 4, ev.clientY + 16))}px`;
  }

  // ---------------------------------------------------------------- sohbet ve bilgi (hasar) pencereleri
  private satirKabi(el: HTMLElement | undefined, boyut: number): HTMLElement {
    if (!el) throw new Error('metin alanı yok');
    el.classList.remove('ui-yazi'); el.replaceChildren();
    Object.assign(el.style, { display: 'block', overflowY: 'auto', overflowX: 'hidden', pointerEvents: 'auto', fontSize: `${boyut}px`, lineHeight: '1.25', color: '#fff', textShadow: '0 1px 2px #000', overflowWrap: 'anywhere', boxSizing: 'border-box', paddingRight: '4px' });
    // Üst kenarda yarım kalan satır sert kesilmesin: yazı çerçevenin içinde yumuşakça sönsün.
    el.style.maskImage = el.style.webkitMaskImage = 'linear-gradient(to bottom, transparent 0, #000 0.9em)';
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

  /** Sohbet sekmesi (Normal/Private/Shout/Party/Clan düğmeleri): yazılan mesajın türünü belirler. */
  private sohbetModu = 'normal';
  private sohbetKur(): void {
    const p = this.sohbet;
    for (const [kimlik, mod] of [['btn_normal', 'normal'], ['btn_private', 'normal'], ['btn_shout', 'shout'], ['btn_party_force', 'party'], ['btn_clan', 'clan']] as const) p.tikla.set(kimlik, () => { this.sohbetModu = mod; if (mod === 'normal' && kimlik === 'btn_private') this.b.mesaj('Private chat: type /name message.'); });
    p.gizleDesen(/^(btn_check_|btn_off|text_notice_title)/);
    this.satirKabi(p.alan('text0'), 14);
    for (const el of p.el.querySelectorAll<HTMLElement>('.ui-yazi span')) if (el.textContent === 'Knights') el.textContent = 'Clan'; // oyundaki sekme adı
    const e = p.alan('edit0');
    if (e) {
      const g = document.createElement('input');
      g.type = 'text'; g.maxLength = 120; g.spellcheck = false; g.autocomplete = 'off';
      Object.assign(g.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', boxSizing: 'border-box', background: 'transparent', border: '0', outline: '0', color: '#fff', font: '12px Segoe UI, Tahoma, sans-serif', padding: '0 6px', pointerEvents: 'auto' });
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          const m = g.value.trim(); g.value = '';
          if (m && !this.b.sohbetGonder?.(this.sohbetModu, m)) this.sohbetYaz(`[Normal] ${this.b.oyuncu.ad}: ${m}`, '#ffffff');
          g.blur();
        } else if (ev.key === 'Escape') { g.value = ''; g.blur(); }
        ev.stopPropagation();
      });
      g.addEventListener('keyup', (ev) => ev.stopPropagation());
      g.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      e.appendChild(g); this.sohbetGiris = g;
    }
    this.sohbetYaz('### Welcome to KnightEmpire! Press Enter to chat. ###', SISTEM_SARI);
  }

  private bilgiKur(): void {
    const p = this.bilgi;
    p.gizleDesen(/^(btn_msgwnd_lock|btn_minimizeui|btn_option|scroll|btn_Merchant|btn_notice)/); // Merchant Chat / Recent Notices sekmeleri işe yaramıyor (yalnız Information kalır)
    // Boş iki sekmenin (Merchant Chat / Recent Notices) çerçeve resimleri de kalkar; yalnız Information sekmesi ve sağdaki küre kalır.
    for (const e of Array.from(p.el.children) as HTMLElement[]) { if (Math.abs((parseFloat(e.style.top) || 0) - 117) < 1.5 && (parseFloat(e.style.left) || 0) < 190 && e.dataset.id === undefined) e.style.display = 'none'; }
    for (const e of p.bul('img_sizechange')) e.style.pointerEvents = 'none'; // köşe tutamağı: büyütme SerbestPencere'de
    for (const id of ['img_background', 'img_background2']) for (const e of p.bul(id)) e.style.opacity = String(ARKA_PLAN_SAYDAMLIK);
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
    p.metin('text_Nick', 'kingces');
  }

  // ---------------------------------------------------------------- görev çubuğu
  private gorevKur(): void {
    const g = this.gorev;
    g.gizleDesen(/^(base_menu|base_TaskBar|btn_option[12]|btn_uishow|btn_change|btn_close|btn_disband|btn_rank|img_backboard|btn_seed|btn_powerup|btn_question|btn_menu)/);
    g.tikla.set('btn_inventory', () => this.degistir('envanter'));
    g.tikla.set('btn_character', () => this.degistir('durum'));
    g.tikla.set('btn_skill', () => this.degistir('beceri'));
    g.tikla.set('btn_camera', () => this.b.kamera.arkayaDon());
    for (const [id, pencere] of Object.entries(GOREV_PENCERELERI)) g.tikla.set(id, () => { void this.genel.degistir(pencere); });
    // Invite'ın solundaki Trade düğmesi Party olur: seçili oyuncuya parti daveti yollar (alış-veriş ayrı bir iş).
    for (const el of g.bul('btn_trade')) for (const s of el.querySelectorAll('span')) if (s.textContent === 'Trade') s.textContent = 'Party';
    g.tikla.set('btn_trade', () => this.b.partiDavet());
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
  /**
   * Command penceresi (referans oyunun komut listesi): üstte sohbet komutları, altta eylemler. Tek tık seçer, çift tık çalıştırır.
   * Town → Moradon şehir noktası (305, 342). Greeting/Provoke → oyuncu animasyonu. Exit → çıkış menüsü.
   */
  private komutListesi(p: UiPencere): void {
    const UST = ['Private', 'Trade', 'Party', 'Clan', 'Knights', 'Guardian Monster', 'King', 'GM'];
    const ALT: [string, () => void][] = [
      ['PM', () => this.sohbetKomutu('/private ')],
      ['Town', () => this.b.sehreDon()],
      ['Exit', () => { void this.genel.ac('re_exitmenu'); }],
      ['Greeting', () => this.b.emote(104)], ['Greeting2', () => this.b.emote(105)], ['Greeting3', () => this.b.emote(106)],
      ['Provoke', () => this.b.emote(107)], ['Provoke2', () => this.b.emote(108)], ['Provoke3', () => this.b.emote(109)],
      ['Save', () => this.b.mesaj('Your character is saved automatically on the server.')],
      ['Recommend', () => this.b.mesaj('Recommend is not available yet.')],
      ['Individual_Battle', () => this.b.mesaj('Individual battle is not available yet.')],
    ];
    const doldur = (kap: HTMLElement | undefined, satirlar: [string, () => void][], renk: string, varsayilan = 0) => {
      if (!kap) return;
      kap.replaceChildren();
      Object.assign(kap.style, { overflowY: 'auto', overflowX: 'hidden', pointerEvents: 'auto', scrollbarWidth: 'none' });
      let secili: HTMLElement | null = null;
      for (const [ad, calistir] of satirlar) {
        const s = document.createElement('div'); s.textContent = ad;
        Object.assign(s.style, { color: renk, font: '600 14px Segoe UI, Tahoma, sans-serif', height: '20px', lineHeight: '20px', paddingLeft: '3px', cursor: 'pointer', border: '1px solid transparent', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', boxSizing: 'border-box' });
        s.addEventListener('click', () => { if (secili) secili.style.borderColor = 'transparent'; secili = s; s.style.borderColor = '#31e05a'; });
        s.addEventListener('dblclick', calistir);
        s.addEventListener('pointerdown', (e) => e.stopPropagation());
        kap.appendChild(s);
        if (satirlar[varsayilan]?.[0] === ad) { secili = s; s.style.borderColor = '#31e05a'; } // pencere açıldığında yeşil seçim çerçevesi hazır durur (orijinal görünüm)
      }
    };
    doldur(p.alan('list_curtailment'), UST.map((ad): [string, () => void] => [ad, () => this.sohbetKomutu('/' + ad.toLowerCase().replace(/ /g, '') + ' ')]), '#f5e800', 0);
    doldur(p.alan('list_content'), ALT, '#ffffff', 0); // üstte Private, altta PM seçili başlar (kullanıcı isteği)
  }
  /** Komut listesinden sohbet girişine ön ek yazar ve odaklar. */
  private sohbetKomutu(onEk: string): void { const g = this.sohbetGiris; if (!g) return; g.value = onEk; g.focus(); }

  private sekmeSeridi(p: UiPencere, aktif: 'durum' | 'gorev' | 'klan' | 'dost' | 'baslik', ust = -31): void {
    const sirit = document.createElement('div');
    const w = p.boyut[0] - 6;
    Object.assign(sirit.style, { position: 'absolute', left: '3px', top: `${ust}px`, width: `${w}px`, display: 'flex', gap: '2px', zIndex: '3' });
    const adlar: [typeof aktif, string][] = [['durum', 'Character Report'], ['gorev', 'Quest'], ['klan', 'Clan'], ['dost', 'Friend']];
    for (const [kod, yazi] of adlar) {
      const b = document.createElement('div'); b.textContent = yazi;
      Object.assign(b.style, {
        flex: '1', height: '31px', lineHeight: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', font: '600 12px Segoe UI, Tahoma, sans-serif', color: '#fff', cursor: 'pointer', boxSizing: 'border-box',
        border: kod === aktif ? '2px solid #e9d9a4' : '2px solid #b9955a', borderRadius: '7px', textShadow: '0 1px 2px #000',
        background: kod === aktif ? 'linear-gradient(#5b6478,#2b3144 55%,#1c2030)' : 'linear-gradient(#3d4457,#1b1f2c 55%,#10131c)', boxShadow: 'inset 0 0 0 1px #0008, 0 1px 3px #000a',
      });
      b.addEventListener('click', () => { if (kod !== aktif) void this.sekmeGit(kod, p); });
      sirit.appendChild(b);
    }
    p.el.appendChild(sirit);
  }
  private static readonly SEKME_PENCERE = { gorev: 're_el_page_quest', klan: 're_el_clan_window', dost: 're_el_page_friend', baslik: 're_title_window' } as const;
  /** Sekme değiştirir: yeni pencere aynı yerde açılır, eskisi kapanır. */
  private async sekmeGit(hedef: 'durum' | 'gorev' | 'klan' | 'dost' | 'baslik', kaynak: UiPencere): Promise<void> {
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
    this.sekmeSeridi(p, 'durum', 52); // pencere resmi 83. pikselden başlar: sekmeler hemen üstüne oturur
    // Karakter (stat) penceresinin özgün tasarımında kapatma düğmesi yok: envanterdeki özgün çarpı kopyalanıp sol üste konur.
    const kaynakX = this.pencereler.envanter.el.querySelector<HTMLElement>('[data-id="btn_close"]');
    if (kaynakX) {
      const x = kaynakX.cloneNode(true) as HTMLElement;
      Object.assign(x.style, { left: '2px', top: '14px', zIndex: '5', display: '' });
      x.title = 'Close';
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      x.addEventListener('click', () => this.ac('durum', false));
      p.el.appendChild(x);
    }
    this.durumDuzeniReferans(p);
    p.gizleDesen(/^(icon_level_|btn_rebirth_preset|btn_preset|base_perks|Text_HP$|Text_MP$)/); // base_perks: Myko'nun ekstra özellik listesi (şimdilik yok)
    const harca = (ad: 'str' | 'sta' | 'dex' | 'int') => () => {
      if (this.b.statSunucu?.(ad)) return;
      if (this.b.oyuncu.statArtir(ad)) { this.b.statDegisti(); this.durumCiz(); }
    };
    p.tikla.set('btn_str', harca('str')); p.tikla.set('btn_sta', harca('sta'));
    p.tikla.set('btn_Dex', harca('dex')); p.tikla.set('btn_Int', harca('int'));
    p.tikla.set('btn_Magic', harca('int'));
    p.tikla.set('btn_reset_stat', () => {
      if (this.b.statSunucu?.('reset')) return;
      const iade = this.b.oyuncu.statSifirla();
      this.b.statDegisti(); this.durumCiz();
      this.b.mesaj(iade > 0 ? `Stat points reset: ${iade} points returned.` : 'There are no stat points to reset.');
    });
  }

  private durumCiz(): void {
    const p = this.pencereler.durum, o = this.b.oyuncu;
    p.metin('Text_Id', o.ad); p.metin('Text_Nation', 'El Morad'); p.metin('Text_Class', 'Warrior'); p.metin('Text_Race', 'Human');
    p.metin('Text_Level', o.seviye);
    // Referans düzen: Text_Exp satırı Hit Point, Text_RealmPoint Mana Point, Text_Cash Experience Points, Text_tl_Cash National Point gösterir.
    p.metin('Text_Exp', `${Math.ceil(o.can)} / ${o.enCok}`); p.metin('Text_RealmPoint', `${Math.ceil(o.mana)} / ${o.enCokMana}`);
    p.metin('Text_Cash', `${o.deneyim} / ${o.azamiDeneyimSunucu ?? gerekenDeneyim(o.seviye)}`); p.metin('Text_tl_Cash', 0);
    p.metin('Text_AP', o.toplamVurus()); p.metin('Text_GP', o.savunma());
    p.metin('Text_Weight', `${o.envanter.filter(Boolean).length} / 28`);
    p.metin('Text_BonusPoint', o.bonusPuan);
    p.metin('Text_Strength', o.stat.str); p.metin('Text_Stamina', o.stat.sta); p.metin('Text_Dexterity', o.stat.dex);
    { // sınıfın baskın statları (etiket ve değer) pastel okyanus mavisi
      const baskin = baskinStatlar(sinifMesleki(o.sinif)) as string[];
      const idler: [string, string[]][] = [['str', ['img_str', 'text_13', 'Text_Strength']], ['sta', ['img_sta', 'Text_Stamina']], ['dex', ['img_dex', 'text_15', 'Text_Dexterity']], ['int', ['img_int', 'text_16', 'Text_Intelligence']]];
      for (const [s, ids] of idler) for (const id of ids) for (const e of p.bul(id)) statRengiUygula(e, baskin.includes(s));
    }
    p.metin('Text_Intelligence', o.stat.int); p.metin('Text_MagicAttack', Math.max(0, o.stat.int - 30));
    p.metin('Text_Manner', 0);
    for (const d of ['btn_str', 'btn_sta', 'btn_Dex', 'btn_Int', 'btn_Magic']) p.dugmePasif(d, o.bonusPuan <= 0);
  }

  /**
   * Karakter penceresi, referans oyunun düzenine getirilir (kullanıcının gönderdiği ekran görüntüsü): isim, Level/Job, Nation/Race,
   * Hit Point, Mana Point, Experience Points, National Point, Attack/Defense, Manner, bonus puan, STR/HP, DEX/MP, INT, Resistance.
   * Anti Defence bölümü, Weight, Stat Point yazısı, Reset Stat ve Perks yoktur; direnç bloğu yukarı kayar.
   */
  private durumDuzeniReferans(p: UiPencere): void {
    const dugumler = [...p.el.children].filter((e): e is HTMLElement => e instanceof HTMLElement && e.classList.contains('ui-dugum'));
    const ust = (e: HTMLElement) => parseFloat(e.style.top) || 0;
    const ANTI_BAS = 366, DIRENC_BAS = 449, KAYMA = DIRENC_BAS - ANTI_BAS;
    for (const e of dugumler) {
      const t = ust(e);
      if (e.dataset.id && /^(btn_perks|btn_reset_stat)$/.test(e.dataset.id)) { e.style.display = 'none'; continue; }
      if (t >= ANTI_BAS && t < DIRENC_BAS - 1) e.style.display = 'none'; // Anti Defence bölümü
      else if (t >= DIRENC_BAS - 1) e.style.top = `${t - KAYMA}px`; // direnç bloğu yukarı
    }
    p.el.style.height = `${parseFloat(p.el.style.height || String(p.boyut[1])) - KAYMA}px`;
    p.gizleDesen(/^(text_10|Text_Weight|text_12)$/);
    // Satır başlıkları: eski Exp / National Point / Knight Cash / TL Balance satırları Hit Point / Mana Point / Experience Points / National Point olur.
    const yaz = (e: HTMLElement | undefined, s: string) => { if (!e) return; const sp = e.querySelector('span'); if (sp) sp.textContent = s; e.style.color = '#ffe98a'; e.style.justifyContent = 'flex-start'; e.style.fontWeight = 'bold'; e.querySelectorAll<HTMLElement>('*').forEach((c) => { c.style.color = '#ffe98a'; }); };
    yaz(p.alan('text_06'), 'Hit Point'); yaz(p.alan('Title_RealmPoint'), 'Mana Point');
    yaz(p.alan('Title_Cash', 0), 'Experience Points'); yaz(p.alan('Title_Cash', 1), 'National Point');
    for (const id of ['text_06', 'Title_RealmPoint']) { const e = p.alan(id); if (e) e.style.width = '130px'; }
    for (const i of [0, 1]) { const e = p.alan('Title_Cash', i); if (e) e.style.width = '130px'; }
    for (const id of ['Text_Cash', 'Text_tl_Cash', 'Text_Exp', 'Text_RealmPoint']) for (const c of p.bul(id)) c.querySelectorAll<HTMLElement>('*').forEach((k) => { k.style.color = '#fff'; });
    // Dört satırın değerleri aynı kutuda ve ortalı: (Text_Exp eskiden daha geniş/solda duruyordu)
    for (const id of ['Text_Exp', 'Text_RealmPoint', 'Text_Cash', 'Text_tl_Cash']) { const e = p.alan(id); if (e) { e.style.left = '103px'; e.style.width = '181px'; e.style.justifyContent = 'center'; } }
    for (const id of ['text_06', 'Title_RealmPoint']) { const e = p.alan(id); if (e) e.style.paddingLeft = '6px'; }
    for (const i of [0, 1]) { const e = p.alan('Title_Cash', i); if (e) e.style.paddingLeft = '6px'; }
    // Direnç satırları: uzun adlar hücreye sığsın, kenara yapışmasın
    for (let i = 18; i <= 23; i++) { const e = p.alan(`text_${i}`); if (e) { e.style.paddingLeft = '4px'; e.style.fontSize = '8.6px'; e.querySelectorAll<HTMLElement>('*').forEach((k) => { k.style.fontSize = '8.6px'; k.style.whiteSpace = 'nowrap'; }); } }
    // Weight satırı kalktığı için sol hücredeki boş simge kutusu zemin rengiyle kapatılır
    const dolgu = document.createElement('div');
    Object.assign(dolgu.style, { position: 'absolute', left: '7px', top: '266px', width: '46px', height: '17px', background: 'rgba(16,11,7,0.94)', pointerEvents: 'none', zIndex: '1' });
    p.el.appendChild(dolgu);
  }

  // ---------------------------------------------------------------- skill (K)
  private beceriKur(): void {
    const p = this.pencereler.beceri;
    p.gizleDesen(/^(img_|string_[4-7]$|string_skill_level|btn_(mage|ranger|blade|cleric|reaper|master|[4-7]$|EXbuf|preset|reset_skill))/); // sınıfa özel sekmeler/başlıklar; temel skill sayfasında görünmez
    p.tikla.set('btn_close', () => this.ac('beceri', false));
    p.goster('img_public');
    // Zemin resmi (363×151) uzmanlık puanı satırlarını (P kutuları) resmin içine çizer; temel skill sayfasında gerekmez: o bant kesilip düz panelle kapatılır
    const art = [...p.el.querySelectorAll<HTMLElement>('.ui-t4')].find((e) => e.style.width === '363px' && e.style.height === '151px' && e.style.left === '0px');
    if (art) {
      art.style.clipPath = 'inset(0 0 33.8% 0)'; // üst parça: 0..100
      const alt = art.cloneNode(false) as HTMLElement; alt.style.clipPath = 'inset(96.7% 0 0 0)'; art.after(alt); // alt şerit: 146..151
      const dolgu = document.createElement('div');
      Object.assign(dolgu.style, { position: 'absolute', left: '5px', top: `${parseFloat(art.style.top) + 100}px`, width: '352px', height: '46px', background: 'rgba(12,9,6,0.8)', borderTop: '1px solid #8a6a2a', borderBottom: '1px solid #8a6a2a', boxSizing: 'border-box', pointerEvents: 'none' });
      art.after(dolgu);
    }
    for (const m of ['Master']) p.gizleMetin(m);
    for (let i = 0; i < 8; i++) if (!p.alan(String(i))) { this.beceriYuvaSayisi = i; break; }
    // Fare tekerleği (Mouse3 topu): aşağı çevirince sonraki, yukarı çevirince önceki skill sayfası
    p.el.addEventListener('wheel', (ev) => { ev.preventDefault(); ev.stopPropagation(); const yon = ev.deltaY > 0 ? 1 : ev.deltaY < 0 ? -1 : 0; if (!yon) return; const once = this.beceriSayfa; this.beceriSayfa += yon; this.beceriListesiniYenile(); if (this.beceriSayfa !== once) this.beceriCiz(); }, { passive: false });
    p.tikla.set('btn_right', () => { this.beceriSayfa++; this.beceriListesiniYenile(); this.beceriCiz(); });
    p.tikla.set('btn_left', () => { this.beceriSayfa--; this.beceriListesiniYenile(); this.beceriCiz(); });
    for (let i = 0; i < 8; i++) {
      const alan = p.alan(String(i)); if (!alan) continue;
      alan.draggable = false;
      alan.addEventListener('click', () => { if (this.beceriler[i]) { this.seciliBeceri = i; this.beceriCiz(); } });
      this.skillIpucuBagla(alan, () => this.beceriler[i]?.no);
      alan.addEventListener('contextmenu', (e) => { e.preventDefault(); if (this.beceriler[i]) this.hizliKoy(this.beceriler[i].no); });
      alan.addEventListener('dblclick', () => { if (this.beceriler[i] && !this.pasifMi(this.beceriler[i].no)) this.b.beceriKullan(this.beceriler[i].no); });
    }
    p.metin('string_page', 1);
  }

  private beceriCiz(): void {
    const p = this.pencereler.beceri, o = this.b.oyuncu;
    p.metin('string_skillpoint', o.skillPuanlari[0] ?? 0);
    for (let t = 0; t < 4; t++) p.metin(`string_${4 + t}`, o.skillPuanlari[5 + t] ?? 0);
    const sayfaSayisi = Math.max(1, Math.ceil((this.sekmeBeceriler[this.beceriSekme]?.length ?? 0) / this.beceriYuvaSayisi));
    p.metin('string_page', this.beceriSayfa + 1);
    p.dugmePasif('btn_left', this.beceriSayfa <= 0); p.dugmePasif('btn_right', this.beceriSayfa >= sayfaSayisi - 1);
    for (let i = 0; i < 8; i++) {
      const b = this.beceriler[i];
      p.metin(`string_list_${i}`, b ? `${b.ad}\nLv. ${b.seviye}` : '');
      const alan = p.alan(String(i)); if (!alan) continue;
      alan.style.backgroundImage = b?.simge ? `url(/beceri/${b.simge})` : '';
      alan.style.backgroundSize = '100% 100%';
      alan.style.opacity = b && !this.beceriAcik(b) ? '0.4' : '1';
      alan.style.outline = b && i === this.seciliBeceri ? '1px solid #f0d48a' : '';
      alan.removeAttribute('title');
    }
    const s = this.beceriler[this.seciliBeceri];
    p.metin('string_info', s ? s.aciklama : '');
    p.metin('string_skill_mp', s ? (this.pasifMi(s.no) ? 'Passive skill' : `MP ${s.msp}`) : '');
    const agac = (s?.sayfa ?? 0) % 10, agacta = agac >= 5 && agac <= 8;
    p.metin('string_skill_vp', s ? (agacta ? `Required points ${s.seviye}` : `Required level ${s.seviye}`) : '');
    p.metin('string_skill_point', s ? (this.beceriAcik(s) ? 'Available' : 'Not available yet') : '');
    p.metin('string_skill_item0', s ? this.beceriHasarYazisi(s.no) : ''); p.metin('string_skill_item1', s ? this.beceriSureYazisi(s.no) : ''); p.metin('string_skill_item2', '');
  }

  // ---------------------------------------------------------------- envanter (I)
  private envanterKur(): void {
    const p = this.pencereler.envanter;
    p.tikla.set('btn_close', () => this.ac('envanter', false)); // sağ üstteki çarpı
    p.gizleDesen(/(_bag|string_Bag|btn_bag|PreView|close_cos|Emblem|Pathos|helmetview|ecli666|TrashLock|^btn_gold$|^base_(inven_notice|bag|LockImg|cos)$)/);
    for (let i = 28; i <= 39; i++) p.goster(String(i), false);
    this.copKur(p);
    this.envanterSurukleKur(p);
    // Karakter alanı: animasyonlu oyuncu önizlemesi
    const kap = p.bul('area_char')[0];
    if (kap && this.b.oyuncu.modelNo) { this.onizleme = new KarakterOnizleme(kap, this.b.oyuncu.modelNo); void this.onizleme.baslat(); }
  }

  /**
   * Çöp (Destroy) yuvası: ekipman ızgarasının sağ altındaki kırmızı yuva. Bir eşya (çantadan ya da giyiliden) üstüne sürüklenip bırakılınca
   * oyunun kendi "Destroy" onay penceresi açılır; Yes derse eşya yok edilir.
   */
  private copHedefleri: HTMLElement[] = [];
  private copaBirak: (k: YuvaKonumu) => void = () => {};
  /** Envanterde SOL tuşla sürükle-bırak (fare olaylarıyla; tarayıcının HTML5 sürüklemesine bağlı değil): çanta ↔ çanta, çanta ↔ ekipman, çöp yuvası. */
  private envanterSurukleKur(p: UiPencere): void {
    type Hedef = YuvaKonumu | { tur: 'cop' };
    yuvaSurukle<Hedef>(p.el, {
      yuvaBul: (h) => {
        const hedef = h as HTMLElement | null; if (!hedef?.closest) return null;
        if (this.copHedefleri.some((c) => c === hedef || c.contains(hedef))) return { tur: 'cop' };
        const el = hedef.closest('.ui-t9') as HTMLElement | null; if (!el) return null;
        const c = this.canta().indexOf(el); if (c >= 0) return { tur: 'c', i: c };
        for (let id = 0; id < 14; id++) if (this.ekipman(id) === el) return { tur: 'e', i: id };
        return null;
      },
      kaynakEleman: (k) => {
        if (k.tur === 'cop') return null;
        const o = this.b.oyuncu;
        if (k.tur === 'c') return o.envanter[k.i] ? this.canta()[k.i] ?? null : null;
        return o.ekipman[k.i] ? this.ekipman(k.i) ?? null : null;
      },
      birak: (k, h) => {
        if (k.tur === 'cop' || !h) return;
        this.b.ipucuGizle();
        if (h.tur === 'cop') this.copaBirak(k); else this.b.esyaTasi(k, h);
      },
    });
  }
  private copKur(p: UiPencere): void {
    // Hedef: oyunun kendi kırmızı "destroy" yuvası (area_samma; aynı yerdeki 14 numaralı alan da dinler).
    const hedefler = [...p.bul('area_samma'), ...p.bul('14')]; for (const h of hedefler) h.title = 'Drag an item here to destroy it';
    p.gizleDesen(/Destroy/); // onay penceresi (oyunun kendi resimleri) yalnızca bırakınca açılır
    const goster = (a: boolean) => p.gizleDesen(/^(Destroy|img_Destroy_.*|string_Destroy|btn_Destroy_.*)$/, !a);
    let bekleyen: YuvaKonumu | null = null;
    this.copHedefleri = hedefler;
    this.copaBirak = (k) => {
      const e = k.tur === 'c' ? this.b.oyuncu.envanter[k.i] : this.b.oyuncu.ekipman[k.i]; if (!e) return;
      bekleyen = k; p.metin('string_Destroy', `Are you sure you want to destroy ${e.ad}?`); goster(true);
    };
    p.tikla.set('btn_Destroy_ok', () => { goster(false); if (bekleyen) this.b.esyaAt?.(bekleyen); bekleyen = null; });
    p.tikla.set('btn_Destroy_cancel', () => { goster(false); bekleyen = null; });
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
    const imza = `${o.envanter.map((e) => `${e?.no ?? 0}x${e?.adet ?? 1}d${e?.suru ?? ''}`).join(',')}|${o.ekipman.map((e) => `${e?.no ?? 0}d${e?.suru ?? ''}`).join(',')}|${o.altin}|${this.tamirModu}`;
    if (imza === this.sonEnvanterImza) return;
    this.sonEnvanterImza = imza;
    const yuvaCiz = (el: HTMLElement, e: EsyaTanimi | null, konum: YuvaKonumu, sagTik?: () => void) => {
      el.style.backgroundImage = e ? `url(${e.simge})` : ''; el.dataset.adet = (e?.adet ?? 1) > 1 ? String(e!.adet) : '';
      el.style.backgroundSize = ESYA_SIMGE; el.style.backgroundPosition = '0 0';
      const tamirUcreti = e && this.tamirModu ? tamirUcretiHesapla(e) : 0;
      el.onmouseenter = e ? (ev) => this.b.ipucuGoster(e, ev, false, tamirUcreti) : null;
      el.onmouseleave = () => this.b.ipucuGizle();
      el.onclick = this.tamirModu && e ? () => this.b.tamirEt?.(konum) : null;
      // SAĞ tık: giy / çıkar (mağaza açıkken çanta eşyası satılır). SOL tuşla sürükle-bırak: yuvalar arası taşı / yer değiştir.
      el.oncontextmenu = (ev) => { ev.preventDefault(); if (sagTik) { this.b.ipucuGizle(); sagTik(); } };
      el.draggable = false; // sürükleme fare olaylarıyla (envanterSurukleKur) yapılır
    };
    // Mağaza açıkken çanta eşyasına tıklamak onu NPC'ye satar; değilse kuşanır
    this.canta().forEach((el, i) => yuvaCiz(el, o.envanter[i] ?? null, { tur: 'c', i }, o.envanter[i] ? () => (this.magazaYeni?.acik ? this.b.magazaSat(i) : this.b.esyaKusan(i)) : undefined));
    for (let yuva = 0; yuva < 14; yuva++) { // 14 = Destroy (çöp) yuvası: eşya konmaz
      const el = this.ekipman(yuva);
      if (el) yuvaCiz(el, o.ekipman[yuva], { tur: 'e', i: yuva }, o.ekipman[yuva] ? () => this.b.esyaCikar(yuva) : undefined);
    }
    p.metin('text_gold', o.altin.toLocaleString('en-US'));
    p.metin('text_weight', `${o.envanter.filter(Boolean).length} / 28`);
  }

  // ---------------------------------------------------------------- her kare
  guncelle(dt: number): void {
    const o = this.b.oyuncu, h = this.hpbar;
    this.simgeleriUygula();
    this.cubukCiz();
    this.buffleriCiz();
    this.fpsSayac += dt;
    if (this.fpsSayac > 0.5) { this.fps = Math.round(1 / Math.max(dt, 1e-4)); this.fpsSayac = 0; h.metin('text_fps', `${this.fps} fps`); }
    h.metin('Text_HP', `${Math.ceil(o.can)}/${o.enCok}`); h.metin('Text_MSP', `${Math.ceil(o.mana)}/${o.enCokMana}`);
    h.ilerleme('progress_HP', o.can / o.enCok); h.ilerleme('progress_msp', o.mana / o.enCokMana);
    const g = o.azamiDeneyimSunucu ?? gerekenDeneyim(o.seviye);
    h.metin('text_Nick', o.ad);
    h.ilerleme('progress_exp', o.deneyim / g); h.metin('Text_ExpP', `${((o.deneyim / g) * 100).toFixed(1)}%`);
    h.metin('text_Level', `Level ${o.seviye}`);
    h.metin('text_cordinate', `${o.konum.x.toFixed(0)}, ${o.konum.y.toFixed(0)}`);
    if (this.minimapCiz && this.genel.acik('re_minimap')) this.minimapCiz();
    if (this.partiPenceresi && this.genel.acik('re_el_party')) this.partiCiz(this.partiPenceresi);
    if (this.acik.has('durum')) this.durumCiz();
    if (this.acik.has('beceri')) this.beceriCiz();
    this.hedefCiz(); this.ganimetCiz();
    this.magazaYeni?.ciz();
    if (this.acik.has('depo')) this.depoCiz();
    if (this.acik.has('envanter')) { this.envanterCiz(); this.onizleme?.ciz(dt, this.b.oyuncu.ekipman[6]?.no ?? 0, this.b.oyuncu.ekipman[8]?.no ?? 0, giyimEkipmani(this.b.oyuncu.ekipman)); }
  }
}
