// Animasyonlu karakter/canavar modeli (araclar/model ile üretilen .glb).
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as iskeletKopyala } from 'three/addons/utils/SkeletonUtils.js';

const onbellek = new Map<string, Promise<GLTF>>();
type AnimBilgisi = Record<string, { animasyonlar: Record<string, { hiz: number; vurus: number | null; sure: number }> }>;
let animBilgisi: AnimBilgisi = {};

/** karakterler.json: her model için animasyon hızları (bir kez yüklenir). */
export async function animBilgisiYukle(): Promise<void> {
  try { animBilgisi = await (await fetch('/karakter/karakterler.json')).json(); } catch { animBilgisi = {}; }
}

function yukle(url: string): Promise<GLTF> {
  let p = onbellek.get(url);
  if (!p) { p = new GLTFLoader().loadAsync(url); onbellek.set(url, p); }
  return p;
}

export class KarakterModeli {
  readonly kok: THREE.Object3D;
  private karistirici: THREE.AnimationMixer;
  private klipler = new Map<string, THREE.AnimationClip>();
  private aktif: THREE.AnimationAction | null = null;
  aktifAd = '';
  /** Animasyon hız çarpanları (ad -> çarpan); varsayılan 1. */
  readonly hizlar = new Map<string, number>();

  private constructor(kok: THREE.Object3D, klipler: THREE.AnimationClip[]) {
    this.kok = kok;
    this.karistirici = new THREE.AnimationMixer(kok);
    for (const k of klipler) this.klipler.set(k.name, k);
    kok.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) { m.frustumCulled = false; }
    });
  }

  static async olustur(url: string): Promise<KarakterModeli> {
    const g = await yukle(url);
    const m = new KarakterModeli(iskeletKopyala(g.scene), g.animations);
    const no = /\/(\d+)\.glb$/.exec(url)?.[1];
    for (const [ad, b] of Object.entries(no ? animBilgisi[no]?.animasyonlar ?? {} : {})) if (b.hiz > 0) m.hizlar.set(ad, b.hiz);
    return m;
  }

  var(ad: string): boolean { return this.klipler.has(ad); }

  /** Animasyonu oynatır. tekrar=false ise son karede durur. Bitiş süresini (sn) döndürür. */
  oynat(ad: string, tekrar = true, gecis = 0.15): number {
    const klip = this.klipler.get(ad);
    if (!klip) return 0;
    if (this.aktifAd === ad && tekrar) return klip.duration;
    const yeni = this.karistirici.clipAction(klip);
    const hiz = this.hizlar.get(ad) ?? 1;
    yeni.reset();
    yeni.setLoop(tekrar ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    yeni.clampWhenFinished = !tekrar;
    yeni.timeScale = hiz > 0 ? hiz : 1;
    yeni.play();
    if (this.aktif && this.aktif !== yeni) this.aktif.crossFadeTo(yeni, gecis, false);
    this.aktif = yeni;
    this.aktifAd = ad;
    return klip.duration / (yeni.timeScale || 1);
  }

  // ---- Oturma: modelde oturma animasyonu yok; animasyonun üstüne kemik pozu uygulanır.
  // Ölçüm (scripts/pozara.mjs): kalça kemiği X ekseninde −90° → uyluk öne (−z) yatay; diz +90° → baldır dikey aşağı; kalça kökü ≈0,75 m alçalır.
  private oturHedef = 0;
  private oturDeger = 0;
  private kemikler: Record<string, THREE.Object3D | null> | null = null;
  private static readonly EKSEN_X = new THREE.Vector3(1, 0, 0);
  private readonly oturDonus = new THREE.Quaternion();

  oturPozu(aktif: boolean): void { this.oturHedef = aktif ? 1 : 0; }
  get oturuyor(): boolean { return this.oturHedef === 1; }

  guncelle(dt: number): void {
    this.karistirici.update(dt);
    const fark = this.oturHedef - this.oturDeger;
    if (fark !== 0) this.oturDeger += Math.sign(fark) * Math.min(Math.abs(fark), dt * 2.2); // ~0,45 sn
    if (this.oturDeger <= 0.0005) { this.hipsGeriAl(); return; }
    if (!this.kemikler) {
      const b = (ad: string) => this.kok.getObjectByName(ad) ?? null;
      this.kemikler = { Hips: b('Hips'), LeftHip: b('LeftHip'), RightHip: b('RightHip'), LeftKnee: b('LeftKnee'), RightKnee: b('RightKnee') };
    }
    const e = this.oturDeger * this.oturDeger * (3 - 2 * this.oturDeger); // yumuşatma
    const k = this.kemikler;
    const don = (kemik: THREE.Object3D | null | undefined, derece: number) => {
      if (!kemik) return;
      this.oturDonus.setFromAxisAngle(KarakterModeli.EKSEN_X, (derece * e * Math.PI) / 180);
      kemik.quaternion.multiply(this.oturDonus);
    };
    don(k.LeftHip, -90); don(k.RightHip, -90); don(k.LeftKnee, 90); don(k.RightKnee, 90);
    if (k.Hips) {
      // Animasyonda kalça konum izi yoksa kemik konumu kareden kareye kalır: önceki ofseti geri alıp yenisini uygula.
      const h = k.Hips;
      let taban = h.position.y;
      if (this.sonHipsY !== null && Math.abs(h.position.y - this.sonHipsY) < 1e-9) taban += this.sonOfset;
      h.position.y = taban - 0.75 * e; this.sonHipsY = h.position.y; this.sonOfset = 0.75 * e;
    }
  }

  private sonHipsY: number | null = null;
  private sonOfset = 0;
  private hipsGeriAl(): void {
    const h = this.kemikler?.Hips;
    if (h && this.sonHipsY !== null && Math.abs(h.position.y - this.sonHipsY) < 1e-9) h.position.y += this.sonOfset;
    this.sonHipsY = null; this.sonOfset = 0;
  }
}
