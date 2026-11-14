// Oyun varlıkları: oyuncu, canavar ve ganimet kutusu.
// Konumlar Knight Online koordinatında tutulur: (x, z). Sahnede (x, y, -z) olarak çizilir.
import * as THREE from 'three';
import { KarakterModeli } from '../dunya/karakter';
import type { Arazi } from '../dunya/arazi';
import { type CanavarTuru, type EsyaTanimi, rastgele, rastgeleTam } from './veri';

/** Modellerin "ileri" yönü için düzeltme (radyan). Knight Online modelleri sahnede -z'ye bakıyor. */
export const YON_OFSET = Math.PI;

/** Bir basamakta çıkılabilecek en büyük yükseklik (m). */
const BASAMAK = 0.7;

export abstract class Varlik {
  /** Çarpışma ve zemin için kullanılan harita (main.ts atar). */
  static arazi: Arazi | null = null;
  readonly konum = new THREE.Vector2();
  yon = 0; // sahnede y ekseni etrafında dönüş
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
    this.grup.position.set(this.konum.x, this.yuksek, -this.konum.y);
    this.grup.rotation.y = this.yon;
  }
  bak(hedef: THREE.Vector2): void {
    const dx = hedef.x - this.konum.x, dz = -(hedef.y - this.konum.y);
    if (dx * dx + dz * dz > 1e-6) this.yon = Math.atan2(dx, dz) + YON_OFSET;
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

  /** Yapay zekâ. Saldırı yapılırsa verilen hasarı döndürür. */
  guncelle(dt: number, oyuncu: Oyuncu): number {
    this.model?.guncelle(dt);
    if (this.olu) { this.oluSuresi += dt; return 0; }
    const uzaklik = this.konum.distanceTo(oyuncu.konum);
    const dogumdan = this.konum.distanceTo(this.dogum);
    if (oyuncu.olu || dogumdan > 30) { this.kizgin = false; }
    if (!oyuncu.olu && (this.kizgin || (uzaklik < 6 && this.tur.seviye >= 3))) this.kizgin = true;

    if (this.kizgin && !oyuncu.olu) {
      if (uzaklik > 2.2) {
        this.durum = 'kovala';
        this.yuru(oyuncu.konum, this.tur.hiz * 1.6 * dt, 1.8);
        this.model?.oynat('kos');
      } else {
        this.durum = 'saldir';
        this.bak(oyuncu.konum);
        this.saldiriSayaci -= dt;
        if (this.saldiriSayaci <= 0) {
          this.saldiriSayaci = 1.8;
          this.model?.oynat('saldir0', false, 0.1);
          return rastgeleTam(this.tur.hasar[0], this.tur.hasar[1]);
        }
        if (this.saldiriSayaci < 1.0 && this.model?.aktifAd !== 'bekle') this.model?.oynat('bekle');
      }
      return 0;
    }
    // Gezinme
    this.durum = 'gez';
    if (this.gezHedef) {
      if (this.yuru(this.gezHedef, this.tur.hiz * dt)) { this.gezHedef = null; this.bekle = rastgele(2, 6); this.model?.oynat('bekle'); }
      else this.model?.oynat('yuru');
    } else {
      this.bekle -= dt;
      if (this.bekle <= 0) {
        const a = rastgele(0, Math.PI * 2), r = rastgele(2, 9);
        this.gezHedef = new THREE.Vector2(this.dogum.x + Math.cos(a) * r, this.dogum.y + Math.sin(a) * r);
      }
    }
    return 0;
  }
}

// ---------------------------------------------------------------- Oyuncu
export class Oyuncu extends Varlik {
  seviye = 1;
  deneyim = 0;
  altin = 0;
  mana = 100; enCokMana = 100;
  envanter: (EsyaTanimi | null)[] = new Array(28).fill(null);
  silah: EsyaTanimi | null = null;
  zirh: EsyaTanimi | null = null;
  hedef: Canavar | null = null;
  yuruHedef: THREE.Vector2 | null = null;
  saldiriSayaci = 0;
  savastanBeri = 99;

  constructor() {
    super(0.5, 1.9);
    this.can = this.enCok = 120;
  }

  async modelYukle(no: number): Promise<void> {
    this.model = await KarakterModeli.olustur(`/karakter/${no}.glb`);
    this.grup.add(this.model.kok);
    this.model.oynat('bekle');
  }

  hasarAraligi(): [number, number] {
    const taban = 6 + this.seviye * 3, ek = this.silah ? Math.round(this.silah.hasar * 0.6) : 0;
    return [taban + ek, taban + ek + 6 + this.seviye];
  }
  savunma(): number { return this.seviye * 2 + (this.zirh ? Math.round(this.zirh.savunma * 0.5) : 0); }

  hasarAl(miktar: number): number {
    const net = Math.max(1, miktar - Math.floor(this.savunma() / 4));
    this.can = Math.max(0, this.can - net);
    this.savastanBeri = 0;
    if (this.can <= 0) this.model?.oynat('olum0', false);
    return net;
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

  constructor(x: number, z: number, altin: number, esyalar: EsyaTanimi[]) {
    this.konum = new THREE.Vector2(x, z);
    this.altin = altin; this.esyalar = esyalar;
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
