// Giriş ve karakter seçim ekranı (Aşama 4): oyunun kendi pencereleri (`re_login_intro`, `re_characterselect`) tam ekran bir katmanda gösterilir.
// Akış: hesap/şifre → sunucuya bağlan → karakter seç → oyuna gir. Gerçek bağlantı `baglan` ile dışarıdan verilir (bu dosya yalnızca arayüzdür).
import { UiPencere } from './orijinal';
import { KarakterOlustur } from './karakterOlustur';
import type { OlusturmaAraclari } from '../ag/sunucu';
import { kurallar, IRK_MODELLERI } from '../oyun/veri';
import { SecimEkrani } from './secimEkrani';
import { IRK_MESLEKLERI, YENI_KARAKTER_MESAJLARI, sinifKodu } from '../../../kopru/protokol/olustur.ts';

/** `/swap <karakter>` komutunun sessionStorage'a bıraktığı hedef: yeniden girişte bu karakter seçilir. */
export const SWAP_ANAHTARI = 'ke_swap_karakter';
/** Yönetici karakterin adı: hesapta yoksa `/swap admin` onu hesabın ulusunda oluşturur; GM yetkilerini veritabanı (USERDATA tetikleyicisi) verir. */
const YONETICI_ADI = 'admin';

/** Karakter seçim ekranında gösterilecek özet (sunucu karakter listesinden). */
export interface SecimKarakteri { ad: string; seviye: number; sinif: number; }

/** Giriş iptal edildi (geri düğmesi): hata olarak gösterilmez. */
export class GirisIptal extends Error {}

export interface GirisBaglami {
  kok: HTMLElement;
  /** Sunucuya bağlanır. Karakter listesi gelince `sec` çağrılır; seçilen karakterin adı döndürülür. Hata fırlatırsa iletisi ekranda gösterilir. */
  baglan: (hesap: string, sifre: string, sec: (karakterler: SecimKarakteri[], araclar: OlusturmaAraclari) => Promise<string>) => Promise<void>;
  /** Bağlanmadan tek oyunculu oynamak için ekran kapatıldı. */
  cevrimdisi: () => void;
}

/** Sınıf numarası → görünen ad (GameDef.h e_Class: 1xx Karus, 2xx El Morad). */
const SINIF_ADI: Record<number, string> = {
  101: 'Warrior', 102: 'Rogue', 103: 'Magician', 104: 'Priest', 105: 'Berserker', 106: 'Guardian', 107: 'Hunter', 108: 'Penetrator', 109: 'Sorcerer', 110: 'Necromancer', 111: 'Shaman', 112: 'Darkpriest',
  201: 'Warrior', 202: 'Rogue', 203: 'Mage', 204: 'Priest', 205: 'Blade', 206: 'Protector', 207: 'Ranger', 208: 'Assassin', 209: 'Mage', 210: 'Enchanter', 211: 'Cleric', 212: 'Druid',
};
export const sinifAdi = (no: number): string => SINIF_ADI[no] ?? `Class ${no}`;

const SAHNE_GENISLIK = 1024, SAHNE_YUKSEKLIK = 768;
const KAYIT_HESAP = 'ke_giris_hesap';
/** Kayıtlı şifre (yalnızca bu tarayıcının localStorage'ı; "Remember" açıkken): F5 ile otomatik giriş için. Silmek için adrese ?unut=1 eklenir. */
const KAYIT_SIFRE = 'ke_giris_sifre';
const oku = (k: string): string => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };

export class GirisEkrani {
  private katman = document.createElement('div');
  private sahne = document.createElement('div');
  private giris: UiPencere | null = null;
  private secimUi!: SecimEkrani; private secimUlus: 'ka' | 'el' = 'ka';
  private durumYazisi = document.createElement('div');
  /** Otomatik girişte (F5, /swap, portal) giriş paneli ve seçim sahnesi gösterilmez; yerine bu yazı çıkar (ekranda titreme/yanıp sönme olmasın). */
  private ortaYazi = document.createElement('div');
  private sahneGizle(): void {
    this.sahne.style.visibility = 'hidden';
    Object.assign(this.ortaYazi.style, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffe46b', font: 'bold 16px Verdana, Arial, sans-serif', textShadow: '0 1px 3px #000, 0 0 6px #000', pointerEvents: 'none' });
    this.ortaYazi.textContent = 'Entering the game…';
    if (!this.ortaYazi.isConnected) this.katman.appendChild(this.ortaYazi);
  }
  /** Otomatik giriş yarıda kalırsa (hata, karakter yok, birden çok karakter) normal ekran geri gelir. */
  private sahneAc(): void { this.sahne.style.visibility = ''; this.ortaYazi.remove(); }
  private idKutusu!: HTMLInputElement;
  private sifreKutusu!: HTMLInputElement;
  private hatirla = true;
  private mesgul = false;
  /** Kayıtlı hesapla otomatik girişte karakter seçimi de atlanır (tek karakter varsa doğrudan oyuna girilir). */
  private otomatik = false;
  private cevrimdisiEl: HTMLElement | null = null;
  private yenidenBoyutla = () => this.yerlestir();

  constructor(private b: GirisBaglami) {}

  /** Ekranı açar; yüklenemezse false (çağıran oyunu doğrudan gösterir). */
  async ac(): Promise<boolean> {
    try {
      this.giris = await UiPencere.yukle('re_login_intro');
    } catch (e) { console.warn('Giriş ekranı yüklenemedi', e); return false; }
    Object.assign(this.katman.style, { position: 'fixed', inset: '0', background: '#000', zIndex: '9000', overflow: 'hidden' });
    Object.assign(this.sahne.style, { position: 'absolute', left: '0', top: '0', width: `${SAHNE_GENISLIK}px`, height: `${SAHNE_YUKSEKLIK}px`, transformOrigin: '0 0' });
    this.katman.appendChild(this.sahne);
    this.giris.gizleDesen(/^Rose Anim$/); // Myko'nun gül animasyonu kaldırıldı: orijinal (resmî) giriş görseli kullanılır (araclar/arayuz/giris-orijinal.ts)
    this.girisKur(this.giris);
    this.secimKur();
    this.durumKur();
    this.sahne.append(this.giris.el, this.durumYazisi);
    this.secimUi = new SecimEkrani(this.katman); // karakter seçim ekranı (tam ekran 3B taht odası): karakterSec'te gösterilir
    this.b.kok.appendChild(this.katman);
    addEventListener('resize', this.yenidenBoyutla);
    this.yerlestir();
    this.idKutusu.focus();
    if (new URLSearchParams(location.search).has('unut')) { try { localStorage.removeItem(KAYIT_SIFRE); } catch { /* depolama kapalı */ } this.durum('Saved login was removed.'); }
    else if (this.idKutusu.value && oku(KAYIT_SIFRE)) { // kayıtlı hesap ve şifre varsa F5 yeterli: otomatik giriş
      this.sifreKutusu.value = atob(oku(KAYIT_SIFRE)); this.otomatik = true; this.sahneGizle(); setTimeout(() => void this.girisYap(), 150);
    }
    return true;
  }

  kapat(): void {
    this.secimTemizle();
    removeEventListener('resize', this.yenidenBoyutla);
    this.katman.remove();
  }

  /** 1024×768'lik sahneyi pencereye orantılı sığdırır (kenarlar siyah). */
  private yerlestir(): void {
    const ol = Math.min(innerWidth / SAHNE_GENISLIK, innerHeight / SAHNE_YUKSEKLIK);
    this.sahne.style.scale = String(ol);
    this.sahne.style.left = `${(innerWidth - SAHNE_GENISLIK * ol) / 2}px`;
    this.sahne.style.top = `${(innerHeight - SAHNE_YUKSEKLIK * ol) / 2}px`;
  }

  // ---------------------------------------------------------------- giriş penceresi
  private girisKur(p: UiPencere): void {
    p.el.style.left = '0'; p.el.style.top = '0';
    // Bu sürümde kullanılmayanlar: sunucu listesi (sunucu tek, girişten sonra bilinir), krallar/duyurular, boş kutular
    for (const id of ['Group_ServerListSub', 'Group_introduction_el', 'Group_introduction_ka', 'Group_Notice_1', 'Group_Notice_2', 'Group_Notice_3', 'premium', 'btn_homepage']) p.gizle(id);
    p.metin('copyright', 'KnightEmpire');
    this.sunucuListesiKur(p);
    this.idKutusu = this.kutuKoy(p, 'Edit_ID', 'text');
    this.sifreKutusu = this.kutuKoy(p, 'Edit_PW', 'password');
    try { this.idKutusu.value = localStorage.getItem(KAYIT_HESAP) ?? ''; } catch { /* depolama kapalı */ }
    const gonder = () => void this.girisYap();
    p.tikla.set('btn_ok', gonder);                       // (yinelenen kimlik: gerçek giriş düğmesi sonuncusu)
    p.tikla.set('Btn_Cancel', () => { this.sifreKutusu.value = ''; this.idKutusu.value = ''; this.durum(''); this.idKutusu.focus(); });
    p.tikla.set('Btn_Option', () => this.durum('Options are not available yet.'));
    p.tikla.set('btn_remember', () => { this.hatirla = !this.hatirla; for (const el of p.bul('btn_remember')) el.style.opacity = this.hatirla ? '1' : '0.45'; });
    for (const k of [this.idKutusu, this.sifreKutusu]) k.addEventListener('keydown', (e) => { if (e.key === 'Enter') gonder(); });
    // Bağlanmadan oynamak isteyenler için küçük bağlantı (orijinalde yok; tek oyunculu mod bunsuz erişilemezdi)
    const cevrimdisi = document.createElement('div');
    cevrimdisi.textContent = 'Play offline (single player)';
    Object.assign(cevrimdisi.style, { position: 'absolute', left: '700px', top: '668px', width: '300px', textAlign: 'right', color: '#bbb', font: '12px Verdana, Arial, sans-serif', cursor: 'pointer', textDecoration: 'underline', textShadow: '0 1px 2px #000' });
    cevrimdisi.addEventListener('click', () => { this.kapat(); this.b.cevrimdisi(); });
    p.el.appendChild(cevrimdisi); this.cevrimdisiEl = cevrimdisi;
  }

  // ---------------------------------------------------------------- sunucu seçimi (orijinal sunucu listesi paneli)
  private swapVarMi(): boolean { try { return !!sessionStorage.getItem(SWAP_ANAHTARI); } catch { return false; } }
  private sunucuAcilis = 0;
  private sunucuKarari: ((tamam: boolean) => void) | null = null;
  /** Oyunun kendi sunucu listesi paneli (re_login_intro / Group_ServerList_01): tek sunucu "ATAKUM". */
  private sunucuListesiKur(p: UiPencere): void {
    p.gizle('Group_ServerList_01');
    for (let i = 2; i <= 20; i++) { p.gizle(`server_${i}`); p.gizle(`Btn_list_${i}`); }
    p.metin('server_1', 'ATAKUM');
    p.dugmeBasili('Btn_list_1', true); // tek sunucu: seçili
    const bitir = (tamam: boolean) => { const k = this.sunucuKarari; this.sunucuKarari = null; p.gizle('Group_ServerList_01'); if (k) k(tamam); };
    p.tikla.set('Btn_Connect', () => bitir(true));
    for (const e of p.bul('Btn_list_1')) e.addEventListener('dblclick', () => bitir(true));
    addEventListener('keydown', (e) => {
      if (!this.sunucuKarari || performance.now() - this.sunucuAcilis < 300) return; // şifre kutusundaki Enter paneli açan olayın kendisidir
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); bitir(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); bitir(false); }
    }, true);
  }
  private sunucuSec(): Promise<boolean> {
    const p = this.giris!;
    this.sunucuAcilis = performance.now();
    p.gizle('Group_Login'); p.goster('Group_ServerList_01'); this.durum('Select a server (double-click or press Enter to connect, Esc to go back).');
    return new Promise<boolean>((coz) => {
      this.sunucuKarari = (t) => { p.goster('Group_Login'); this.durum(''); coz(t); };
    });
  }

  /** Giriş çubuğundaki yazı alanının üstüne gerçek bir <input> koyar. */
  private kutuKoy(p: UiPencere, id: string, tur: 'text' | 'password'): HTMLInputElement {
    const alan = p.alan(id); if (!alan) throw new Error(`Alan yok: ${id}`);
    const i = document.createElement('input'); i.type = tur; i.maxLength = 30; i.spellcheck = false; i.autocomplete = tur === 'password' ? 'current-password' : 'username';
    Object.assign(i.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', boxSizing: 'border-box', padding: '0 5px', background: 'transparent', border: '0', outline: '0', color: '#fff', font: '13px Verdana, Arial, sans-serif', pointerEvents: 'auto', userSelect: 'text' });
    alan.style.pointerEvents = 'auto'; alan.appendChild(i);
    return i;
  }

  private durumKur(): void {
    Object.assign(this.durumYazisi.style, { position: 'absolute', left: '21px', top: '606px', width: '978px', textAlign: 'center', color: '#ffe46b', font: 'bold 14px Verdana, Arial, sans-serif', textShadow: '0 1px 3px #000, 0 0 6px #000', pointerEvents: 'none', minHeight: '18px' });
  }
  private durum(m: string): void { this.durumYazisi.textContent = m; this.secimUi?.durum(m); if (m && this.ortaYazi.isConnected) this.ortaYazi.textContent = m; }

  private async girisYap(): Promise<void> {
    if (this.mesgul) return;
    const hesap = this.idKutusu.value.trim(), sifre = this.sifreKutusu.value;
    if (!hesap || !sifre) { this.durum('Enter your ID and password.'); (hesap ? this.sifreKutusu : this.idKutusu).focus(); return; }
    // Sunucu seçimi (orijinal Group_ServerList_01): otomatik giriş (F5) ve /swap ile karakter değişimi bu ekranı atlar
    if (!this.otomatik && !this.swapVarMi()) {
      this.mesgul = true;
      const tamam = await this.sunucuSec();
      this.mesgul = false;
      if (!tamam) { this.idKutusu.focus(); return; }
    }
    this.mesgul = true; this.idKutusu.disabled = this.sifreKutusu.disabled = true; this.durum('Connecting…');
    try {
      // /swap ve portal: sayfa yenilenirken eski oturum sunucuda hemen kapanmaz ("already in the game"); kapanana kadar otomatik yeniden denenir
      for (let deneme = 0; ; deneme++) {
        try { await this.b.baglan(hesap, sifre, (k, a) => this.karakterSec(k, a)); break; }
        catch (e) {
          if (deneme >= 12 || !/already in the game/i.test((e as Error).message ?? '') || !(this.otomatik || this.swapVarMi())) throw e;
          this.durum('Waiting for the previous session to close…'); await new Promise((r) => setTimeout(r, 2500));
        }
      }
      try { if (this.hatirla) { localStorage.setItem(KAYIT_HESAP, hesap); localStorage.setItem(KAYIT_SIFRE, btoa(sifre)); } else { localStorage.removeItem(KAYIT_HESAP); localStorage.removeItem(KAYIT_SIFRE); } } catch { /* depolama kapalı */ }
      this.kapat();
    } catch (e) {
      this.sahneAc(); this.girisGoster(); this.otomatik = false;
      if (!(e instanceof GirisIptal)) this.durum((e as Error).message || 'Connection failed.');
      else this.durum('');
      this.sifreKutusu.value = ''; this.sifreKutusu.focus();
    } finally {
      this.mesgul = false; this.idKutusu.disabled = this.sifreKutusu.disabled = false;
    }
  }

  // ---------------------------------------------------------------- karakter seçimi
  private karakterIstegi: { coz: (ad: string) => void; hata: (e: Error) => void } | null = null;

  private secimKur(): void {
    const ui = this.secimUi;
    void ui;
  }

  private girisGoster(): void {
    this.secimUi.gizle(); this.sahne.style.display = ''; this.giris!.goster('Group_Login'); this.giris!.goster('copyright'); this.giris!.el.style.display = ''; if (this.cevrimdisiEl) this.cevrimdisiEl.style.display = '';
  }

  /** Bağlantı açıkken karakter oluşturma ekranını açar; oluşturulan karakterin adı ya da iptalde null. */
  private async olusturAc(araclar: OlusturmaAraclari, yuva: number): Promise<string | null> {
    this.secimUi.gizle(); this.giris!.gizle('Group_Login'); this.giris!.gizle('copyright');
    this.sahne.style.visibility = 'hidden'; // oluşturma ekranı kendi tam ekran katmanını açar
    try { return await new KarakterOlustur({ kok: this.b.kok, araclar, baslangic: kurallar?.yeniKarakter ?? {}, yuva }).ac(); }
    finally { this.sahne.style.visibility = ''; this.secimUi.goster(this.secimUlus); }
  }

  /** `/swap` ile bırakılan hedef karakter adı (bir kez okunur ve silinir); yoksa boş. */
  private swapHedefi(): string {
    try { const a = sessionStorage.getItem(SWAP_ANAHTARI) ?? ''; sessionStorage.removeItem(SWAP_ANAHTARI); return a; } catch { return ''; }
  }

  /** Hedef karakter hesapta varsa seçer; "admin" ise ve yoksa hesabın ulusunda oluşturup seçer. Olmazsa iletiyi gösterir, seçim ekranı kullanıcıda kalır. */
  private async swapYap(hedef: string, araclar: OlusturmaAraclari, coz: (ad: string) => void): Promise<boolean> {
    try {
      let yuvalar = await araclar.yenile();
      let bulunan = yuvalar.find((y) => y.ad && y.ad.toLowerCase() === hedef.toLowerCase())?.ad;
      if (!bulunan && hedef.toLowerCase() === YONETICI_ADI) {
        const ilk = yuvalar.find((y) => y.ad), yuva = yuvalar.findIndex((y) => !y.ad);
        if (!ilk || yuva < 0) { this.durum(ilk ? 'There is no free character slot for the admin character.' : 'Create a character first.'); return false; }
        const izinli = IRK_MESLEKLERI[ilk.irk] ?? [1], meslek = (izinli.includes(1) ? 1 : izinli[0]) as 1 | 2 | 3 | 4, sinif = sinifKodu(ilk.irk, meslek);
        const t = kurallar?.yeniKarakter?.[String(ilk.irk * 10000 + sinif)];
        const stat = t ? { str: t.str, sta: t.sta, dex: t.dex, int: t.int, cha: t.cha } : { str: 60, sta: 60, dex: 60, int: 60, cha: 60 };
        stat.str += 300 - (stat.str + stat.sta + stat.dex + stat.int + stat.cha); // kalan bonus puan güce
        this.durum('Creating the admin character…');
        const kod = await araclar.olustur({ yuva, ad: YONETICI_ADI, irk: ilk.irk, sinif, yuz: ilk.yuz, sac: ilk.sac, ...stat });
        if (kod !== 0) { this.durum(YENI_KARAKTER_MESAJLARI[kod] ?? `The admin character could not be created (code ${kod}).`); return false; }
        yuvalar = await araclar.yenile();
        bulunan = yuvalar.find((y) => y.ad && y.ad.toLowerCase() === YONETICI_ADI)?.ad;
      }
      if (bulunan) { this.durum('Entering the game…'); coz(bulunan); return true; }
      this.durum(`Character "${hedef}" was not found on this account.`);
      return false;
    } catch (e) { this.durum((e as Error).message || 'Switching characters failed.'); return false; }
  }

  // ---------------------------------------------------------------- karakter seçim ekranı (SecimEkrani)
  private secimTusu: ((e: KeyboardEvent) => void) | null = null;
  private secimTemizle(): void {
    if (this.secimTusu) { removeEventListener('keydown', this.secimTusu, true); this.secimTusu = null; }
    this.secimUi?.kapat();
  }

  private karakterSec(ilk: SecimKarakteri[], araclar: OlusturmaAraclari): Promise<string> {
    const ui = this.secimUi;
    return new Promise<string>((coz, hata) => {
      let liste = ilk, dolu = liste.filter((k) => k.ad), sira = 0;
      const irkler = new Map<string, number>(); // karakter adı → ırk (3B modeli için)
      const goster = () => {
        if (!dolu.length) { ui.bilgi('', '', ''); ui.oklariGoster(false); return; }
        const k = dolu[sira];
        this.secimUlus = k.sinif < 200 ? 'ka' : 'el';
        ui.goster(this.secimUlus); this.sahne.style.display = 'none'; // giriş resmi yerine 3B oda
        ui.bilgi(k.ad, k.seviye, sinifAdi(k.sinif)); ui.oklariGoster(dolu.length > 1);
        void ui.karakterGoster(IRK_MODELLERI[irkler.get(k.ad.toLowerCase()) ?? (k.sinif < 200 ? 1 : 12)] ?? IRK_MODELLERI[12]);
      };
      const olustur = async () => {
        const yuva = liste.findIndex((k) => !k.ad);
        if (yuva < 0) { this.durum('There is no free character slot.'); return; }
        const ad = await this.olusturAc(araclar, yuva);
        if (!ad) return;
        liste = (await araclar.yenile()).map((y) => ({ ad: y.ad, seviye: y.seviye, sinif: y.sinif })); dolu = liste.filter((k) => k.ad);
        sira = Math.max(0, dolu.findIndex((k) => k.ad.toLowerCase() === ad.toLowerCase())); goster(); this.durum('');
      };
      ui.tikla.create = () => void olustur();
      ui.tikla.back = () => this.karakterIstegi?.hata(new GirisIptal());
      ui.tikla.exit = () => this.karakterIstegi?.hata(new GirisIptal());
      ui.tikla.left = () => { if (dolu.length) { sira = (sira + dolu.length - 1) % dolu.length; goster(); } };
      ui.tikla.right = () => { if (dolu.length) { sira = (sira + 1) % dolu.length; goster(); } };
      // Start ya da Enter: karakter kameraya doğru yürür, ardından oyuna girilir (klasik yükleme ekranı)
      let yuruyor = false;
      const baslat = async () => {
        if (!dolu.length) { this.durum('Create a character first.'); return; }
        if (yuruyor) return; yuruyor = true;
        this.durum('Entering the game…');
        try { await ui.yuruBaslat(); } catch { /* sahne yoksa doğrudan gir */ }
        coz(dolu[sira].ad);
      };
      ui.tikla.start = () => void baslat();
      this.secimTusu = (e: KeyboardEvent) => { if (e.key === 'Enter' && this.sahne.style.visibility !== 'hidden' && ui.el.style.display !== 'none' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); e.stopPropagation(); void baslat(); } };
      addEventListener('keydown', this.secimTusu, true);
      void araclar.yenile().then((l) => { for (const y of l) if (y.ad) irkler.set(y.ad.toLowerCase(), y.irk); goster(); }).catch(() => undefined);
      this.karakterIstegi = { coz, hata: (e) => { this.karakterIstegi = null; hata(e); } };
      // Giriş çubuğu ve telif satırı gizlenir
      this.giris!.gizle('Group_Login'); this.giris!.gizle('copyright'); if (this.cevrimdisiEl) this.cevrimdisiEl.style.display = 'none';
      this.durum('');
      const swap = this.swapHedefi();
      if (swap) { void this.swapYap(swap, araclar, coz).then((tamam) => { if (!tamam) { this.sahneAc(); goster(); } }); return; } // /swap: seçim ekranı atlanır; olmazsa normal seçim ekranı kalır
      if (this.otomatik && dolu.length === 1) { this.durum('Entering the game…'); coz(dolu[0].ad); return; } // F5 otomatik giriş: tek karakter doğrudan oyuna girer
      this.sahneAc(); goster(); // otomatik giriş burada kaldıysa (birden çok karakter ya da boş hesap) seçim ekranı görünür
      if (!dolu.length) void olustur(); // boş hesap: doğrudan karakter oluşturma ekranı
    });
  }
}
