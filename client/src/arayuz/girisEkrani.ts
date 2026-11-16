// Giriş ve karakter seçim ekranı (Aşama 4): oyunun kendi pencereleri (`re_login_intro`, `re_characterselect`) tam ekran bir katmanda gösterilir.
// Akış: hesap/şifre → sunucuya bağlan → karakter seç → oyuna gir. Gerçek bağlantı `baglan` ile dışarıdan verilir (bu dosya yalnızca arayüzdür).
import { UiPencere } from './orijinal';

/** Karakter seçim ekranında gösterilecek özet (sunucu karakter listesinden). */
export interface SecimKarakteri { ad: string; seviye: number; sinif: number; }

/** Giriş iptal edildi (geri düğmesi): hata olarak gösterilmez. */
export class GirisIptal extends Error {}

export interface GirisBaglami {
  kok: HTMLElement;
  /** Sunucuya bağlanır. Karakter listesi gelince `sec` çağrılır; seçilen karakterin adı döndürülür. Hata fırlatırsa iletisi ekranda gösterilir. */
  baglan: (hesap: string, sifre: string, sec: (karakterler: SecimKarakteri[]) => Promise<string>) => Promise<void>;
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

export class GirisEkrani {
  private katman = document.createElement('div');
  private sahne = document.createElement('div');
  private giris: UiPencere | null = null;
  private secim: UiPencere | null = null;
  private durumYazisi = document.createElement('div');
  private idKutusu!: HTMLInputElement;
  private sifreKutusu!: HTMLInputElement;
  private hatirla = true;
  private mesgul = false;
  private cevrimdisiEl: HTMLElement | null = null;
  private yenidenBoyutla = () => this.yerlestir();

  constructor(private b: GirisBaglami) {}

  /** Ekranı açar; yüklenemezse false (çağıran oyunu doğrudan gösterir). */
  async ac(): Promise<boolean> {
    try {
      [this.giris, this.secim] = await Promise.all([UiPencere.yukle('re_login_intro'), UiPencere.yukle('re_characterselect')]);
    } catch (e) { console.warn('Giriş ekranı yüklenemedi', e); return false; }
    Object.assign(this.katman.style, { position: 'fixed', inset: '0', background: '#000', zIndex: '9000', overflow: 'hidden' });
    Object.assign(this.sahne.style, { position: 'absolute', left: '0', top: '0', width: `${SAHNE_GENISLIK}px`, height: `${SAHNE_YUKSEKLIK}px`, transformOrigin: '0 0' });
    this.katman.appendChild(this.sahne);
    this.girisKur(this.giris);
    this.secimKur(this.secim);
    this.durumKur();
    this.sahne.append(this.giris.el, this.secim.el, this.durumYazisi);
    this.secim.el.style.display = 'none';
    this.b.kok.appendChild(this.katman);
    addEventListener('resize', this.yenidenBoyutla);
    this.yerlestir();
    this.idKutusu.focus();
    return true;
  }

  kapat(): void {
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
    for (const id of ['Group_ServerList_01', 'Group_ServerListSub', 'Group_introduction_el', 'Group_introduction_ka', 'Group_Notice_1', 'Group_Notice_2', 'Group_Notice_3', 'premium', 'btn_homepage']) p.gizle(id);
    p.metin('copyright', 'KnightEmpire');
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

  /** Giriş çubuğundaki yazı alanının üstüne gerçek bir <input> koyar. */
  private kutuKoy(p: UiPencere, id: string, tur: 'text' | 'password'): HTMLInputElement {
    const alan = p.alan(id); if (!alan) throw new Error(`Alan yok: ${id}`);
    const i = document.createElement('input'); i.type = tur; i.maxLength = 30; i.spellcheck = false; i.autocomplete = tur === 'password' ? 'current-password' : 'username';
    Object.assign(i.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', boxSizing: 'border-box', padding: '0 5px', background: 'transparent', border: '0', outline: '0', color: '#fff', font: '13px Verdana, Arial, sans-serif', pointerEvents: 'auto', userSelect: 'text' });
    alan.style.pointerEvents = 'auto'; alan.appendChild(i);
    return i;
  }

  private durumKur(): void {
    Object.assign(this.durumYazisi.style, { position: 'absolute', left: '21px', top: '666px', width: '978px', textAlign: 'center', color: '#ffe46b', font: 'bold 14px Verdana, Arial, sans-serif', textShadow: '0 1px 3px #000, 0 0 6px #000', pointerEvents: 'none', minHeight: '18px' });
  }
  private durum(m: string): void { this.durumYazisi.textContent = m; }

  private async girisYap(): Promise<void> {
    if (this.mesgul) return;
    const hesap = this.idKutusu.value.trim(), sifre = this.sifreKutusu.value;
    if (!hesap || !sifre) { this.durum('Enter your ID and password.'); (hesap ? this.sifreKutusu : this.idKutusu).focus(); return; }
    this.mesgul = true; this.idKutusu.disabled = this.sifreKutusu.disabled = true; this.durum('Connecting…');
    try {
      await this.b.baglan(hesap, sifre, (k) => this.karakterSec(k));
      try { if (this.hatirla) localStorage.setItem(KAYIT_HESAP, hesap); else localStorage.removeItem(KAYIT_HESAP); } catch { /* depolama kapalı */ }
      this.kapat();
    } catch (e) {
      this.girisGoster();
      if (!(e instanceof GirisIptal)) this.durum((e as Error).message || 'Connection failed.');
      else this.durum('');
      this.sifreKutusu.value = ''; this.sifreKutusu.focus();
    } finally {
      this.mesgul = false; this.idKutusu.disabled = this.sifreKutusu.disabled = false;
    }
  }

  // ---------------------------------------------------------------- karakter seçimi
  private karakterIstegi: { coz: (ad: string) => void; hata: (e: Error) => void } | null = null;

  private secimKur(p: UiPencere): void {
    // Pencere 1024×435: sahnenin altına oturur
    p.el.style.left = '0'; p.el.style.top = `${SAHNE_YUKSEKLIK - 435}px`;
    p.gizle('Group_Bottom_Img'); p.gizle('logo'); // orijinalde 3B sahnenin alt süslemesi; burada arka plan resmi varken yersiz kalır
    p.tikla.set('btn_back', () => this.karakterIstegi?.hata(new GirisIptal()));
    p.tikla.set('btn_exit', () => this.karakterIstegi?.hata(new GirisIptal()));
    p.tikla.set('btn_create', () => this.durum('Character creation is not available yet.'));
  }

  private girisGoster(): void {
    this.secim!.el.style.display = 'none'; this.giris!.goster('Group_Login'); this.giris!.goster('copyright'); this.giris!.el.style.display = ''; if (this.cevrimdisiEl) this.cevrimdisiEl.style.display = '';
  }

  private karakterSec(liste: SecimKarakteri[]): Promise<string> {
    const p = this.secim!;
    const dolu = liste.filter((k) => k.ad);
    if (!dolu.length) return Promise.reject(new Error('This account has no characters yet. Create one first.'));
    return new Promise<string>((coz, hata) => {
      let sira = 0;
      const goster = () => {
        const k = dolu[sira];
        p.metin('str_id', k.ad); p.metin('str_lev', k.seviye); p.metin('str_job', sinifAdi(k.sinif));
        p.goster('Group_OtherCharacter', dolu.length > 1);
      };
      goster();
      p.tikla.set('btn_left', () => { sira = (sira + dolu.length - 1) % dolu.length; goster(); });
      p.tikla.set('btn_right', () => { sira = (sira + 1) % dolu.length; goster(); });
      p.tikla.set('btn_start', () => { this.durum('Entering the game…'); coz(dolu[sira].ad); });
      this.karakterIstegi = { coz, hata: (e) => { this.karakterIstegi = null; hata(e); } };
      // Giriş çubuğu ve telif satırı gizlenir; karakter penceresi açılır
      this.giris!.gizle('Group_Login'); this.giris!.gizle('copyright'); if (this.cevrimdisiEl) this.cevrimdisiEl.style.display = 'none';
      this.durum('');
      p.el.style.display = '';
    });
  }
}
