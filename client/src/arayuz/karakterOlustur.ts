// Karakter oluşturma ekranı: oyunun kendi pencereleri (`re_ka_charactercreate` Karus, `re_el_charactercreate` El Morad) tam ekran bir katmanda gösterilir.
// Irk → sınıf → bonus puan dağıtımı → ad → Create. Kuralları sunucu da doğrular (protokol/olustur.ts: toplam 300, her stat ≥ 50, ırk/sınıf uyumu).
// Yüz/saç seçimi bu sürümde yok (oyuncu modelleri hazır görünümlüdür): yüz 1, saç 1 gönderilir.
import { UiPencere } from './orijinal';
import { KarakterOnizleme } from './karakterOnizleme';
import { baskinStatlar, statRengiUygula } from './baskinStat';
import { IRK_ADI, IRK_MESLEKLERI, MESLEK_ADI, STAT_EN_AZ, STAT_TOPLAMI, YENI_KARAKTER_MESAJLARI, irkUlusu, karakterDenetle, sinifKodu, type YeniKarakter } from '../../../kopru/protokol/olustur.ts';
import type { OlusturmaAraclari } from '../ag/sunucu';
import { IRK_MODELLERI } from '../oyun/veri';

export interface OlusturBaglami {
  kok: HTMLElement;
  araclar: OlusturmaAraclari;
  /** Sınıf başlangıç statları (oyuncu.json yeniKarakter): anahtar = ırk × 10000 + sınıf kodu. */
  baslangic: Record<string, { str: number; sta: number; dex: number; int: number; cha: number; puan: number }>;
  /** Boş karakter yuvası (0–3). */
  yuva: number;
}

const SAHNE_GENISLIK = 1024, SAHNE_YUKSEKLIK = 790;
type Stat = 'str' | 'sta' | 'dex' | 'int' | 'cha';
/** Arayüzdeki satır adı → stat (map = charisma/büyü gücü). */
const STAT_ID: [string, Stat][] = [['str', 'str'], ['dex', 'dex'], ['sta', 'sta'], ['int', 'int'], ['map', 'cha']];
const IRK_DUGMELERI: Record<number, string> = { 1: 'btn_race_ka_at', 2: 'btn_race_ka_tu', 3: 'btn_race_ka_wt', 4: 'btn_race_ka_pt', 11: 'btn_race_el_ba', 12: 'btn_race_el_rm', 13: 'btn_race_el_rf' };
const MESLEK_DUGMELERI: Record<number, string> = { 1: 'btn_class_warrior', 2: 'btn_class_rogue', 3: 'btn_class_mage', 4: 'btn_class_priest' };
const ACIKLAMA: Record<number, string> = {
  1: 'Warrior: strong melee fighter with heavy armor and shields.', 2: 'Rogue: fast fighter with daggers and bows, high dexterity.',
  3: 'Mage: casts powerful spells from a distance with fire, ice and lightning.', 4: 'Priest: heals and protects allies with holy magic.',
};

export class KarakterOlustur {
  private katman = document.createElement('div');
  private sahne = document.createElement('div');
  private p!: UiPencere;
  private onizleme: KarakterOnizleme | null = null;
  private kare = 0;
  private irk = 12; private meslek: 1 | 2 | 3 | 4 = 1;
  private stat: Record<Stat, number> = { str: 60, sta: 60, dex: 60, int: 60, cha: 60 };
  private taban: Record<Stat, number> = { str: 60, sta: 60, dex: 60, int: 60, cha: 60 };
  private bonus = 10;
  private ad!: HTMLInputElement;
  private durumYazisi = document.createElement('div');
  private bitir!: (ad: string | null) => void;
  private mesgul = false;
  private yenidenBoyutla = () => this.yerlestir();

  constructor(private b: OlusturBaglami) {}

  /** Ekranı açar. Karakter oluşturulursa adı, iptal edilirse null döner. */
  async ac(): Promise<string | null> {
    let ulus = this.b.araclar.ulus;
    if (ulus !== 1 && ulus !== 2) ulus = await this.ulusSor(); // yeni hesap: ilk karakter ulusu belirler (ırk seçimi → karakter oluşturma)
    if (ulus !== 1 && ulus !== 2) return null; // ulus seçiminde Back
    this.p = await UiPencere.yukle(ulus === 1 ? 'ka_charactercreate_us' : 'el_charactercreate_us');
    this.irk = ulus === 1 ? 1 : 12;
    this.katmanKur();
    this.pencereKur(ulus);
    this.sec(this.irk);
    return new Promise<string | null>((coz) => { this.bitir = (a) => { this.kapat(); coz(a); }; });
  }

  /** Ulus seçimi: oyunun kendi pencereleri (re_nation_select: Karus / El Morad iki yarı, Back). 0 = geri dönüldü. */
  private async ulusSor(): Promise<number> {
    const p = await UiPencere.yukle('re_nation_select');
    const katman = document.createElement('div'), sahne = document.createElement('div');
    Object.assign(katman.style, { position: 'fixed', inset: '0', background: '#000', zIndex: '9100', overflow: 'hidden' });
    Object.assign(sahne.style, { position: 'absolute', width: '1024px', height: '768px', transformOrigin: '0 0' });
    p.el.style.left = '0'; p.el.style.top = '0';
    for (const y of p.el.querySelectorAll<HTMLElement>('.ui-yazi')) if (!y.closest('.ui-t1')) y.style.display = 'none';
    // "KARUS" / "ELMORAD" yazısı dosyada yalnız normal durum resminde var, üzerine gelince kayboluyordu: kalıcı kopyası konur (sabit, okunur krem-altın ton)
    for (const id of ['btn_karus_selection', 'btn_elmo_selection']) for (const b of p.bul(id)) {
      const etiket = Array.from(b.querySelectorAll<HTMLElement>('.ui-durum')).find((e) => e.style.backgroundImage.includes('nationselect_02'));
      if (!etiket) continue;
      const kopya = etiket.cloneNode(true) as HTMLElement; kopya.classList.remove('ui-durum'); kopya.style.display = ''; kopya.style.pointerEvents = 'none'; kopya.style.filter = 'sepia(.35) brightness(1.08)';
      b.appendChild(kopya);
    }
    sahne.appendChild(p.el); katman.appendChild(sahne); this.b.kok.appendChild(katman);
    const yerles = () => { const o = Math.min(innerWidth / 1024, innerHeight / 768); sahne.style.scale = String(o); sahne.style.left = `${(innerWidth - 1024 * o) / 2}px`; sahne.style.top = `${(innerHeight - 768 * o) / 2}px`; };
    yerles(); addEventListener('resize', yerles);
    return new Promise((coz) => {
      const bitir = (n: number) => { removeEventListener('resize', yerles); katman.remove(); coz(n); };
      p.tikla.set('btn_karus_selection', () => bitir(1)); p.tikla.set('btn_elmo_selection', () => bitir(2)); p.tikla.set('btn_back', () => bitir(0));
    });
  }

  private katmanKur(): void {
    Object.assign(this.katman.style, { position: 'fixed', inset: '0', background: '#000', zIndex: '9050', overflow: 'hidden' });
    Object.assign(this.sahne.style, { position: 'absolute', left: '0', top: '0', width: `${SAHNE_GENISLIK}px`, height: `${SAHNE_YUKSEKLIK}px`, transformOrigin: '0 0' });
    Object.assign(this.durumYazisi.style, { position: 'absolute', left: '353px', top: '703px', width: '324px', textAlign: 'center', color: '#ffe46b', font: 'bold 13px Verdana, Arial, sans-serif', textShadow: '0 1px 2px #000', pointerEvents: 'none' });
    this.p.el.style.left = '0'; this.p.el.style.top = '0';
    this.sahne.append(this.p.el, this.durumYazisi);
    this.katman.appendChild(this.sahne); this.b.kok.appendChild(this.katman);
    addEventListener('resize', this.yenidenBoyutla); this.yerlestir();
  }
  private yerlestir(): void {
    const ol = Math.min(innerWidth / SAHNE_GENISLIK, innerHeight / SAHNE_YUKSEKLIK);
    this.sahne.style.scale = String(ol);
    this.sahne.style.left = `${(innerWidth - SAHNE_GENISLIK * ol) / 2}px`; this.sahne.style.top = `${(innerHeight - SAHNE_YUKSEKLIK * ol) / 2}px`;
  }
  private kapat(): void {
    cancelAnimationFrame(this.kare); this.onizleme?.kapat(); removeEventListener('resize', this.yenidenBoyutla); this.katman.remove();
  }
  private durum(m: string): void { this.durumYazisi.textContent = m; }

  private pencereKur(ulus: number): void {
    const p = this.p;
    // Diğer ulusun ırk düğmeleri ve bu sürümde olmayan yüz/saç denetimleri gizlenir
    for (const [irk, id] of Object.entries(IRK_DUGMELERI)) if (irkUlusu(Number(irk)) !== ulus) p.gizle(id);
    p.gizle('El Morad Male'); p.gizleDesen(/^(btn_(face|hair)_|btn_hair_color$|face$|hair$|img_face$|img_hair$)/);
    // Bu sürümde olmayan yüz/saç başlıkları ve ad kutusundaki örnek rakamlar gizlenir
    for (const e of p.el.querySelectorAll<HTMLElement>('.ui-yazi')) if (/^(Face|Hair ?[Ss]tyle|Details For Character|12345678910)$/.test((e.textContent ?? '').trim())) e.style.display = 'none';
    // Düğme yazıları durum resimlerinin ÜSTÜNDE olmalı (bazı düğmelerde resimler sonradan eklenmiş, yazıyı örtüyordu)
    for (const id of [...Object.values(IRK_DUGMELERI), ...Object.values(MESLEK_DUGMELERI), 'btn_create', 'btn_cancel']) for (const el of p.bul(id)) for (const y of el.querySelectorAll<HTMLElement>('.ui-yazi')) y.style.zIndex = '5';
    // Ad kutusu
    const alan = p.alan('edit_name');
    this.ad = document.createElement('input'); this.ad.type = 'text'; this.ad.maxLength = 20; this.ad.spellcheck = false; this.ad.autocomplete = 'off'; this.ad.placeholder = 'Character name';
    Object.assign(this.ad.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', boxSizing: 'border-box', padding: '0 6px', background: 'transparent', border: '0', outline: '0', color: '#fff', font: '14px Verdana, sans-serif' });
    if (alan) { alan.style.pointerEvents = 'auto'; alan.appendChild(this.ad); }
    this.ad.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') void this.olustur(); });
    this.ad.addEventListener('keyup', (e) => e.stopPropagation());
    // Irk ve sınıf
    for (const [irk, id] of Object.entries(IRK_DUGMELERI)) p.tikla.set(id, () => this.sec(Number(irk)));
    for (const [m, id] of Object.entries(MESLEK_DUGMELERI)) p.tikla.set(id, () => { if ((IRK_MESLEKLERI[this.irk] ?? []).includes(Number(m))) this.meslekSec(Number(m) as 1 | 2 | 3 | 4); });
    // Bonus puan dağıtımı
    for (const [id, s] of STAT_ID) {
      p.tikla.set(`btn_${id}_right`, () => { if (this.bonus > 0) { this.stat[s]++; this.bonus--; this.statCiz(); } });
      p.tikla.set(`btn_${id}_left`, () => { if (this.stat[s] > this.taban[s]) { this.stat[s]--; this.bonus++; this.statCiz(); } });
    }
    p.tikla.set('btn_rot_left', () => this.onizleme?.donusEkle(-0.5)); p.tikla.set('btn_rot_right', () => this.onizleme?.donusEkle(0.5));
    p.tikla.set('btn_create', () => void this.olustur());
    p.tikla.set('btn_cancel', () => this.bitir(null));
    // 3B önizleme: sağdaki boş alanda; kendi çizim döngüsü
    const kap = document.createElement('div');
    Object.assign(kap.style, { position: 'absolute', left: '353px', top: '59px', width: '323px', height: '573px' }); // oyunun kendi önizleme kutusu (area_character)
    p.el.appendChild(kap);
    this.onizleme = new KarakterOnizleme(kap, IRK_MODELLERI[this.irk] ?? 931137, 323, 573);
    this.onizleme.kameraAyarla(5.0, 0.95); // iri modeller (Karus, Barbarian) kırpılmasın
    const aciklama = p.alan('text_desc');
    if (aciklama) Object.assign(aciklama.style, { textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', fontSize: '14px', lineHeight: '1.35', color: '#f4ecd2' });
    let son = performance.now();
    const dongu = () => { const t = performance.now(); this.onizleme?.ciz(Math.min(0.1, (t - son) / 1000)); son = t; this.kare = requestAnimationFrame(dongu); };
    this.kare = requestAnimationFrame(dongu);
    setTimeout(() => this.ad.focus(), 50);
  }

  /** Irk seç: sınıf listesini ve önizlemeyi günceller (sınıf uymuyorsa ilk uygun sınıf seçilir). */
  private sec(irk: number): void {
    this.irk = irk;
    for (const [i, id] of Object.entries(IRK_DUGMELERI)) for (const el of this.p.bul(id)) el.style.filter = Number(i) === irk ? 'brightness(1.5) saturate(1.3)' : '';
    const izinli = IRK_MESLEKLERI[irk] ?? [1];
    for (const [m, id] of Object.entries(MESLEK_DUGMELERI)) for (const el of this.p.bul(id)) { const ok = izinli.includes(Number(m)); el.style.opacity = ok ? '1' : '0.3'; el.style.pointerEvents = ok ? '' : 'none'; }
    void this.onizleme?.modelDegistir(IRK_MODELLERI[irk] ?? 931137);
    this.meslekSec(izinli.includes(this.meslek) ? this.meslek : (izinli[0] as 1 | 2 | 3 | 4));
  }
  private meslekSec(m: 1 | 2 | 3 | 4): void {
    this.meslek = m;
    for (const [i, id] of Object.entries(MESLEK_DUGMELERI)) for (const el of this.p.bul(id)) el.style.filter = Number(i) === m ? 'brightness(1.5) saturate(1.3)' : '';
    const t = this.b.baslangic[String(this.irk * 10000 + sinifKodu(this.irk, m))];
    this.taban = t ? { str: t.str, sta: t.sta, dex: t.dex, int: t.int, cha: t.cha } : { str: 60, sta: 60, dex: 60, int: 60, cha: 60 };
    this.stat = { ...this.taban };
    this.bonus = STAT_TOPLAMI - (this.taban.str + this.taban.sta + this.taban.dex + this.taban.int + this.taban.cha);
    this.p.metin('text_desc', `${IRK_ADI[this.irk]} ${MESLEK_ADI[m]}\n${ACIKLAMA[m]}`);
    this.statCiz();
  }
  private statCiz(): void {
    for (const [id, s] of STAT_ID) this.p.metin(`text_${id}`, this.stat[s]);
    const baskin = baskinStatlar(this.meslek) as string[]; // sınıfın baskın statları pastel okyanus mavisi
    for (const [id, s] of STAT_ID) for (const e of [this.p.alan(`text_${id}`), this.p.alan(`${id}_01`)]) statRengiUygula(e, baskin.includes(s));
    this.p.metin('text_bonus', this.bonus);
    this.durum('');
  }

  private async olustur(): Promise<void> {
    if (this.mesgul) return;
    const k: YeniKarakter = { yuva: this.b.yuva, ad: this.ad.value.trim(), irk: this.irk, sinif: sinifKodu(this.irk, this.meslek), yuz: 1, sac: 1, str: this.stat.str, sta: this.stat.sta, dex: this.stat.dex, int: this.stat.int, cha: this.stat.cha };
    const hata = karakterDenetle(k); if (hata) { this.durum(hata); return; }
    this.mesgul = true; this.durum('Creating…');
    try {
      const kod = await this.b.araclar.olustur(k);
      if (kod === 0) this.bitir(k.ad); else this.durum(YENI_KARAKTER_MESAJLARI[kod] ?? `The character could not be created (code ${kod}).`);
    } catch (e) { this.durum((e as Error).message || 'Connection lost.'); }
    finally { this.mesgul = false; }
  }
}

export { STAT_EN_AZ };
