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

/** Envanter penceresindeki bir yuva: 'c' = çanta, 'e' = ekipman (Knight Online yuva numarası). */
export interface YuvaKonumu { tur: 'c' | 'e'; i: number }

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
  secimKutusu: THREE.Mesh;
  /** Seçim kutusunun (isabet alanı) yarıçapı ve boyu: ad etiketi bunun hemen üstüne konur, hedef halkası buna göre ölçeklenir. */
  secimYaricapi: number; boy: number;
  /** Ad etiketinin bağlandığı yükseklik (yerden): modelin ölçülen EN ÜST noktası; havada duran/uçan canavarlarda gövdeden yüksektir. */
  etiketY = 0;
  /** Model yüklenince seçim kutusunu (ve yeşil halkayı) modelin gerçek boyutuna uydurur. */
  protected secimiModeleUydur(kok: THREE.Object3D): void {
    // Kutu, kemik hareketi uygulanmamış (bağlama pozundaki) kaynak köşelerden kurulur: model yüklenir yüklenmez iskelet henüz oynamadığı için
    // THREE'nin kendi deriye göre hesabı (Box3.setFromObject) bazı canavarlarda (Bulcan, Bulture) kutuyu iki katına şişiriyor, ad etiketi çok yukarı çıkıyordu.
    kok.updateMatrixWorld(true);
    const kutu = new THREE.Box3();
    kok.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      kutu.union(new THREE.Box3().copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld));
    });
    const b = kutu.getSize(new THREE.Vector3());
    if (!(b.y > 0.1)) return;
    const yaricap = Math.max(0.4, Math.min(8, (b.x + b.z) / 4)), boy = Math.max(0.8, Math.min(14, b.y));
    this.secimKutusu.geometry.dispose();
    this.secimKutusu.geometry = new THREE.CylinderGeometry(yaricap, yaricap, boy, 10);
    this.secimKutusu.position.y = boy / 2;
    this.secimYaricapi = yaricap; this.boy = boy;
    this.etiketY = Math.max(boy, Math.min(16, kutu.max.y - this.grup.position.y));
  }
  constructor(yaricap = 0.7, boy = 1.8) {
    this.secimYaricapi = yaricap; this.boy = boy;
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
    const ay = this.yuksek ?? t;
    let f = arazi.carpisma?.zemin(x, z, ay + BASAMAK) ?? null;
    // Merdiven rampasının "içinde" kalma: zemin (arazi) rampanın altında kaldıysa ve hemen üstünde (en çok 1,6 m) EĞİMLİ bir rampa varsa oraya çıkılır.
    // (Düz zeminler — köprü, çatı, kat — için bu geçerli değil: altından üstüne sıçranmaz.)
    if (f === null && arazi.carpisma) { const g = arazi.carpisma.zeminBilgi(x, z, ay + 1.6); if (g && g.egim < 0.97 && g.y > t + 0.05) f = g.y; }
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
  /** Harita kenarından en çok ne kadar yaklaşılabilir (m). Sunucu x, z < harita genişliği olmak şartıyla kabul eder; oyun yöneticisi (GM) kenara kadar gidebilir. */
  kenarPayi = 2;
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
      if (nx < this.kenarPayi || nz < this.kenarPayi || nx > arazi.genislik - this.kenarPayi || nz > arazi.genislik - this.kenarPayi) return false;
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
  /** Sunucu kontrollü canavar (canlı mod): sıfırdan farklıysa sunucudaki kimliktir; yapay zekâ çalışmaz, konum/hareket sunucudan gelir. */
  agKimlik = 0;
  /** Sunucunun bildirdiği varış noktası ve hız (m/sn). */
  agHedef: THREE.Vector2 | null = null; agHiz = 0;
  get agModu(): boolean { return this.agKimlik !== 0; }
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
    this.secimiModeleUydur(this.model.kok);
    this.model.oynat('bekle');
  }

  hasarAl(miktar: number): void {
    if (this.olu || this.agModu) return; // sunucu canavarında hasar sunucudan gelir (henüz bağlı değil)
    this.can = Math.max(0, this.can - miktar);
    this.kizgin = true;
    if (this.can <= 0) {
      this.durum = 'olu'; this.oluSuresi = 0;
      this.model?.oynatRastgele('olum', 2, false, 0.1);
    } else if (this.model && this.durum !== 'saldir') {
      this.model.oynatRastgele('darbe', 3, false, 0.05);
      setTimeout(() => { if (!this.olu && this.model?.aktifAd.startsWith('darbe')) this.model.oynat('bekle'); }, 400);
    }
  }

  /** Sunucu canavarı: sunucu "öldü" dedi (WIZ_DEAD). Ganimet ve yeniden doğma sunucudan gelir. */
  agOlum(): void {
    if (this.olu) return;
    this.can = 0; this.durum = 'olu'; this.oluSuresi = 0; this.agHedef = null;
    this.model?.oynatRastgele('olum', 2, false, 0.1);
  }
  /** Sunucu canavarı: vuruş alınca darbe animasyonu (hasar sunucudan gelir). */
  agDarbe(): void {
    if (this.olu || !this.model) return;
    this.model.oynatRastgele('darbe', 3, false, 0.05);
    setTimeout(() => { if (!this.olu && this.model?.aktifAd.startsWith('darbe')) this.model.oynat('bekle'); }, 400);
  }
  /** Sunucu canavarı: yeniden doğdu (aynı kimlikle yeniden göründü). */
  agCanlan(x: number, z: number): void {
    this.konum.set(x, z); this.can = this.enCok; this.durum = 'gez'; this.oluSuresi = 0; this.agHedef = null;
    this.grup.visible = true; this.model?.oynat('bekle', true, 0); // geçişsiz: ölü yatış pozundan "kalkma" görünmesin, canavar doğrudan ayakta belirsin
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
    if (this.agModu) {
      if (this.agHedef && this.agHiz > 0) {
        const bitti = this.yuru(this.agHedef, this.agHiz * dt);
        this.model?.oynat(this.agHiz > 3.5 ? 'kos' : 'yuru');
        if (bitti) { this.agHedef = null; this.model?.oynat('bekle'); }
      } else if (this.model?.aktifAd !== 'bekle') this.model?.oynat('bekle');
      return false;
    }
    const uzaklik = this.konum.distanceTo(oyuncu.konum);
    const dogumdan = this.konum.distanceTo(this.dogum);
    // Sunucu: doğduğu yerden izleme menzilinden fazla uzaklaşınca kovalamayı bırakır; saldırgan canavar arama menzilinde oyuncuyu fark eder.
    const gorunmez = oyuncu.olu || oyuncu.blinkli; // göz kırpan oyuncuyu yapay zekâ görmez (sunucu BlinkStart: INVIS_DISPEL_ON_ATTACK)
    if (gorunmez || dogumdan > (this.tur.izleme || 30)) { this.kizgin = false; }
    if (!gorunmez && (this.kizgin || (!this.pasif && uzaklik < Math.max(this.tur.arama, 3)))) this.kizgin = true;

    if (this.kizgin && !gorunmez) {
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
          this.model?.oynatRastgele('saldir', 2, false, 0.1);
          return true;
        }
        if (this.saldiriSayaci < this.tur.gecikme / 1000 - 0.8 && this.model?.aktifAd !== 'bekle') this.model?.oynat('bekle');
      }
      return false;
    }
    // Sunucu NpcTracing: doğduğu yerden NPC_MAX_MOVE_RANGE2 (200 m) ya da daha uzaktaysa doğduğu yere geri alınır
    if (dogumdan >= 200) { this.konum.copy(this.dogum); this.gezHedef = null; return false; }
    // Sunucu NpcBack: kovalamayı bırakan canavar yerleşim alanının dışındaysa koşarak doğduğu yere döner, sonra gezinmeye devam eder
    const alanYari = Math.max(3, this.yerlesim?.alan ?? 9);
    if (!this.kizgin && dogumdan > alanYari + 2) {
      this.durum = 'gez'; this.gezHedef = null;
      if (this.yuru(this.dogum, this.tur.hizKovala * dt, alanYari * 0.5)) this.model?.oynat('bekle'); else this.model?.oynat('kos');
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
    this.secimiModeleUydur(this.model.kok); // isabet alanı ve ad etiketi modelin gerçek boyuna göre (uzun/kısa NPC'lerde ad tepesinde durur)
  }
}

// ---------------------------------------------------------------- Diğer oyuncular (canlı mod)
/** Sunucudaki başka bir oyuncu: konum ve hareket sunucudan gelir (WIZ_USER_INOUT / WIZ_MOVE). Eşyalar şimdilik görünmez (tek oyuncu modeli kullanılır). */
export class DigerOyuncu extends Varlik {
  /** Sunucudaki soket numarası. */
  readonly kimlik: number;
  ad: string; seviye: number; ulus: number;
  /** Sunucunun bildirdiği varış noktası ve hız (m/sn). */
  agHedef: THREE.Vector2 | null = null; agHiz = 0;
  /** Sunucuya göre hareket sürüyor mu (son paket yankı 1/3)? Sürüyorsa bir sonraki paket gelene kadar aynı yönde devam edilir ve koşu animasyonu kesilmez. */
  suruyor = false; yonV = new THREE.Vector2(); sonPaketSn = 0;
  constructor(kimlik: number, ad: string, seviye: number, ulus: number, x: number, z: number) {
    super(0.7, 1.9);
    this.kimlik = kimlik; this.ad = ad; this.seviye = seviye; this.ulus = ulus;
    this.konum.set(x, z);
    this.can = this.enCok = 1;
  }
  async modelYukle(no: number): Promise<void> {
    this.model = await KarakterModeli.olustur(`/karakter/${no}.glb`);
    this.grup.add(this.model.kok);
    this.model.oynat('bekle');
  }
  guncelle(dt: number): void {
    this.model?.guncelle(dt);
    const hareketAnimi = this.agHiz > 3.5 ? 'kos' : 'yuru';
    if (this.agHedef && this.agHiz > 0) {
      const bitti = this.yuru(this.agHedef, this.agHiz * dt);
      this.model?.oynat(hareketAnimi);
      if (bitti) { this.agHedef = null; if (!this.suruyor) this.model?.oynat('bekle'); }
    } else if (this.suruyor && this.agHiz > 0 && performance.now() / 1000 - this.sonPaketSn < 1.5) {
      // varış noktasına ulaştı ama oyuncu hâlâ yürüyor (bir sonraki saniyelik paket gecikti): aynı yönde devam
      this.hareketEt(this.yonV.clone().multiplyScalar(this.agHiz * dt));
      this.model?.oynat(hareketAnimi);
    } else if (this.model?.aktifAd !== 'bekle') this.model?.oynat('bekle');
  }
}

// ---------------------------------------------------------------- Oyuncu
export class Oyuncu extends Varlik {
  seviye = 1;
  deneyim = 0;
  /** Sunucu bağlıyken sunucunun bildirdiği bu seviyedeki azami deneyim (yoksa istemci tablosu kullanılır). */
  azamiDeneyimSunucu: number | null = null;
  /** Görünen karakter adı (tek oyunculu modda sabit; sunucuya bağlanınca sunucudaki ad). */
  ad = 'kingces';
  altin = 0;
  mana = 100; enCokMana = 100;
  /** Oyun yöneticisi (GM, sunucu yetkisi 0): Shift basılıyken hızlanır; sunucu GM'lerin hız sınırını denetlemez (SpeedHackUser). */
  gm = false;
  /** Skill puanları (sunucu m_bstrSkill): [0] boş puan, [5..8] ağaç puanları (1., 2., 3. ağaç, Master). */
  skillPuanlari: number[] = new Array(9).fill(0);
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
  /** Bir eşyanın giyilebileceği ekipman yuvaları (eşya tablosu yuva koduna göre; küpe/yüzük/el için iki yuva da uygundur). */
  static uygunYuvalar(e: EsyaTanimi): number[] {
    const ana = Oyuncu.ekipmanYuvasi(e);
    const ek: Record<number, number[]> = { 0: [6, 8], 10: [0, 2], 12: [9, 11] };
    return ek[e.yuva] ?? (ana >= 0 ? [ana] : []);
  }
  /**
   * Envanterde sürükle-bırak: `k` (kaynak) yuvasındaki eşyayı `h` (hedef) yuvasına taşır; hedefte eşya varsa yer değiştirirler.
   * Ekipman yuvasına yalnızca uygun eşya girer; ekipmandan çantaya yer değiştirirken karşıdaki eşya da o yuvaya uymalıdır.
   * Başarılıysa true (arayüz yenilenmeli).
   */
  esyaTasi(k: YuvaKonumu, h: YuvaKonumu): boolean {
    if (k.tur === h.tur && k.i === h.i) return false;
    const gecerli = (x: YuvaKonumu) => x.i >= 0 && x.i < (x.tur === 'c' ? this.envanter.length : this.ekipman.length);
    if (!gecerli(k) || !gecerli(h)) return false;
    const al = (x: YuvaKonumu): EsyaTanimi | null => (x.tur === 'c' ? this.envanter[x.i] : this.ekipman[x.i]) ?? null;
    const koy = (x: YuvaKonumu, e: EsyaTanimi | null) => { if (x.tur === 'c') this.envanter[x.i] = e; else this.ekipman[x.i] = e; };
    const a = al(k); if (!a) return false;
    const b = al(h);
    if (h.tur === 'e' && !Oyuncu.uygunYuvalar(a).includes(h.i)) return false;
    if (k.tur === 'e' && b && !Oyuncu.uygunYuvalar(b).includes(k.i)) return false;
    if (h.tur === 'e' && this.elCakismasi(a, h.i, k.tur === 'e' ? k.i : -1)) return false;
    if (k.tur === 'e' && b && this.elCakismasi(b, k.i, h.tur === 'e' ? h.i : -1)) return false;
    koy(h, a); koy(k, b);
    return true;
  }
  /**
   * Sunucu kuralı (ItemHandler IsValidSlotPos): iki elli silah (yuva 3 sağ, 4 sol: yay) ancak öbür el BOŞKEN giyilir; tek elli silah/kalkan ise öbür elde iki elli silah YOKKEN.
   * `yok`: bu hamlede boşalacak yuva (eşya o yuvadan geliyorsa öbür elde saymaz). true = çatışma var, giyilemez.
   */
  elCakismasi(e: EsyaTanimi, hedef: number, yok = -1): boolean {
    if (hedef !== 6 && hedef !== 8) return false;
    const diger = hedef === 6 ? 8 : 6;
    const o = diger === yok ? null : this.ekipman[diger];
    if (e.yuva === 3 || e.yuva === 4) return !!o;
    if (e.yuva <= 2) return !!o && (o.yuva === 3 || o.yuva === 4);
    return false;
  }
  /** Çantadaki i. eşyayı giyer (eski eşya çantaya döner). Giyilemezse null. */
  esyaKusan(i: number): EsyaTanimi | null {
    const e = this.envanter[i]; if (!e) return null;
    let p = Oyuncu.ekipmanYuvasi(e); if (p < 0) return null;
    if (e.yuva === 0) { // iki ele de uygun silah: sağ el boşsa ya da sol elde çatışma varsa sağa, sağ el doluysa ve çifte silah mümkünse sola
      const sag = this.ekipman[6]; p = !sag || this.elCakismasi(e, 8) ? 6 : 8;
    }
    if (this.elCakismasi(e, p)) return null;
    this.envanter[i] = this.ekipman[p]; this.ekipman[p] = e;
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
  /** Yeniden doğunca 10 sn (sunucu BLINK_TIME) göz kırpma: canavarlar fark etmez, skill kullanılamaz; saldırınca biter. Zaman: performance.now()/1000. */
  blinkBitis = 0;
  get blinkli(): boolean { return performance.now() / 1000 < this.blinkBitis; }
  /** Partide mi? (parti sistemi sunucu ile gelecek; partideyse ad sarı görünür.) */
  partide = false;
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
  /** Görünümü değiştirir (sunucudan ırk gelince): eski model sahneden kalkar, yenisi aynı animasyonla başlar. */
  async modelDegistir(no: number): Promise<void> {
    if (no === this.modelNo) return;
    const eski = this.model;
    await this.modelYukle(no);
    if (eski) this.grup.remove(eski.kok);
  }
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
  get savasVeri(): SavasOyuncusu { return { sinif: this.sinif, seviye: this.seviye, stat: this.stat, silah: this.silah, solSilah: this.ekipman[8], esyaSavunma: this.ekipman.reduce((t, e) => t + (e?.savunma ?? 0), 0), acEk: this.acEk }; }
  /** Toplam vuruş gücü (sunucu m_sTotalHit) ve toplam savunma (m_sTotalAc). */
  toplamVurus(): number { return toplamVurus(this.savasVeri); }
  savunma(): number { return toplamSavunma(this.savasVeri); }

  /** Alınan hasar zaten sunucu formülüyle hesaplanmıştır (savas.ts canavarVurusu). */
  hasarAl(miktar: number): number {
    this.can = Math.max(0, this.can - miktar);
    this.savastanBeri = 0;
    if (this.can <= 0) this.model?.oynatRastgele('olum', 3, false, 0.1);
    else this.model?.darbeOynat(true);
    return miktar;
  }

  /** Boş envanter yuvasına koyar; yer yoksa false. */
  esyaEkle(e: EsyaTanimi): boolean {
    const adet = e.adet ?? 1;
    if (e.sayilabilir) { // yığınlanabilir eşya aynı numaralı yuvaya eklenir (en çok 9999)
      const var_ = this.envanter.find((x) => x && x.no === e.no && (x.adet ?? 1) + adet <= 9999);
      if (var_) { var_.adet = (var_.adet ?? 1) + adet; return true; }
    }
    const i = this.envanter.indexOf(null);
    if (i < 0) return false;
    this.envanter[i] = e.sayilabilir ? { ...e, adet } : e;
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
  /** Sunucu modu: sunucudaki torba numarası (0 = yerel kutu), eşyaların kutudaki sunucu yuvaları (esyalar ile aynı sırada) ve Noah'ın yuvası. İçerik 0x24 cevabıyla dolar. */
  /** Kutuyu bırakan (ölü) canavar: ölü canavarın üstüne tıklamak da kutuyu açar. */
  sahip: Canavar | null = null;
  agTorba = 0; agYuvalar: { yuva: number; no: number }[] = []; agAltinYuva = -1; icerikGeldi = true;
  /** Kutuda başlangıçta Noah vardıysa ilk yuva Noah'a ayrılır; Noah alınınca öbür eşyalar yukarı kaymaz. */
  altinYuvasi: boolean;
  /** Pencere satırları SABİTTİR: her eşyanın satırı (esyalar ile aynı sırada) ve Noah'ın satırı (-1 = yok). Biri alınınca diğerleri yerinde kalır. */
  yerler: number[] = []; altinSatiri = -1;
  readonly secimKutusu: THREE.Mesh;
  private zaman = 0;

  /** Oyunun kendi eşya kutusu modeli (Misc/itembox.n3shape → /esya/itembox.glb). Yüklenemezse basit kutu çizilir. */
  private static model: THREE.Object3D | null = null;
  static async modelYukle(): Promise<void> {
    try { GanimetKutusu.model = (await new GLTFLoader().loadAsync('/esya/itembox.glb')).scene; } catch { GanimetKutusu.model = null; }
  }

  constructor(x: number, z: number, altin: number, esyalar: EsyaTanimi[]) {
    this.konum = new THREE.Vector2(x, z);
    this.altin = altin; this.esyalar = esyalar; this.altinYuvasi = altin > 0;
    this.altinSatiri = altin > 0 ? 0 : -1; this.yerler = esyalar.map((_, i) => i + (altin > 0 ? 1 : 0)); // yerel kutu: satırlar baştan sabitlenir
    if (GanimetKutusu.model) {
      const m = GanimetKutusu.model.clone(true);
      m.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { const mat = (me.material as THREE.MeshStandardMaterial).clone(); mat.emissive = new THREE.Color(0x553300); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.6; me.material = mat; } });
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
    this.grup.position.set(this.konum.x, arazi.yukseklikAl(this.konum.x, this.konum.y), -this.konum.y); // yerde durur (orijinalde kutu dönmez/zıplamaz)
  }
  get bos(): boolean { return this.altin <= 0 && this.esyalar.length === 0; }
}

export { rastgele };
