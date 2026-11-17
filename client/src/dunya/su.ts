// Harita suyu (nehir, kanal, deniz): araclar/harita/nehir.ts → harita/<ad>/su.json. Her parça iki katman:
//   1) dalga dokusu (z_nomaldark…), köşe saydamlığıyla (D3DCOLOR alfa: kıyıda şeffaf, ortada daha belirgin)
//   2) kostik (Misc/river/caust00..31, 32 kare) ikinci doku koordinatıyla, toplamalı karışım; kareler zamanla döner.
// Kostik hızı (KOSTIK_FPS) orijinalden doğrulanmadı.
import * as THREE from 'three';

interface SuVerisi { dalga: string; kostik: number; nehirler: { tur: string; genislik: number; ind: number[]; k: number[][] }[] }
const KOSTIK_FPS = 16;
/** Su köşesi arazinin bu kadar (m) üstünden fazla yükseklikteyse "havada" sayılır; üçgenin en alçak köşesi bunun üstündeyse çizilmez. */
const SU_ASILI_ESIK = -0.15;
/** Su, kameradan bu uzaklıkta (m) solmaya başlar ve ikincisinde tamamen kaybolur: çok uzaktaki su düz beyaz bir şerit gibi görünüyordu. */
const SU_SOLMA_BAS = 40, SU_SOLMA_SON = 110;
/** Malzemeye uzaklığa göre saydamlaşma ekler (üç.js'in kendi gölgelendiricisine küçük bir ek). */
function uzaktaSol(m: THREE.Material): void {
  m.onBeforeCompile = (s) => {
    s.vertexShader = 'varying float vSuMesafe;' + String.fromCharCode(10) + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + String.fromCharCode(10) + 'vSuMesafe = -mvPosition.z;');
    s.fragmentShader = 'varying float vSuMesafe;' + String.fromCharCode(10) + s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>' + String.fromCharCode(10) + `gl_FragColor.a *= 1.0 - smoothstep(${SU_SOLMA_BAS.toFixed(1)}, ${SU_SOLMA_SON.toFixed(1)}, vSuMesafe);`);
  };
}

/**
 * Nehir vadisi: dosyadaki şerit (~12 m) vadinin dibinden dardır; arazi su seviyesinin altında (ya da en çok SU_TASMA üstünde) kaldığı sürece
 * her satırda şerit iki yana genişler (en çok SU_EN_COK_YAN). Genişlik komşu satırlarla yumuşatılır, kıyı kenarı dalgalanmasın.
 */
const SU_TASMA = 0.25, SU_EN_COK_YAN = 34, SU_ADIM = 1.5;
/** Nehir yüzeyi bu kadar (m) yükseltilir: kıyı şeritleri ıslak kıyı olarak sular altında kalır (kullanıcı isteği: oradaki su artmalı). */
const SU_YUKSELME = 0.7;
function vadiyeGenislet(k: number[][], arazi: (x: number, z: number) => number): number[][] {
  const satir = k.length / 4, sol: number[] = [], sag: number[] = [], yon: number[][] = [], orta: number[][] = [];
  for (let s = 0; s < satir; s++) {
    const [a, , , b] = [k[s * 4], k[s * 4 + 1], k[s * 4 + 2], k[s * 4 + 3]];
    const dx = b[0] - a[0], dz = b[2] - a[2], uz = Math.hypot(dx, dz) || 1, nx = dx / uz, nz = dz / uz;
    const cx = (k[s * 4 + 1][0] + k[s * 4 + 2][0]) / 2, cz = (k[s * 4 + 1][2] + k[s * 4 + 2][2]) / 2, y = k[s * 4 + 1][1] + SU_YUKSELME;
    yon.push([nx, nz]); orta.push([cx, cz, uz / 2]);
    const tara = (isaret: number): number => { let t = uz / 2; while (t < SU_EN_COK_YAN && arazi(cx + isaret * nx * (t + SU_ADIM), cz + isaret * nz * (t + SU_ADIM)) < y + SU_TASMA) t += SU_ADIM; return t; };
    sol.push(Math.max(uz / 2, tara(-1))); sag.push(Math.max(uz / 2, tara(1)));
  }
  const yumusat = (v: number[]) => v.map((_, i) => { let t = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(v.length - 1, i + 2); j++) { t += v[j]; n++; } return Math.max(v[i], t / n); });
  const ys = yumusat(sol), yg = yumusat(sag);
  const sonuc = k.map((x) => { const c = x.slice(); c[1] += SU_YUKSELME; return c; });
  for (let s = 0; s < satir; s++) {
    const [nx, nz] = yon[s], [cx, cz, yari] = orta[s], fs = ys[s] / yari, fg = yg[s] / yari;
    // sol köşeler (0, 1) merkezden uzaklaşır, sağ köşeler (2, 3) de; oranlar korunur (kıyı saydam, orta belirgin)
    for (const [c, f, isaret] of [[0, fs, -1], [1, fs, -1], [2, fg, 1], [3, fg, 1]] as [number, number, number][]) {
      const v = sonuc[s * 4 + c], eski = k[s * 4 + c], dist = Math.hypot(eski[0] - cx, eski[2] - cz);
      v[0] = cx + isaret * nx * dist * f; v[2] = cz + isaret * nz * dist * f;
    }
  }
  return sonuc;
}

export class Su {
  private kostikler: THREE.Texture[] = [];
  private kostikMalzeme: THREE.MeshBasicMaterial;
  private constructor(private grup: THREE.Group, kostikler: THREE.Texture[], km: THREE.MeshBasicMaterial) { this.kostikler = kostikler; this.kostikMalzeme = km; }

  /** `arazi`: arazi yüksekliği (x, z) — verilirse, tamamı arazinin ÜSTÜNDE kalan (havada asılı) su üçgenleri çizilmez: kuru yataklarda düz mavi karolar görünüyordu. */
  static async yukle(url: string, sahne: THREE.Scene, arazi?: (x: number, z: number) => number): Promise<Su | null> {
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
    for (const r0 of v.nehirler) {
      let r = r0, genisletildi = false;
      // Nehir şeridi 4 köşe genişliğinde bir IZGARADIR (her satırda kıyı-orta-orta-kıyı; kıyı köşeleri saydam). Eski dönüştürücü bunu zikzak şerit sanıp çapraz geniş dörtgenler üretiyordu.
      if (r.tur === 'serit' && r.k.length % 4 === 0) {
        const ind: number[] = [];
        for (let s = 0; s + 1 < r.k.length / 4; s++) for (let c = 0; c < 3; c++) { const a = s * 4 + c, b = a + 1, d = a + 4, e = d + 1; ind.push(a, b, d, b, e, d); }
        r = { ...r, ind };
        const ys = r.k.map((q) => q[1]); // düz (tüm köşeler aynı yükseklikte) şerit = şehir hendeği: plaza sulanmasın diye olduğu gibi kalır
        if (arazi && Math.max(...ys) - Math.min(...ys) > 0.5) { r = { ...r, k: vadiyeGenislet(r.k, arazi) }; genisletildi = true; }
      }
      if (arazi && !genisletildi) { // her üçgende en az bir köşe arazinin altında değilse (kıyı/yatak sınırı yok) üçgen atılır
        const ind: number[] = [];
        for (let i = 0; i + 2 < r.ind.length; i += 3) {
          let enAlt = Infinity;
          for (let j = 0; j < 3; j++) { const k = r.k[r.ind[i + j]]; enAlt = Math.min(enAlt, k[1] - arazi(k[0], k[2])); }
          if (enAlt < SU_ASILI_ESIK) ind.push(r.ind[i], r.ind[i + 1], r.ind[i + 2]);
        }
        r = { ...r, ind };
        if (!ind.length) continue;
      }
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
