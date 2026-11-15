// Harita nesneleri (binalar, ağaçlar…): araclar/harita ile üretilen nesneler.glb.
// Çizim sayısını azaltmak için aynı malzemeyi kullanan sabit parçalar birleştirilir.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Animasyonlu doku (ateş, duman, ışınlanma işareti…): motorun `doku listesi + fps` kuralı; kare = süre × fps. */
export interface DokuAnimasyonu { fps: number; kareler: THREE.Texture[]; malzeme: THREE.MeshLambertMaterial }

/** Animasyonlu dokuların karesini zamana göre ilerletir. */
export function nesneAnimasyonunuIlerlet(animlar: DokuAnimasyonu[], saniye: number): void {
  for (const a of animlar) {
    const k = a.kareler[Math.floor(saniye * a.fps) % a.kareler.length];
    if (a.malzeme.map !== k) { a.malzeme.map = k; a.malzeme.needsUpdate = false; }
  }
}

export async function nesneleriYukle(url: string, anizotropi = 8): Promise<THREE.Group & { animlar?: DokuAnimasyonu[] }> {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  const gruplar = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const klasor = url.slice(0, url.lastIndexOf('/'));
  const yukleyici = new THREE.TextureLoader();
  const kareOnbellegi = new Map<string, THREE.Texture>();
  const kare = (ad: string): THREE.Texture => {
    let t = kareOnbellegi.get(ad);
    if (!t) { t = yukleyici.load(`${klasor}/anim/${ad}.png`); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; kareOnbellegi.set(ad, t); }
    return t;
  };
  const animlar: DokuAnimasyonu[] = [];
  const ayriMeshler: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const anim = (m.userData as { anim?: { fps: number; kareler: string[] } }).anim;
    if (anim) {
      // Animasyonlu parça birleştirilmez: kendi malzemesi ve dünya konumlu kendi geometrisi olur
      const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
      if (m.matrixWorld.determinant() < 0 && g.index) { const ind = g.index.array as Uint16Array | Uint32Array; for (let i = 0; i + 2 < ind.length; i += 3) { const t = ind[i + 1]; ind[i + 1] = ind[i + 2]; ind[i + 2] = t; } }
      for (const ad of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(ad)) g.deleteAttribute(ad);
      if (!g.attributes.normal) g.computeVertexNormals();
      const std = m.material as THREE.MeshStandardMaterial;
      const mat = new THREE.MeshLambertMaterial({ map: kare(anim.kareler[0]), transparent: std.transparent, alphaTest: std.alphaTest, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 1;
      ayriMeshler.push(mesh);
      animlar.push({ fps: anim.fps, kareler: anim.kareler.map(kare), malzeme: mat });
      return;
    }
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    // Ayna (negatif ölçek) varsa üçgen yönünü düzelt
    if (m.matrixWorld.determinant() < 0 && g.index) {
      const ind = g.index.array as Uint16Array | Uint32Array;
      for (let i = 0; i + 2 < ind.length; i += 3) { const t = ind[i + 1]; ind[i + 1] = ind[i + 2]; ind[i + 2] = t; }
    }
    for (const ad of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(ad)) g.deleteAttribute(ad);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    const mat = m.material as THREE.Material;
    if (!gruplar.has(mat)) gruplar.set(mat, []);
    gruplar.get(mat)!.push(g.index ? g.toNonIndexed() : g);
  });
  const sonuc = new THREE.Group() as THREE.Group & { animlar?: DokuAnimasyonu[] };
  sonuc.name = 'nesneler'; sonuc.animlar = animlar;
  for (const m of ayriMeshler) sonuc.add(m);
  for (const [mat, geos] of gruplar) {
    const birlesik = mergeGeometries(geos, false);
    if (!birlesik) continue;
    const std = mat as THREE.MeshStandardMaterial;
    if (std.map) std.map.anisotropy = anizotropi; // eğik bakılan yüzeylerde (zemin, duvar) dokular bulanıklaşmasın
    const yeni = new THREE.MeshLambertMaterial({
      map: std.map ?? null, transparent: std.transparent, alphaTest: std.alphaTest || (std.map && !std.transparent ? 0 : 0),
      side: std.side, depthWrite: !std.transparent,
    });
    if (std.alphaTest > 0) { yeni.alphaTest = std.alphaTest; yeni.transparent = false; yeni.depthWrite = true; }
    const mesh = new THREE.Mesh(birlesik, yeni);
    mesh.name = mat.name;
    sonuc.add(mesh);
  }
  return sonuc;
}
