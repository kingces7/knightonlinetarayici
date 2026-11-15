// Oyun varlıkları: oyuncu, canavar ve ganimet kutusu.
// Konumlar Knight Online koordinatında tutulur: (x, z). Sahnede (x, y, -z) olarak çizilir.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KarakterModeli } from '../dunya/karakter';
import type { Arazi } from '../dunya/arazi';
import { type CanavarTuru, type EsyaTanimi, YENI_KARAKTER, esyaBul, kurallar, rastgele } from './veri';
import { type SavasOyuncusu, toplamSavunma, toplamVurus } from './savas';

/** Modellerin "ileri" yönü için düzeltme (radyan). Knight Online modelleri sahnede -z'ye bakıyor. */
export const YON_OFSET = Math.PI;

/** `a` açısını `hedef`e en kısa yoldan, en fazla `adim` radyan yaklaştırır. */
export function acıyaYaklas(a: number, hedef: number, adim: number): number {
  let fark = (hedef - a) % (Math.PI * 2);
  if (fark > Math.PI) fark -= Math.PI * 2; else if (fark < -Math.PI) fark += Math.PI * 2;
  return Math.abs(fark) <= adim ? hedef : a + Math.sign(fark) * adim;
}

/** Bir basamakta çıkılabilecek en büyük yükseklik (m). */
const BASAMAK = 0.7;

export abstract class Varlik {
  /** Çarpışma ve zemin için kullanılan harita (main.ts atar). */
  static arazi: Arazi | null = null;
  readonly konum = new THREE.Vector2();
  yon = 0; // sahnede y ekseni etrafında dönüş (görünen)
  /** `yonYumusat` açıksa model yönü hedefe sınırlı hızla (rad/sn) döner; kapalıysa anında. */
  hedefYon = 0;
  yonYumusat = false;
  donusHizi = 9;
  can = 1;
  enCok = 1;
  model: KarakterModeli | null = null;
  readonly grup = new THREE.Group();
  /** Tıklama için görünmez çarpışma kapsülü. */
  readonly secimKutusu: THREE.Mesh;
  constructor(yaricap = 0.7, boy = 1.8) {
    this.secimKutusu = new THREE.Mesh(new THREE.CylinderGeometry(yaricap, yaricap, boy, 8), new THREE.MeshBasicMaterial({ visible: false }));
    this.secimKutusu.position.y = boy / 2;
    this.grup.add(this.secimKutusu);
  }
  get olu(): boolean { return this.can <= 0; }

  /** Ayağın bulunduğu yükseklik (arazi ya da köprü/kat zemini). null = henüz yerleştirilmedi. */
  yuksek: number | null = null;
  /** Çarpışma yarıçapı (m). */
  yaricap = 0.4;
  private takilma = 0;
  private sonYerlestirme = 0;

  /** Işınlama: konumu ayarlar, yüksekliği sıfırdan bulur. */
  isinla(x: number, z: number, arazi: Arazi): void {
    this.konum.set(x, z); this.yuksek = arazi.yukseklikAl(x, z); this.takilma = 0;
  }

  /** (x,z) noktasındaki yürünebilir zemin: arazi ya da en fazla bir basamak yüksekteki köprü/kat. `kat` = zemin araziden mi yüksek. */
  private zeminBul(arazi: Arazi, x: number, z: number): { y: number; kat: boolean } {
    const t = arazi.yukseklikAl(x, z);
    const f = arazi.carpisma?.zemin(x, z, (this.yuksek ?? t) + BASAMAK) ?? null;
    return f !== null && f > t + 0.05 ? { y: f, kat: true } : { y: t, kat: false };
  }

  sahneyeYerlestir(arazi: Arazi): void {
    const simdi = performance.now();
    const dt = Math.min((simdi - this.sonYerlestirme) / 1000, 0.1);
    this.sonYerlestirme = simdi;
    const hedef = this.zeminBul(arazi, this.konum.x, this.konum.y).y;
    if (this.yuksek === null || !arazi.carpisma) this.yuksek = hedef;
    else this.yuksek += (hedef - this.yuksek) * Math.min(1, dt * 16); // basamak/eğimde yumuşak geçiş
    if (this.yonYumusat) this.yon = acıyaYaklas(this.yon, this.hedefYon, this.donusHizi * dt);
    this.grup.position.set(this.konum.x, this.yuksek, -this.konum.y);
    this.grup.rotation.y = this.yon;
  }
  /** Baktığı yön, Knight Online x,z düzleminde radyan (`atan2(z, x)`). */
  get bakisAcisi(): number {
    const t = this.hedefYon - YON_OFSET;
    return Math.atan2(-Math.cos(t), Math.sin(t));
  }
  bak(hedef: THREE.Vector2): void {
    const dx = hedef.x - this.konum.x, dz = -(hedef.y - this.konum.y);
    if (dx * dx + dz * dz > 1e-6) {
      this.hedefYon = Math.atan2(dx, dz) + YON_OFSET;
      if (!this.yonYumusat) this.yon = this.hedefYon;
    }
  }
  /** hedefe doğru en fazla `adim` kadar ilerler; vardıysa true. */
  yuru(hedef: THREE.Vector2, adim: number, durMesafe = 0): boolean {
    const fark = hedef.clone().sub(this.konum);
    const d = fark.length() - durMesafe;
    if (d <= 0.05) return true;
    this.bak(hedef);
    const ad = Math.min(adim, d);
    const onceki = this.konum.clone();
    this.hareketEt(fark.normalize().multiplyScalar(ad));
    // Duvara takılıp ilerleyemiyorsa bir süre sonra vazgeç (tıklanan yere ulaşılamıyor demektir).
    this.takilma = this.konum.distanceTo(onceki) < ad * 0.25 ? this.takilma + 1 : 0;
    if (this.takilma > 12) { this.takilma = 0; return true; }
    return d <= adim;
  }

  /**
   * Klavyeyle yürüme: `yon` (Knight Online x, z; birim vektör) yönünde `adim` metre ilerler. `yuru` gibi bir "vardı" eşiği yoktur;
   * yüksek yenileme hızında (adım < 5 cm) hareket bozulmasın diye ayrı tutuldu.
   */
  ilerle(yon: THREE.Vector2, adim: number): void {
    this.bak(new THREE.Vector2(this.konum.x + yon.x, this.konum.y + yon.y));
    this.hareketEt(yon.clone().multiplyScalar(adim));
  }

  /** Geri geri yürüme: bakış yönü değişmeden `yon` yönünde `adim` kadar gider. */
  geriGit(yon: THREE.Vector2, adim: number): void { this.hareketEt(yon.clone().multiplyScalar(adim)); }

  /** `fark` kadar ilerlemeyi dener: duvarlardan kayarak, dik yamaçlara tırmanmadan. */
  protected hareketEt(fark: THREE.Vector2): void {
    const arazi = Varlik.arazi;
    if (!arazi) { this.konum.add(fark); return; }
    const y = this.yuksek ?? arazi.yukseklikAl(this.konum.x, this.konum.y);
    const dene = (dx: number, dz: number): boolean => {
      let nx = this.konum.x + dx, nz = this.konum.y + dz;
      if (arazi.carpisma) [nx, nz] = arazi.carpisma.duvarlardanIt(nx, nz, y, this.yaricap);
      const z = this.zeminBul(arazi, nx, nz);
      const mesafe = Math.hypot(nx - this.konum.x, nz - this.konum.y);
      // Dik yamaç: arazi bir adımda belirgin yükseliyorsa (eğim > ~54°) geçilmez. Köprü/kat zeminleri bundan muaf.
      if (!z.kat && z.y - y > 0.25 && (z.y - y) / Math.max(mesafe, 0.05) > 1.4) return false;
      if (nx < 2 || nz < 2 || nx > arazi.genislik - 2 || nz > arazi.genislik - 2) return false;
      this.konum.set(nx, nz);
      return true;
    };
    if (!dene(fark.x, fark.y) && !dene(fark.x, 0)) dene(0, fark.y);
  }
}

// ---------------------------------------------------------------- Canavar
export type CanavarDurumu = 'gez' | 'kovala' | 'saldir' | 'olu';

export class Canavar extends Varlik {
  readonly tur: CanavarTuru;
  readonly dogum = new THREE.Vector2();
  durum: CanavarDurumu = 'gez';
  private gezHedef: THREE.Vector2 | null = null;
  private bekle = rastgele(0, 4);
  saldiriSayaci = 0;
  oluSuresi = 0;
  ganimetBirakildi = false;
  kizgin = false;
  /** Sunucu yerleşim kaydı (K_NPCPOS): gezinme alanı, yeniden doğuş süresi (sn), davranış (ActType 1-2 pasif, 3-4 pasif + yardımlaşan, diğerleri saldırgan). */
  yerlesim: { alan: number; dogus: number; davranis: number; grup: Canavar[] } | null = null;
  get dogusSure(): number { return this.yerlesim?.dogus ?? 25; }
  private get pasif(): boolean { return this.yerlesim ? this.yerlesim.davranis >= 1 && this.yerlesim.davranis <= 4 : this.tur.seviye < 3; }

  constructor(tur: CanavarTuru, x: number, z: number) {
    super(0.8, 1.8);
    this.tur = tur;
    this.konum.set(x, z); this.dogum.set(x, z);
    this.can = this.enCok = tur.can;
    this.yon = rastgele(0, Math.PI * 2);
  }

  async modelYukle(): Promise<void> {
    this.model = await KarakterModeli.olustur(`/karakter/${this.tur.model}.glb`);
    this.model.kok.scale.setScalar(this.tur.olcek);
    this.grup.add(this.model.kok);
    this.model.oynat('bekle');
  }

  hasarAl(miktar: number): void {
    if (this.olu) return;
    this.can = Math.max(0, this.can - miktar);
    this.kizgin = true;
    if (this.can <= 0) {
      this.durum = 'olu'; this.oluSuresi = 0;
      this.model?.oynat('olum0', false);
    } else if (this.model && this.durum !== 'saldir') {
      this.model.oynat('darbe0', false, 0.05);
      setTimeout(() => { if (!this.olu && this.model?.aktifAd === 'darbe0') this.model.oynat('bekle'); }, 400);
    }
  }

  yenidenDog(): void {
    this.konum.copy(this.dogum);
    this.can = this.enCok; this.durum = 'gez'; this.kizgin = false; this.ganimetBirakildi = false;
    this.grup.visible = true;
    this.model?.oynat('bekle');
  }

  /** Yapay zekâ. Bu karede saldırı yaptıysa true döner (hasarı savas.ts hesaplar). */
  guncelle(dt: number, oyuncu: Oyuncu): boolean {
    this.model?.guncelle(dt);
    if (this.olu) { this.oluSuresi += dt; return false; }
    const uzaklik = this.konum.distanceTo(oyuncu.konum);
    const dogumdan = this.konum.distanceTo(this.dogum);
    // Sunucu: doğduğu yerden izleme menzilinden fazla uzaklaşınca kovalamayı bırakır; saldırgan canavar arama menzilinde oyuncuyu fark eder.
    if (oyuncu.olu || dogumdan > (this.tur.izleme || 30)) { this.kizgin = false; }
    if (!oyuncu.olu && (this.kizgin || (!this.pasif && uzaklik < Math.max(this.tur.arama, 3)))) this.kizgin = true;

    if (this.kizgin && !oyuncu.olu) {
      if (uzaklik > 2.2) {
        this.durum = 'kovala';
        this.yuru(oyuncu.konum, this.tur.hizKovala * dt, 1.8);
        this.model?.oynat('kos');
      } else {
        this.durum = 'saldir';
        this.bak(oyuncu.konum);
        this.saldiriSayaci -= dt;
        if (this.saldiriSayaci <= 0) {
          this.saldiriSayaci = this.tur.gecikme / 1000; // sunucu sAttackDelay (ms)
          this.model?.oynat('saldir0', false, 0.1);
          return true;
        }
        if (this.saldiriSayaci < this.tur.gecikme / 1000 - 0.8 && this.model?.aktifAd !== 'bekle') this.model?.oynat('bekle');
      }
      return false;
    }
    // Gezinme
    this.durum = 'gez';
    if (this.gezHedef) {
      if (this.yuru(this.gezHedef, this.tur.hizGez * dt)) { this.gezHedef = null; this.bekle = rastgele(2, 6); this.model?.oynat('bekle'); }
      else this.model?.oynat('yuru');
    } else {
      this.bekle -= dt;
      if (this.bekle <= 0) {
        const a = rastgele(0, Math.PI * 2), r = rastgele(1, Math.max(2, this.yerlesim?.alan ?? 9));
        this.gezHedef = new THREE.Vector2(this.dogum.x + Math.cos(a) * r, this.dogum.y + Math.sin(a) * r);
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------- NPC
/** Sunucu veritabanından (K_NPCPOS + K_NPC) gelen dost NPC. Konumlar araclar/sunucu/npc-disa-aktar.ps1 ile dışa aktarılır. */
export interface NpcTanimi { sid: number; ad: string; x: number; z: number; yon: number; model: number; boyut: number; tur: number; satis: number }

export class Npc extends Varlik {
  readonly tanim: NpcTanimi;
  constructor(t: NpcTanimi) {
    super(0.7, 1.9);
    this.tanim = t;
    this.konum.set(t.x, t.z);
    this.yaricap = 0.5;
    this.can = this.enCok = 1;
    // Sunucu K_NPCPOS.byDirection derece cinsindendir (0 = yön verilmemiş). Yorum 751 dost NPC ile sınandı (client/scripts/npcyonAnaliz.mjs):
    // bakış vektörü KO dünyasında (cos θ, −sin θ); bu yorumda NPC önleri arkalarından 19 a karşı 4 oranında daha açık çıktı (ters yorum: 4 e karşı 19).
    const r = (t.yon * Math.PI) / 180;
    this.yon = Math.atan2(Math.cos(r), Math.sin(r)) + YON_OFSET; // bak() ile aynı dönüşüm: (dx, dz) = (cos θ, sin θ)
  }
  get ad(): string { return this.tanim.ad; }
  async modelYukle(): Promise<void> {
    this.model = await KarakterModeli.olustur(`/karakter/${this.tanim.model}.glb`);
    this.model.kok.scale.setScalar(this.tanim.boyut / 100);
    this.grup.add(this.model.kok);
    this.model.oynat('bekle');
  }
}

// ---------------------------------------------------------------- Oyuncu
export class Oyuncu extends Varlik {
  seviye = 1;
  deneyim = 0;
  altin = 0;
  mana = 100; enCokMana = 100;
  envanter: (EsyaTanimi | null)[] = new Array(28).fill(null);
  /**
   * Ekipman: Knight Online yuva numaraları (0 sağ küpe, 1 kask, 2 sol küpe, 3 kolye, 4 gövde, 5 omuz, 6 sağ el, 7 bel, 8 sol el,
   * 9 sağ yüzük, 10 bacak, 11 sol yüzük, 12 eldiven, 13 bot, 14 pelerin). Arayüzdeki ızgarayla aynı sıra.
   */
  ekipman: (EsyaTanimi | null)[] = new Array(15).fill(null);
  get silah(): EsyaTanimi | null { return this.ekipman[6]; }
  get zirh(): EsyaTanimi | null { return this.ekipman[4]; }
  /** Eşya tablosundaki yuva kodu → ekipman yuvası (sunucu ItemSlot sırası). */
  private static readonly YUVA_HARITASI = [6, 6, 8, 6, 8, 4, 10, 1, 12, 13, 0, 3, 9, 5, 7];
  static ekipmanYuvasi(e: EsyaTanimi): number { return Oyuncu.YUVA_HARITASI[e.yuva] ?? -1; }
  /** Çantadaki i. eşyayı giyer (eski eşya çantaya döner). Giyilemezse null. */
  esyaKusan(i: number): EsyaTanimi | null {
    const e = this.envanter[i]; if (!e) return null;
    const p = Oyuncu.ekipmanYuvasi(e); if (p < 0) return null;
    this.envanter[i] = this.ekipman[p]; this.ekipman[p] = e;
    if (e.yuva === 3 && this.ekipman[8]) { const sol = this.ekipman[8]!; if (this.esyaEkle(sol)) this.ekipman[8] = null; } // iki elli silah sol eli boşaltır
    return e;
  }
  /** Ekipman yuvasındaki eşyayı çantaya alır. Yer yoksa false. */
  esyaCikar(p: number): boolean {
    const e = this.ekipman[p]; if (!e || !this.esyaEkle(e)) return false;
    this.ekipman[p] = null; return true;
  }
  /** Yeni karakter satırındaki başlangıç eşyalarını giydirir (NewChrValue.tbl). */
  baslangicEsyalariVer(): void {
    for (const no of kurallar?.yeniKarakter[YENI_KARAKTER]?.esyalar ?? []) {
      const e = esyaBul(no); if (!e) continue;
      const p = Oyuncu.ekipmanYuvasi(e); if (p >= 0) this.ekipman[p] = e;
    }
  }
  hedef: Canavar | null = null;
  /** Hedefe temel saldırı sürüyor mu? Fareyle tıklama/R başlatır; Z/Q/Tab yalnızca hedef seçer. */
  saldiriyor = false;
  yuruHedef: THREE.Vector2 | null = null;
  /** Klavyeyle yürürken gidiş yönü (Knight Online x,z düzleminde radyan); null = duruyor. Yön hedefe yumuşakça döner. */
  yuruAcisi: number | null = null;
  saldiriSayaci = 0;
  savastanBeri = 99;

  constructor() {
    super(0.5, 1.9);
    this.yonYumusat = true;
    this.can = this.enCok = 120;
  }

  modelNo = 0;
  async modelYukle(no: number): Promise<void> {
    this.modelNo = no;
    this.model = await KarakterModeli.olustur(`/karakter/${no}.glb`);
    this.grup.add(this.model.kok);
    this.model.oynat('bekle');
  }

  /** Statüler (Knight Online savaşçı başlangıç değerleri) ve harcanmamış statü puanı. */
  /** Sınıf numarası: 201 = El Morad Savaşçı (Warrior). Başlangıç statüleri NewChrValue.tbl'den, katsayılar sunucu COEFFICIENT tablosundan. */
  sinif = 201;
  stat = { str: 65, sta: 65, dex: 60, int: 50, cha: 50 };
  bonusPuan = 0;
  /** Statü sıfırlama için başlangıç değerleri. */
  baslangicStat = { ...this.stat };
  /** Kuralları (varsa) uygular: başlangıç statüleri ve can/mana. Oyun başında bir kez. */
  kurallariUygula(): void {
    const y = kurallar?.yeniKarakter[YENI_KARAKTER];
    // Sunucu yeni karaktere 10 serbest puan verir (NewChrValue); bu projede karar gereği 0 ile başlanır, puanlar seviye atlayınca kazanılır.
    if (y) { this.stat = { str: y.str, sta: y.sta, dex: y.dex, int: y.int, cha: y.cha }; this.bonusPuan = 0; }
    this.baslangicStat = { ...this.stat };
    this.canManaHesapla(true);
  }
  /**
   * En çok can/mana: sunucu kaynağı (UserHealtMagicSpSystem.cpp SetMaxHp / SetMaxMp). Eşya ve perk bonusları şimdilik yok.
   * Savaşçının MP katsayısı 0 olduğu için SP katsayısı kullanılır.
   */
  canManaHesapla(doldur = false): void {
    const k = kurallar?.katsayi[String(this.sinif)];
    if (!k) return;
    const L = this.seviye, sta = this.stat.sta;
    this.enCok = Math.floor(k.hp * L * L * sta + 0.1 * L * sta + sta / 5 + 20);
    if (k.mp !== 0) { const it = this.stat.int + 30; this.enCokMana = Math.floor(k.mp * L * L * it + 0.1 * L * 2 * it + it / 5 + 20); }
    else this.enCokMana = Math.floor(k.sp * L * L * sta + 0.1 * L * sta + sta / 5);
    this.can = doldur ? this.enCok : Math.min(this.can, this.enCok);
    this.mana = doldur ? this.enCokMana : Math.min(this.mana, this.enCokMana);
  }
  /** Banka (depo): 8 sayfa × 24 yuva ve depodaki Noah. Şimdilik yalnızca bu oturumda tutulur. */
  depo: (EsyaTanimi | null)[] = new Array(24 * 8).fill(null);
  depoAltin = 0;
  /** Skill tekrar kullanım bitişleri (skill no → performans saati, sn) ve aktif buff'lar (sunucu Type4). */
  /** Skill/büyü animasyonu sürerken (sn) boşta animasyonu araya girmez. */
  animKilidi = 0;
  beceriBekleme = new Map<number, number>();
  buflar: { no: number; ad: string; bitis: number; hiz: number; ac: number }[] = [];
  /** Koşma/yürüme hız çarpanı (sunucu m_bSpeedAmount / 100); buff yoksa 1. */
  get hizCarpani(): number { return this.buflar.reduce((m, b) => Math.max(m, b.hiz > 0 ? b.hiz / 100 : 1), 1); }
  /** Buff'lardan gelen ek savunma (sunucu m_sACAmount). */
  get acEk(): number { return this.buflar.reduce((t, b) => t + b.ac, 0); }
  /** Harcanan tüm statü puanlarını geri alır (başlangıç değerlerine döner); iade edilen puanı döndürür. */
  statSifirla(): number {
    let iade = 0;
    for (const k of ['str', 'sta', 'dex', 'int', 'cha'] as const) { iade += this.stat[k] - this.baslangicStat[k]; this.stat[k] = this.baslangicStat[k]; }
    this.bonusPuan += iade;
    this.canManaHesapla();
    return iade;
  }
  /** Bir statü puanı harcar (STR/STA/DEX/INT/CHA). Harcanamazsa false. */
  statArtir(ad: 'str' | 'sta' | 'dex' | 'int' | 'cha'): boolean {
    if (this.bonusPuan <= 0) return false;
    this.bonusPuan--; this.stat[ad]++;
    this.canManaHesapla();
    return true;
  }
  /** Savaş formüllerine (savas.ts) verilen oyuncu görüntüsü. */
  get savasVeri(): SavasOyuncusu { return { sinif: this.sinif, seviye: this.seviye, stat: this.stat, silah: this.silah, esyaSavunma: this.ekipman.reduce((t, e) => t + (e?.savunma ?? 0), 0), acEk: this.acEk }; }
  /** Toplam vuruş gücü (sunucu m_sTotalHit) ve toplam savunma (m_sTotalAc). */
  toplamVurus(): number { return toplamVurus(this.savasVeri); }
  savunma(): number { return toplamSavunma(this.savasVeri); }

  /** Alınan hasar zaten sunucu formülüyle hesaplanmıştır (savas.ts canavarVurusu). */
  hasarAl(miktar: number): number {
    this.can = Math.max(0, this.can - miktar);
    this.savastanBeri = 0;
    if (this.can <= 0) this.model?.oynat('olum0', false);
    return miktar;
  }

  /** Boş envanter yuvasına koyar; yer yoksa false. */
  esyaEkle(e: EsyaTanimi): boolean {
    const i = this.envanter.indexOf(null);
    if (i < 0) return false;
    this.envanter[i] = e;
    return true;
  }
}

// ---------------------------------------------------------------- Ganimet kutusu
export class GanimetKutusu {
  readonly grup = new THREE.Group();
  readonly konum: THREE.Vector2;
  altin: number;
  esyalar: EsyaTanimi[];
  omur = 60;
  readonly secimKutusu: THREE.Mesh;
  private zaman = 0;

  /** Oyunun kendi eşya kutusu modeli (Misc/itembox.n3shape → /esya/itembox.glb). Yüklenemezse basit kutu çizilir. */
  private static model: THREE.Object3D | null = null;
  static async modelYukle(): Promise<void> {
    try { GanimetKutusu.model = (await new GLTFLoader().loadAsync('/esya/itembox.glb')).scene; } catch { GanimetKutusu.model = null; }
  }

  constructor(x: number, z: number, altin: number, esyalar: EsyaTanimi[]) {
    this.konum = new THREE.Vector2(x, z);
    this.altin = altin; this.esyalar = esyalar;
    if (GanimetKutusu.model) {
      const m = GanimetKutusu.model.clone(true);
      m.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { const mat = (me.material as THREE.MeshStandardMaterial).clone(); mat.emissive = new THREE.Color(0x553300); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.6; me.material = mat; } });
      m.scale.setScalar(1.8); // orijinal model küçük (≈0,4 m); uzaktan seçilebilsin diye biraz büyütülür
      this.grup.add(m);
      this.secimKutusu = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
      this.secimKutusu.position.y = 0.5; this.grup.add(this.secimKutusu);
      return;
    }
    const tahta = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    const metal = new THREE.MeshLambertMaterial({ color: 0xd4a640, emissive: 0x3a2a05 });
    const govde = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.55), tahta); govde.position.y = 0.23;
    const kapak = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.8, 12, 1, false, 0, Math.PI), tahta);
    kapak.rotation.z = Math.PI / 2; kapak.position.y = 0.45;
    const serit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.58), metal); serit.position.y = 0.25;
    const kilit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), metal); kilit.position.set(0, 0.38, 0.29);
    const isik = new THREE.PointLight(0xffd36b, 2.5, 4); isik.position.y = 1;
    this.grup.add(govde, kapak, serit, kilit, isik);
    this.secimKutusu = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    this.secimKutusu.position.y = 0.5;
    this.grup.add(this.secimKutusu);
  }

  guncelle(dt: number, arazi: Arazi): void {
    this.zaman += dt; this.omur -= dt;
    this.grup.position.set(this.konum.x, arazi.yukseklikAl(this.konum.x, this.konum.y) + Math.sin(this.zaman * 2) * 0.05, -this.konum.y);
    this.grup.rotation.y = this.zaman * 0.4;
  }
  get bos(): boolean { return this.altin <= 0 && this.esyalar.length === 0; }
}

export { rastgele };
