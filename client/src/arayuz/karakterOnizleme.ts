// Envanter penceresindeki karakter alanı (area_char): oyuncu modelinin animasyonlu (bekleme) önizlemesi.
// Ayrı küçük bir WebGL çizicisi kullanır; yalnızca envanter açıkken çizilir. Sürükleyerek döndürülebilir.
import * as THREE from 'three';
import { KarakterModeli } from '../dunya/karakter';
import { modeldenIrk } from '../oyun/veri';

export class KarakterOnizleme {
  private cizici: THREE.WebGLRenderer;
  private sahne = new THREE.Scene();
  private kamera: THREE.PerspectiveCamera;
  private model: KarakterModeli | null = null;
  private donus = Math.PI; // model -z'ye baktığı için kameraya çevrilir
  private surukleniyor = false;

  constructor(private kap: HTMLElement, private modelNo: number, genislik = 170, yukseklik = 257) {
    this.cizici = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.cizici.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.cizici.setSize(genislik, yukseklik);
    this.cizici.setClearColor(0x000000, 0);
    const tuval = this.cizici.domElement;
    Object.assign(tuval.style, { position: 'absolute', left: '0', top: '0', width: `${genislik}px`, height: `${yukseklik}px`, cursor: 'grab' });
    kap.appendChild(tuval);
    this.kamera = new THREE.PerspectiveCamera(30, genislik / yukseklik, 0.1, 50);
    this.kamera.position.set(0, 1.05, 4.3);
    this.kamera.lookAt(0, 0.95, 0);
    this.sahne.add(new THREE.HemisphereLight(0xdfe8ff, 0x6b5a45, 1.8));
    const gunes = new THREE.DirectionalLight(0xfff2dd, 1.8); gunes.position.set(2, 4, 4); this.sahne.add(gunes);
    let sonX = 0;
    tuval.addEventListener('pointerdown', (e) => { this.surukleniyor = true; sonX = e.clientX; tuval.setPointerCapture(e.pointerId); tuval.style.cursor = 'grabbing'; });
    tuval.addEventListener('pointermove', (e) => { if (this.surukleniyor) { this.donus += (e.clientX - sonX) * 0.012; sonX = e.clientX; } });
    const birak = () => { this.surukleniyor = false; tuval.style.cursor = 'grab'; };
    tuval.addEventListener('pointerup', birak); tuval.addEventListener('pointercancel', birak);
  }

  /** Önizlenen modeli değiştirir (karakter oluşturma ekranında ırk seçilince). */
  async modelDegistir(modelNo: number): Promise<void> {
    if (this.model) { this.sahne.remove(this.model.kok); this.model = null; }
    this.modelNo = modelNo; await this.baslat();
  }
  /** Modeli verilen açı (rad) kadar döndürür (oluşturma ekranındaki ok düğmeleri). */
  donusEkle(rad: number): void { this.donus += rad; }
  /** Çizici kaynaklarını bırakır ve tuvali kaldırır. */
  kapat(): void { this.cizici.dispose(); this.cizici.domElement.remove(); }

  async baslat(): Promise<void> {
    try {
      this.model = await KarakterModeli.olustur(`/karakter/${this.modelNo}.glb`);
      this.model.oynat('bekle');
      this.sahne.add(this.model.kok);
    } catch (e) { console.warn('Karakter önizlemesi yüklenemedi', e); }
  }

  /** Her kare (envanter açıkken) çağrılır; silah/kalkan numaraları verilirse ele takılır. */
  ciz(dt: number, silah = 0, kalkan = 0, ekipman: ({ no: number } | null)[] = []): void {
    if (!this.model) return;
    this.model.giyimAyarla(ekipman, modeldenIrk(this.modelNo));
    this.model.silahAyarla((ekipman as { tip?: number }[])[6]?.tip ?? 0);
    void this.model.plugTak('sag', silah); void this.model.plugTak('sol', kalkan);
    this.model.guncelle(dt);
    this.model.kok.rotation.y = this.donus;
    this.cizici.render(this.sahne, this.kamera);
  }
}
