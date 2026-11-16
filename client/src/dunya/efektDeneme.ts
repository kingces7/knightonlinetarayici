// DENEYSEL — .fxb biçiminin tek parçacıklı türü için alan tahminiyle (araclar/oyun/efekt-deneme.ts, docs/formatlar/fxb.md
// "Deneme" bölümü) çizilen bir parçacık efekti. Kaynak kodu yoktur, alan anlamları TAHMİNDİR; bu yüzden hiçbir gerçek
// skill'e bağlı DEĞİLDİR. Yalnızca window.ke.efektDene() ile elle tetiklenen görsel bir denemedir.
import * as THREE from 'three';

interface ParcacikTahmini {
  doku: string; dokuPng: string;
  omur: number; omurRastgele: number;
  boyutBas: number; boyutBit: number;
  hizMaksX: number; hizMaksY: number; hizMaksZ: number;
  surukleY: number; aci: number;
}

export interface Tanecik { sprite: THREE.Sprite; hiz: THREE.Vector3; omur: number; toplamOmur: number }

const ADET = 28;

export class EfektDeneme {
  private constructor(private veri: ParcacikTahmini, private doku: THREE.Texture, private malzeme: THREE.SpriteMaterial) {}

  static async yukle(url: string): Promise<EfektDeneme | null> {
    let veri: ParcacikTahmini;
    try { veri = await (await fetch(url)).json() as ParcacikTahmini; } catch { return null; }
    const klasor = url.slice(0, url.lastIndexOf('/'));
    const doku = await new THREE.TextureLoader().loadAsync(`${klasor}/${veri.dokuPng.split('/').pop()}`);
    doku.colorSpace = THREE.SRGBColorSpace;
    const malzeme = new THREE.SpriteMaterial({ map: doku, transparent: true, depthWrite: false, opacity: 0.85 });
    return new EfektDeneme(veri, doku, malzeme);
  }

  /** `konum`'da (3D sahne koordinatı) bir patlama oynatır; `sahne`ye geçici parçacıklar ekler. */
  oynat(sahne: THREE.Scene, konum: THREE.Vector3): Tanecik[] {
    const v = this.veri;
    const tamSahne = v.aci >= 359; // 360° = her yöne; değilse +Y ekseni etrafında koni
    const yariAci = (Math.min(v.aci, 360) * Math.PI) / 360;
    const tanecikler: Tanecik[] = [];
    for (let i = 0; i < ADET; i++) {
      const sprite = new THREE.Sprite(this.malzeme.clone());
      sprite.position.copy(konum);
      const boy = v.boyutBas * 0.3; // orijinal birim bire bir doğrulanmadı; sahneye göre gözle ölçeklendi
      sprite.scale.setScalar(boy);
      sprite.renderOrder = 5;
      sahne.add(sprite);
      // Yön: tam küre ya da +Y etrafında koni içinde rastgele; her eksende bağımsız hız sınırı kutusu içinde ölçeklenir
      let yon: THREE.Vector3;
      if (tamSahne) {
        yon = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      } else {
        const t = Math.random() * yariAci, f = Math.random() * Math.PI * 2;
        yon = new THREE.Vector3(Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f));
      }
      const hiz = new THREE.Vector3(yon.x * v.hizMaksX, yon.y * v.hizMaksY, yon.z * v.hizMaksZ).multiplyScalar(0.4 + Math.random() * 0.6);
      const omur = v.omur + Math.random() * v.omurRastgele;
      tanecikler.push({ sprite, hiz, omur, toplamOmur: omur || 1 });
    }
    return tanecikler;
  }

  /** Her kare çağrılır: taneciği ilerletir, büyütür, söndürür; ömrü bitenleri `biten` listesine ekler ve diziden çıkarır. */
  guncelle(tanecikler: Tanecik[], dt: number, sahne: THREE.Scene): void {
    const v = this.veri;
    for (let i = tanecikler.length - 1; i >= 0; i--) {
      const t = tanecikler[i];
      t.omur -= dt;
      if (t.omur <= 0) { sahne.remove(t.sprite); (t.sprite.material as THREE.SpriteMaterial).dispose(); tanecikler.splice(i, 1); continue; }
      t.sprite.position.addScaledVector(t.hiz, dt);
      t.sprite.position.y += v.surukleY * dt;
      const ilerleme = 1 - t.omur / t.toplamOmur;
      const boy = THREE.MathUtils.lerp(v.boyutBas, v.boyutBit, ilerleme) * 0.3;
      t.sprite.scale.setScalar(boy);
      (t.sprite.material as THREE.SpriteMaterial).opacity = 0.85 * (1 - ilerleme);
    }
  }
}
