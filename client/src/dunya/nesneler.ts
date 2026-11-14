// Harita nesneleri (binalar, ağaçlar…): araclar/harita ile üretilen nesneler.glb.
// Çizim sayısını azaltmak için aynı malzemeyi kullanan sabit parçalar birleştirilir.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export async function nesneleriYukle(url: string): Promise<THREE.Group> {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  const gruplar = new Map<THREE.Material, THREE.BufferGeometry[]>();
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
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
  const sonuc = new THREE.Group();
  sonuc.name = 'nesneler';
  for (const [mat, geos] of gruplar) {
    const birlesik = mergeGeometries(geos, false);
    if (!birlesik) continue;
    const std = mat as THREE.MeshStandardMaterial;
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
