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

  guncelle(dt: number): void { this.karistirici.update(dt); }
}
