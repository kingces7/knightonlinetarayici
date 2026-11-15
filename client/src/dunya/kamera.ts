// Üçüncü şahıs kamera: hedefi (oyuncu) takip eder.
// Sağ fare tuşu basılıyken sürükle = döndür, tekerlek = yakınlaş/uzaklaş.
import * as THREE from 'three';

export class TakipKamerasi {
  readonly kamera: THREE.PerspectiveCamera;
  aci = Math.PI * 0.75; // yatay açı
  egim = (23 * Math.PI) / 180; // dikey açı: 23° (kullanıcı ayarı; varsayılan kamera dosyasındaki 13° fazla yataydı)
  uzaklik = 14;
  /** Bakış açısını (derece) değiştirir: 8°–45° arası, kaydedilir. Yeni değeri döndürür. */
  egimDegistir(derece: number): number {
    const yeni = Math.max(8, Math.min(45, Math.round((this.egim * 180) / Math.PI + derece)));
    this.egim = (yeni * Math.PI) / 180;
    try { localStorage.setItem('ke_kamera_egim', String(yeni)); } catch { /* depolama kapalı */ }
    return yeni;
  }
  /** Fareyle girilmiş ama henüz uygulanmamış dönüş (rad); her karede kademeli uygulanır. */
  private bekleyenDonus = 0;
  /** Yakınlaştırma/uzaklaştırma sınırları (m). En uzak = oyunun varsayılan kamerası (DefaultCamera.N3Camera: göz–hedef mesafesi ≈ 21,8 m). */
  enYakin = 3; enUzak = 21.8;
  private surukleniyor = false;
  /** Hızlı dönüş: ulaşılacak yatay açı (null = dönüş yok). */
  private donusHedefi: number | null = null;
  private donusBaslangic = 0;
  private donusGecen = 0;
  /** Orta tuşla 180° dönüşün süresi (sn). */
  static readonly DONUS_SURESI = 0.7;

  constructor(tuval: HTMLCanvasElement) {
    this.kamera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000);
    try { const k = Number(localStorage.getItem('ke_kamera_egim')); if (k >= 8 && k <= 45) this.egim = (k * Math.PI) / 180; } catch { /* kayıt yok */ }
    tuval.addEventListener('contextmenu', (e) => e.preventDefault());
    tuval.addEventListener('pointerdown', (e) => { if (e.button === 2) this.surukleniyor = true; });
    // Orta fare tuşu (tekerlek tıklaması): hızlıca arkaya dön (180°). Otomatik kaydırma imlecini engelle.
    tuval.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
    tuval.addEventListener('pointerdown', (e) => { if (e.button === 1) { e.preventDefault(); this.arkayaDon(); } });
    tuval.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
    addEventListener('pointerup', (e) => { if (e.button === 2) this.surukleniyor = false; });
    // Sol tuş basılıyken sağ tuşa basılırsa tarayıcı ayrı bir pointerdown göndermez; bu yüzden basılı tuşlar (buttons) her harekette okunur.
    addEventListener('pointermove', (e) => {
      if (!(e.buttons & 2)) { this.surukleniyor = false; return; }
      if (e.target === tuval) this.surukleniyor = true;
      if (!this.surukleniyor) return;
      // Sağ tuşla sürükleme: yalnızca yatay dönüş (yukarı/aşağı eğim kapalı); yavaş ve yumuşak
      this.bekleyenDonus -= e.movementX * 0.0032;
    });
    tuval.addEventListener('wheel', (e) => {
      this.uzaklik = THREE.MathUtils.clamp(this.uzaklik * (e.deltaY > 0 ? 1.1 : 0.9), this.enYakin, this.enUzak);
    }, { passive: true });
  }

  /** Hızlıca 180° arkaya döner (orta fare tuşu / görev çubuğu kamera düğmesi). */
  arkayaDon(): void {
    this.donusBaslangic = this.aci; this.donusGecen = 0;
    this.donusHedefi = (this.donusHedefi ?? this.aci) + Math.PI;
  }

  /** Fareyle kamera çevriliyor mu? */
  get suruklenirken(): boolean { return this.surukleniyor; }
  /** Karakter ilerlerken kamerayı yavaşça karakterin arkasına getirir (heading: Knight Online x,z açısı). Fareyle çevirirken karışmaz. */
  arkayaHizala(heading: number, dt: number): void {
    if (this.surukleniyor || this.donusHedefi !== null) return;
    let fark = Math.atan2(-Math.cos(heading), -Math.sin(heading)) - this.aci;
    fark = Math.atan2(Math.sin(fark), Math.cos(fark));
    this.aci += fark * Math.min(1, 2.5 * dt);
  }
  /** Kameranın yatay bakış yönü. */
  ileriYon(): THREE.Vector2 { return new THREE.Vector2(-Math.sin(this.aci), -Math.cos(this.aci)); }

  /** Duvar/tavan çarpışması: 1 = engel yok; küçüldükçe kamera oyuncuya yaklaşır. Engelden hemen çıkmak değil, yavaşça açılmak için yumuşatılır. */
  private acikluk = 1;
  private static readonly ENGEL_PAYI = 0.35; // kamera duvardan en az bu kadar (m) önde durur

  /**
   * @param engel (başlangıç → kamera) doğru parçası (sahne koordinatı) ilk engelle hangi oranda (0..1) kesişiyor; yoksa null.
   */
  guncelle(hedef: THREE.Vector3, zeminYuksekligi: (x: number, zSahne: number) => number, dt = 1 / 60, engel?: (a: THREE.Vector3, b: THREE.Vector3) => number | null): void {
    if (this.donusHedefi !== null) {
      this.donusGecen += dt / TakipKamerasi.DONUS_SURESI;
      const t = Math.min(1, this.donusGecen), e = t * t * (3 - 2 * t); // yumuşak başla, yumuşak dur
      this.aci = this.donusBaslangic + (this.donusHedefi - this.donusBaslangic) * e;
      if (t >= 1) { this.aci = this.donusHedefi; this.donusHedefi = null; }
    }
    if (this.bekleyenDonus !== 0) { const adim = this.bekleyenDonus * (1 - Math.exp(-9 * dt)); this.aci += adim; this.bekleyenDonus -= adim; if (Math.abs(this.bekleyenDonus) < 1e-5) this.bekleyenDonus = 0; }
    const yatay = Math.cos(this.egim) * this.uzaklik;
    const k = new THREE.Vector3(
      hedef.x + Math.sin(this.aci) * yatay,
      hedef.y + 1.6 + Math.sin(this.egim) * this.uzaklik,
      hedef.z + Math.cos(this.aci) * yatay,
    );
    const bas = new THREE.Vector3(hedef.x, hedef.y + 1.6, hedef.z);
    if (engel) {
      const boy = bas.distanceTo(k);
      const t = engel(bas, k);
      const hedefAciklik = t === null ? 1 : Math.max(0.04, t - TakipKamerasi.ENGEL_PAYI / Math.max(boy, 0.001));
      // Engele girmeden önce anında yaklaş; engel kalkınca yavaşça uzaklaş (titreme olmasın)
      this.acikluk = hedefAciklik < this.acikluk ? hedefAciklik : Math.min(hedefAciklik, this.acikluk + (hedefAciklik - this.acikluk) * Math.min(1, dt * 4));
      k.lerpVectors(bas, k, this.acikluk);
    }
    k.y = Math.max(k.y, zeminYuksekligi(k.x, k.z) + 1.0); // kamera yerin altına girmesin
    this.kamera.position.copy(k);
    this.kamera.lookAt(hedef.x, hedef.y + 1.6, hedef.z);
  }

  /** Oyunun varsayılan kamera ayarı (Data/DefaultCamera.N3Camera → /oyun/kamera.json): görüş açısı (rad), yakın ve uzak düzlem. */
  ayarUygula(a: { fov: number; yakin: number; uzak: number; goz?: number[]; bak?: number[] }): void {
    if (a.goz && a.bak) { // Oyunun varsayılan kamerası (DefaultCamera.N3Camera): göz (15,5,−15), bakılan (0,0,0) → mesafe ≈ 21,8 m, eğim ≈ 13°
      const dx = a.goz[0] - a.bak[0], dy = a.goz[1] - a.bak[1], dz = a.goz[2] - a.bak[2];
      this.enUzak = Math.hypot(dx, dy, dz); this.uzaklik = this.enUzak;
    }
    this.kamera.fov = (a.fov * 180) / Math.PI; this.kamera.near = a.yakin; this.kamera.far = a.uzak;
    this.kamera.updateProjectionMatrix();
  }

  boyutlandir(g: number, y: number): void { this.kamera.aspect = g / y; this.kamera.updateProjectionMatrix(); }
}
