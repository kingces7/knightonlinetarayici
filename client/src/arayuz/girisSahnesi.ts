// Karakter seçim sahnesi: oyunun kendi 3B odası (Karus taht odası, ChrSelect/ka_*; client/scripts/girisSahnesiCevir.ts ile glb'ye çevrilir),
// tahtta oturan animasyonlu (nefes alan) karakter, loş ışık ve kenarlarda vinyet. Tam ekran bir tuvalde çizilir.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KarakterModeli } from '../dunya/karakter';

/** Kamera ve karakter yerleşimi (ces'in referans fotoğrafına göre ayarlanır). */
export const SAHNE_AYAR = {
  ka: { kamera: [0, -0.1, -8.2] as [number, number, number], bakis: [0, 0.6, -2.5] as [number, number, number], fov: 50, karakter: [0, -0.7, -2.9] as [number, number, number], karakterOlcek: 1.5 },
  el: { kamera: [0, 2.2, 9] as [number, number, number], bakis: [0, 2.0, 0] as [number, number, number], fov: 50, karakter: [0, 0.5, 0] as [number, number, number], karakterOlcek: 1 },
};

export class GirisSahnesi {
  readonly tuval = document.createElement('canvas');
  private cizici: THREE.WebGLRenderer;
  private sahne = new THREE.Scene();
  private kamera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
  private model: KarakterModeli | null = null;
  private modelNo = 0;
  private kare = 0;
  private yuru = { sure: 0, gecen: 0, bitti: null as (() => void) | null };
  private ayar: (typeof SAHNE_AYAR)['ka'];
  readonly oda = new THREE.Group();

  constructor(private ulus: 'ka' | 'el') {
    this.ayar = SAHNE_AYAR[ulus];
    this.cizici = new THREE.WebGLRenderer({ canvas: this.tuval, antialias: true });
    this.cizici.setClearColor(0x000000, 1);
    this.sahne.background = new THREE.Color(0x000000);
    this.sahne.fog = new THREE.Fog(0x050505, 14, 40);
    this.sahne.add(new THREE.HemisphereLight(0x9aa4b4, 0x2a2420, 0.85));
    const ana = new THREE.DirectionalLight(0xffe2b8, 1.15); ana.position.set(0, 6, 8); this.sahne.add(ana);
    this.sahne.add(this.oda);
    this.kamera.fov = this.ayar.fov; this.kamera.position.set(...this.ayar.kamera); this.kamera.lookAt(...this.ayar.bakis);
  }

  async yukle(): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(`/giris/${this.ulus}.glb`);
    this.oda.add(gltf.scene);
  }

  /** Oturan karakter modelini değiştirir (karakter seçimi/ırk değişince). */
  private yukleniyor: Promise<void> | null = null;
  karakterGoster(modelNo: number): Promise<void> {
    if (this.modelNo === modelNo && (this.model || this.yukleniyor)) return this.yukleniyor ?? Promise.resolve(); // aynı model zaten yükleniyor/yüklü
    this.modelNo = modelNo;
    this.yukleniyor = this.modelYukle(modelNo).finally(() => { if (this.modelNo === modelNo) this.yukleniyor = null; });
    return this.yukleniyor;
  }
  private async modelYukle(modelNo: number): Promise<void> {
    const eski = this.model; this.model = null;
    const m = await KarakterModeli.olustur(`/karakter/${modelNo}.glb`);
    if (this.modelNo !== modelNo) return; // bu arada başka karakter seçildi
    if (eski) this.sahne.remove(eski.kok);
    m.kok.position.set(...this.ayar.karakter); m.kok.scale.setScalar(this.ayar.karakterOlcek); m.kok.rotation.y = 0; // model -z'ye bakar: kamera -z tarafında
    this.sahne.add(m.kok); this.model = m;
    m.oynat('oturBasla', false, 0.1); setTimeout(() => { if (this.model === m) m.oynat('otur', true, 0.2); }, 900);
  }

  /** Karakter kameraya doğru yürür (Start); bitince çözülür. */
  yuruBaslat(sureMs = 1800): Promise<void> {
    const m = this.model; if (!m) return Promise.resolve();
    m.oynat('yuru', true, 0.2);
    this.yuru = { sure: sureMs / 1000, gecen: 0, bitti: null };
    return new Promise((coz) => { this.yuru.bitti = coz; });
  }

  boyutla(w: number, h: number): void {
    this.cizici.setPixelRatio(Math.min(devicePixelRatio, 2)); this.cizici.setSize(w, h, false);
    this.kamera.aspect = w / h; this.kamera.updateProjectionMatrix();
  }

  baslat(): void {
    let son = performance.now();
    const dongu = () => {
      const t = performance.now(), dt = Math.min(0.1, (t - son) / 1000); son = t;
      if (this.model) {
        this.model.guncelle(dt);
        if (this.yuru.sure > 0) {
          this.yuru.gecen += dt; const o = Math.min(1, this.yuru.gecen / this.yuru.sure);
          this.model.kok.position.z = this.ayar.karakter[2] - o * 4; this.model.kok.position.y = this.ayar.karakter[1] - o * 0.5;
          if (o >= 1) { this.yuru.sure = 0; this.yuru.bitti?.(); this.yuru.bitti = null; }
        }
      }
      this.cizici.render(this.sahne, this.kamera);
      this.kare = requestAnimationFrame(dongu);
    };
    this.kare = requestAnimationFrame(dongu);
  }

  kapat(): void { cancelAnimationFrame(this.kare); this.cizici.dispose(); this.tuval.remove(); }
}
