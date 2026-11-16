// Harita suyu (nehir, kanal, deniz): araclar/harita/nehir.ts → harita/<ad>/su.json. Her parça iki katman:
//   1) dalga dokusu (z_nomaldark…), köşe saydamlığıyla (D3DCOLOR alfa: kıyıda şeffaf, ortada daha belirgin)
//   2) kostik (Misc/river/caust00..31, 32 kare) ikinci doku koordinatıyla, toplamalı karışım; kareler zamanla döner.
// Kostik hızı (KOSTIK_FPS) orijinalden doğrulanmadı.
import * as THREE from 'three';

interface SuVerisi { dalga: string; kostik: number; nehirler: { tur: string; genislik: number; ind: number[]; k: number[][] }[] }
const KOSTIK_FPS = 16;
/** Su, kameradan bu uzaklıkta (m) solmaya başlar ve ikincisinde tamamen kaybolur: çok uzaktaki su düz beyaz bir şerit gibi görünüyordu. */
const SU_SOLMA_BAS = 40, SU_SOLMA_SON = 110;
/** Malzemeye uzaklığa göre saydamlaşma ekler (üç.js'in kendi gölgelendiricisine küçük bir ek). */
function uzaktaSol(m: THREE.Material): void {
  m.onBeforeCompile = (s) => {
    s.vertexShader = 'varying float vSuMesafe;' + String.fromCharCode(10) + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + String.fromCharCode(10) + 'vSuMesafe = -mvPosition.z;');
    s.fragmentShader = 'varying float vSuMesafe;' + String.fromCharCode(10) + s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>' + String.fromCharCode(10) + `gl_FragColor.a *= 1.0 - smoothstep(${SU_SOLMA_BAS.toFixed(1)}, ${SU_SOLMA_SON.toFixed(1)}, vSuMesafe);`);
  };
}

export class Su {
  private kostikler: THREE.Texture[] = [];
  private kostikMalzeme: THREE.MeshBasicMaterial;
  private constructor(private grup: THREE.Group, kostikler: THREE.Texture[], km: THREE.MeshBasicMaterial) { this.kostikler = kostikler; this.kostikMalzeme = km; }

  static async yukle(url: string, sahne: THREE.Scene): Promise<Su | null> {
    let v: SuVerisi;
    try { v = await (await fetch(url)).json() as SuVerisi; } catch { return null; }
    if (!v?.nehirler?.length) return null;
    const klasor = url.slice(0, url.lastIndexOf('/'));
    const yukleyici = new THREE.TextureLoader();
    const doku = (yol: string): THREE.Texture => { const t = yukleyici.load(`${klasor}/${yol}`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; return t; };
    const dalga = doku(v.dalga);
    const kostikler = Array.from({ length: v.kostik }, (_, i) => doku(`su/caust${String(i).padStart(2, '0')}.png`));
    const taban = new THREE.MeshBasicMaterial({ map: dalga, color: 0x8fb4c8, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const kostikM = new THREE.MeshBasicMaterial({ map: kostikler[0] ?? null, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    uzaktaSol(taban); uzaktaSol(kostikM);
    const grup = new THREE.Group(); grup.name = 'su';
    for (const r of v.nehirler) {
      const n = r.k.length;
      const pos = new Float32Array(n * 3), renk = new Float32Array(n * 4), uv = new Float32Array(n * 2), uv2 = new Float32Array(n * 2);
      r.k.forEach((k, i) => { pos.set([k[0], k[1], -k[2]], i * 3); renk.set([1, 1, 1, k[3] / 255], i * 4); uv.set([k[4], k[5]], i * 2); uv2.set([k[6], k[7]], i * 2); });
      const g1 = new THREE.BufferGeometry();
      g1.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g1.setAttribute('color', new THREE.BufferAttribute(renk, 4)); g1.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g1.setIndex(r.ind);
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', g1.getAttribute('position')); g2.setAttribute('uv', new THREE.BufferAttribute(uv2, 2)); g2.setIndex(r.ind);
      const m1 = new THREE.Mesh(g1, taban), m2 = new THREE.Mesh(g2, kostikM);
      m1.frustumCulled = m2.frustumCulled = false; m1.renderOrder = 3; m2.renderOrder = 4;
      grup.add(m1, m2);
    }
    sahne.add(grup);
    return new Su(grup, kostikler, kostikM);
  }

  guncelle(saniye: number): void {
    if (!this.kostikler.length) return;
    this.kostikMalzeme.map = this.kostikler[Math.floor(saniye * KOSTIK_FPS) % this.kostikler.length];
  }
}
