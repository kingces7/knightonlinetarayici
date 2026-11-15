// Gökyüzü: bölgenin .n3sky dosyasındaki gün döngüsü renkleri (araclar/oyun/gokyuzu.ts → harita/<ad>/gokyuzu.json).
// Gökyüzü kubbesi (zirveden ufka renk geçişi), sis rengi, ışıklar ve güneş yönü günün saatine göre anahtarlar arasında doğrusal değişir.
// Oyun saati: sunucu gerçek saati kullanır (GameServerDlg: m_sHour/m_sMin = yerel saat), hava hep açık. `?saat=12` ile saat zorlanabilir.
import * as THREE from 'three';

interface GokyuzuVerisi { anahtar: Record<string, number[][]> }

const GUN = 86400;

export class Gokyuzu {
  private kubbe: THREE.Mesh;
  private tepe = new THREE.Color(); private ufuk = new THREE.Color();
  private tmp = new THREE.Color();

  private constructor(
    private veri: GokyuzuVerisi, private sahne: THREE.Scene, private hemi: THREE.HemisphereLight, private gunes: THREE.DirectionalLight,
    private sisDegisti: (renk: THREE.Color) => void, private saatZorla: number | null,
  ) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { tepe: { value: this.tepe }, ufuk: { value: this.ufuk } },
      vertexShader: 'varying float y; void main(){ y = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 tepe; uniform vec3 ufuk; varying float y; void main(){ float t = pow(clamp(y,0.0,1.0), 0.6); gl_FragColor = vec4(mix(ufuk, tepe, t), 1.0); }',
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.kubbe = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), mat);
    this.kubbe.renderOrder = -1000; this.kubbe.frustumCulled = false;
    sahne.add(this.kubbe);
  }

  static async yukle(url: string, sahne: THREE.Scene, hemi: THREE.HemisphereLight, gunes: THREE.DirectionalLight, sisDegisti: (r: THREE.Color) => void, saatZorla: number | null): Promise<Gokyuzu | null> {
    try {
      const v = await (await fetch(url)).json() as GokyuzuVerisi;
      return v?.anahtar?.gokyuzu?.length ? new Gokyuzu(v, sahne, hemi, gunes, sisDegisti, saatZorla) : null;
    } catch { return null; }
  }

  /** Günün saniyesi (0..86400): gerçek yerel saat ya da zorlanan saat. */
  saniye(): number {
    if (this.saatZorla !== null) return (this.saatZorla * 3600) % GUN;
    const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }

  /** Anahtarlar arasında (gün sonunda başa dönerek) doğrusal renk. */
  private renk(ad: string, t: number, hedef: THREE.Color): THREE.Color {
    const l = this.veri.anahtar[ad];
    if (!l?.length) return hedef.setRGB(1, 1, 1);
    let sonra = l.findIndex((k) => k[0] > t);
    if (sonra < 0) sonra = 0;
    const once = (sonra - 1 + l.length) % l.length;
    const a = l[once], b = l[sonra];
    let aralik = b[0] - a[0]; if (aralik <= 0) aralik += GUN;
    let gecen = t - a[0]; if (gecen < 0) gecen += GUN;
    const f = Math.min(1, Math.max(0, gecen / aralik));
    return hedef.setRGB((a[1] + (b[1] - a[1]) * f) / 255, (a[2] + (b[2] - a[2]) * f) / 255, (a[3] + (b[3] - a[3]) * f) / 255);
  }

  /** Her kare: kubbeyi kameraya taşır, renkleri ve ışıkları günün saatine göre ayarlar. */
  guncelle(kamera: THREE.Vector3): void {
    this.kubbe.position.copy(kamera);
    const t = this.saniye();
    this.renk('gokyuzu', t, this.tepe);
    this.renk('sis', t, this.ufuk);
    (this.sahne.background as THREE.Color).copy(this.ufuk);
    if (this.sahne.fog) this.sahne.fog.color.copy(this.ufuk);
    this.sisDegisti(this.ufuk);
    this.renk('isik0', t, this.gunes.color);
    this.renk('isik1', t, this.hemi.color);
    this.renk('isik2', t, this.tmp); this.hemi.groundColor.copy(this.tmp).lerp(this.ufuk, 0.35); // zemin yansıması çok koyu kalmasın
    // Güneş yayı: sabah 6'da doğudan çıkar, öğlen tepede, akşam 18'de batar; geceleri alçak/loş yönden vurur
    const saat = t / 3600;
    const a = ((saat - 6) / 12) * Math.PI;
    const yuksek = Math.max(0.25, Math.sin(a));
    this.gunes.position.set(Math.cos(a) * 80, yuksek * 90, -30).add(kamera);
    this.gunes.target.position.copy(kamera); this.gunes.target.updateMatrixWorld();
  }
}
