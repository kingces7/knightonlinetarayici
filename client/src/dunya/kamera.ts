// Üçüncü şahıs kamera: hedefi (oyuncu) takip eder.
// Sağ fare tuşu basılıyken sürükle = döndür, tekerlek = yakınlaş/uzaklaş.
import * as THREE from 'three';

export class TakipKamerasi {
  readonly kamera: THREE.PerspectiveCamera;
  aci = Math.PI * 0.75; // yatay açı
  egim = 0.55; // dikey açı (radyan)
  uzaklik = 14;
  private surukleniyor = false;
  /** Hızlı dönüş: ulaşılacak yatay açı (null = dönüş yok). */
  private donusHedefi: number | null = null;

  constructor(tuval: HTMLCanvasElement) {
    this.kamera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000);
    tuval.addEventListener('contextmenu', (e) => e.preventDefault());
    tuval.addEventListener('pointerdown', (e) => { if (e.button === 2) { this.surukleniyor = true; tuval.setPointerCapture(e.pointerId); } });
    // Orta fare tuşu (tekerlek tıklaması): hızlıca arkaya dön (180°). Otomatik kaydırma imlecini engelle.
    tuval.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
    tuval.addEventListener('pointerdown', (e) => { if (e.button === 1) { e.preventDefault(); this.arkayaDon(); } });
    tuval.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
    tuval.addEventListener('pointerup', (e) => { if (e.button === 2) this.surukleniyor = false; });
    tuval.addEventListener('pointermove', (e) => {
      if (!this.surukleniyor) return;
      this.aci -= e.movementX * 0.006;
      this.egim = THREE.MathUtils.clamp(this.egim + e.movementY * 0.004, 0.08, 1.35);
    });
    tuval.addEventListener('wheel', (e) => {
      this.uzaklik = THREE.MathUtils.clamp(this.uzaklik * (e.deltaY > 0 ? 1.1 : 0.9), 3, 60);
    }, { passive: true });
  }

  /** Hızlıca 180° arkaya döner (orta fare tuşu / görev çubuğu kamera düğmesi). */
  arkayaDon(): void { this.donusHedefi = (this.donusHedefi ?? this.aci) + Math.PI; }

  /** Kameranın yatay bakış yönü (WASD için). */
  ileriYon(): THREE.Vector2 { return new THREE.Vector2(-Math.sin(this.aci), -Math.cos(this.aci)); }

  guncelle(hedef: THREE.Vector3, zeminYuksekligi: (x: number, zSahne: number) => number, dt = 1 / 60): void {
    if (this.donusHedefi !== null) {
      const fark = this.donusHedefi - this.aci;
      const adim = Math.min(1, dt * 18); // ~0,15 sn
      this.aci += fark * adim;
      if (Math.abs(fark) < 0.01) { this.aci = this.donusHedefi; this.donusHedefi = null; }
    }
    const yatay = Math.cos(this.egim) * this.uzaklik;
    const k = new THREE.Vector3(
      hedef.x + Math.sin(this.aci) * yatay,
      hedef.y + 1.6 + Math.sin(this.egim) * this.uzaklik,
      hedef.z + Math.cos(this.aci) * yatay,
    );
    k.y = Math.max(k.y, zeminYuksekligi(k.x, k.z) + 1.0); // kamera yerin altına girmesin
    this.kamera.position.copy(k);
    this.kamera.lookAt(hedef.x, hedef.y + 1.6, hedef.z);
  }

  boyutlandir(g: number, y: number): void { this.kamera.aspect = g / y; this.kamera.updateProjectionMatrix(); }
}
