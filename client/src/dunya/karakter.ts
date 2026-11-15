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

/** silah.json: eşya numarası → takılacak eklem (iskelet ön-sıra numarası; 12 sağ el, 7 sol el). araclar: npm run silahlar */
let silahBilgisi: Record<string, { eklem: number }> = {};
export async function silahBilgisiYukle(): Promise<void> {
  try { silahBilgisi = await (await fetch('/silah/silah.json')).json(); } catch { silahBilgisi = {}; }
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

  // ---- Elde taşınan eşyalar (.n3cplug → /silah/<eşya no>.glb): ilgili el kemiğine takılır.
  private plugler = new Map<string, { no: number; nesne: THREE.Object3D; kemik: THREE.Object3D }>();
  private kemikBul(i: number): THREE.Object3D | null {
    let sonuc: THREE.Object3D | null = null;
    this.kok.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!sonuc && m.isSkinnedMesh && m.skeleton.bones[i]) sonuc = m.skeleton.bones[i]; });
    return sonuc;
  }
  /** `yuva` ('sag' | 'sol') için eşya modelini takar; no = 0 ya da modeli yoksa kaldırır. */
  async plugTak(yuva: string, no: number): Promise<void> {
    const eski = this.plugler.get(yuva);
    if (eski?.no === no) return;
    if (eski) { eski.kemik.remove(eski.nesne); this.plugler.delete(yuva); }
    const bilgi = no ? silahBilgisi[String(no)] : undefined;
    if (!bilgi) return;
    const kemik = this.kemikBul(bilgi.eklem); if (!kemik) return;
    try {
      const g = await yukle(`/silah/${no}.glb`);
      if (this.plugler.get(yuva)) return; // bu arada başka bir istek takmış
      const nesne = g.scene.clone(true);
      kemik.add(nesne);
      this.plugler.set(yuva, { no, nesne, kemik });
    } catch { /* model yoksa elde bir şey görünmez */ }
  }

  /** Özgün adı olmayan modellerde (oyuncu iskeleti) saldırı animasyonları silah türüne göre adlandırılmıştır; şimdilik kılıç (sword0). */
  private static readonly YEDEK_AD: Record<string, string> = { saldir0: '33_attack_sword0_A', saldir1: '34_attack_sword0_B' };

  /**
   * Animasyonu oynatır. tekrar=false ise son karede durur. Bitiş süresini (sn) döndürür.
   * Oturma animasyonları sürerken 'bekle' çağrıları yok sayılır; başka bir animasyon isteği (yürüme, darbe…) oturmayı bitirir.
   */
  oynat(ad: string, tekrar = true, gecis = 0.15): number {
    if (this.oturAsama !== 'yok') {
      if (ad === 'bekle') return 0;
      this.oturAsama = 'yok'; this.oturHedef = 0;
    }
    return this.calistir(ad, tekrar, gecis);
  }

  private calistir(ad: string, tekrar: boolean, gecis: number): number {
    const gercek = this.klipler.has(ad) ? ad : KarakterModeli.YEDEK_AD[ad] ?? ad;
    const klip = this.klipler.get(gercek);
    if (!klip) return 0;
    if (this.aktifAd === ad && tekrar) return klip.duration;
    const yeni = this.karistirici.clipAction(klip);
    const hiz = this.hizlar.get(gercek) ?? 1;
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

  // ---- Oturma, gerçek animasyonla: oturBasla (SitDown) → otur (SitDown_Breath, döngü) → kalk (StandUp).
  private oturAsama: 'yok' | 'basla' | 'otur' | 'kalk' = 'yok';
  private oturSayac = 0;
  private get gercekOturma(): boolean { return this.klipler.has('oturBasla') && this.klipler.has('otur') && this.klipler.has('kalk'); }

  // ---- Oturma: modelde oturma animasyonu yok; animasyonun üstüne yerde oturma pozu (kemik açıları) uygulanır.
  // Ölçüm (scripts/oturgor.mjs): kalça −140°, diz +160° (X ekseni) → dizler yukarıda, baldır geriye eğik, ayaklar yerde; kalça kökü 0,90 m alçalır.
  // Her karede: önceki karenin pozu geri yüklenir → animasyon güncellenir → ham poz saklanır → oturma eklenir (birikme/kayma olmaz).
  private static readonly OTUR_KALCA = -140;
  private static readonly OTUR_DIZ = 160;
  private static readonly OTUR_INDIR = 0.9;
  private oturHedef = 0;
  private oturDeger = 0;
  private kemikler: { hips: THREE.Object3D; ayak: { kemik: THREE.Object3D; aci: number }[] } | null = null;
  private kayit: { q: THREE.Quaternion[]; hipsY: number } | null = null;
  private static readonly EKSEN_X = new THREE.Vector3(1, 0, 0);
  private readonly oturDonus = new THREE.Quaternion();

  oturPozu(aktif: boolean): void {
    this.oturHedef = aktif ? 1 : 0;
    if (!this.gercekOturma) return;
    if (aktif && (this.oturAsama === 'yok' || this.oturAsama === 'kalk')) { this.oturAsama = 'basla'; this.oturSayac = this.calistir('oturBasla', false, 0.1); }
    else if (!aktif && this.oturAsama !== 'yok' && this.oturAsama !== 'kalk') { this.oturAsama = 'kalk'; this.oturSayac = this.calistir('kalk', false, 0.1); }
  }
  get oturuyor(): boolean { return this.oturHedef === 1; }

  guncelle(dt: number): void {
    const kb = this.kemikler;
    if (this.kayit && kb) { // önceki karede eklenen oturma pozunu geri al
      kb.ayak.forEach((a, i) => a.kemik.quaternion.copy(this.kayit!.q[i]));
      kb.hips.position.y = this.kayit.hipsY;
    }
    this.kayit = null;
    this.karistirici.update(dt);
    if (this.oturAsama !== 'yok') {
      this.oturSayac -= dt;
      if (this.oturSayac <= 0) {
        if (this.oturAsama === 'basla') { this.oturAsama = 'otur'; this.calistir('otur', true, 0.1); }
        else if (this.oturAsama === 'kalk') this.oturAsama = 'yok';
      }
    }
    if (this.gercekOturma) return; // kemik pozu yalnızca oturma animasyonu olmayan modeller için
    const fark = this.oturHedef - this.oturDeger;
    if (fark !== 0) this.oturDeger += Math.sign(fark) * Math.min(Math.abs(fark), dt * 2.2); // ~0,45 sn
    if (this.oturDeger <= 0.0005) { this.oturDeger = Math.max(0, this.oturDeger); return; }
    if (!this.kemikler) {
      const b = (ad: string) => this.kok.getObjectByName(ad);
      const hips = b('Hips');
      const ayak = ([['LeftHip', KarakterModeli.OTUR_KALCA], ['RightHip', KarakterModeli.OTUR_KALCA], ['LeftKnee', KarakterModeli.OTUR_DIZ], ['RightKnee', KarakterModeli.OTUR_DIZ]] as [string, number][])
        .flatMap(([ad, aci]) => { const k = b(ad); return k ? [{ kemik: k, aci }] : []; });
      if (!hips || !ayak.length) { this.oturDeger = 0; return; }
      this.kemikler = { hips, ayak };
    }
    const k = this.kemikler;
    const e = this.oturDeger * this.oturDeger * (3 - 2 * this.oturDeger); // yumuşatma
    this.kayit = { q: k.ayak.map((a) => a.kemik.quaternion.clone()), hipsY: k.hips.position.y };
    for (const a of k.ayak) {
      this.oturDonus.setFromAxisAngle(KarakterModeli.EKSEN_X, (a.aci * e * Math.PI) / 180);
      a.kemik.quaternion.multiply(this.oturDonus);
    }
    k.hips.position.y -= KarakterModeli.OTUR_INDIR * e;
  }
}
