// Küçük glTF 2.0 (.glb) yazıcı. Dış kütüphane gerektirmez.
// Koordinat dönüşümü: Knight Online sol elli (D3D), glTF sağ elli → z eksenini ters çeviririz
// (konum/normal z → -z, dörtey (x,y,z,w) → (-x,-y,z,w), üçgen sırası ters).

type Json = Record<string, unknown>;

export interface GltfMesh {
  konum: Float32Array; normal?: Float32Array; uv?: Float32Array; indeks: Uint16Array | Uint32Array;
  malzeme: number;
  /** Deri (skin) için: köşe başına 4 kemik numarası ve ağırlık. */
  kemikler?: Uint16Array; agirliklar?: Float32Array;
}

export class GlbYazici {
  private parcalar: Buffer[] = [];
  private boy = 0;
  readonly json: Json & {
    asset: Json; scenes: Json[]; scene: number; nodes: Json[]; meshes: Json[]; materials: Json[];
    textures: Json[]; images: Json[]; samplers: Json[]; accessors: Json[]; bufferViews: Json[]; buffers: Json[];
    skins?: Json[]; animations?: Json[];
  };

  constructor() {
    this.json = {
      asset: { version: '2.0', generator: 'KnightEmpire araclar' },
      scenes: [{ nodes: [] }], scene: 0, nodes: [], meshes: [], materials: [], textures: [], images: [],
      samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
      accessors: [], bufferViews: [], buffers: [],
    };
  }

  private gorunum(veri: Uint8Array, hedef?: number): number {
    const hizali = (4 - (this.boy % 4)) % 4;
    if (hizali) { this.parcalar.push(Buffer.alloc(hizali)); this.boy += hizali; }
    const v: Json = { buffer: 0, byteOffset: this.boy, byteLength: veri.byteLength };
    if (hedef) v.target = hedef;
    this.parcalar.push(Buffer.from(veri.buffer, veri.byteOffset, veri.byteLength));
    this.boy += veri.byteLength;
    this.json.bufferViews.push(v);
    return this.json.bufferViews.length - 1;
  }

  erisimci(veri: Float32Array | Uint16Array | Uint32Array, tur: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4', hedef?: number, sinir = false): number {
    const bilesen = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[tur];
    const componentType = veri instanceof Float32Array ? 5126 : veri instanceof Uint16Array ? 5123 : 5125;
    const a: Json = { bufferView: this.gorunum(new Uint8Array(veri.buffer, veri.byteOffset, veri.byteLength), hedef), componentType, count: veri.length / bilesen, type: tur };
    if (sinir) {
      const mn = new Array(bilesen).fill(Infinity), mx = new Array(bilesen).fill(-Infinity);
      for (let i = 0; i < veri.length; i++) { const k = i % bilesen; mn[k] = Math.min(mn[k], veri[i]); mx[k] = Math.max(mx[k], veri[i]); }
      a.min = mn; a.max = mx;
    }
    this.json.accessors.push(a);
    return this.json.accessors.length - 1;
  }

  /** PNG resmi ekler, malzeme numarası döndürür. */
  malzeme(ad: string, png: Buffer | null, alfa: 'OPAQUE' | 'MASK' | 'BLEND' = 'OPAQUE', ciftYuz = false): number {
    const m: Json = { name: ad, pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 }, alphaMode: alfa, doubleSided: ciftYuz };
    if (alfa === 'MASK') m.alphaCutoff = 0.5;
    if (png) {
      this.json.images.push({ bufferView: this.gorunum(png), mimeType: 'image/png', name: ad });
      this.json.textures.push({ sampler: 0, source: this.json.images.length - 1 });
      (m.pbrMetallicRoughness as Json).baseColorTexture = { index: this.json.textures.length - 1 };
    }
    this.json.materials.push(m);
    return this.json.materials.length - 1;
  }

  /** Knight Online koordinatlarındaki parçalardan bir mesh ekler (dönüşüm burada yapılır). */
  mesh(ad: string, parcalar: GltfMesh[]): number {
    const primitives = parcalar.map((p) => {
      const kon = Float32Array.from(p.konum); for (let i = 2; i < kon.length; i += 3) kon[i] = -kon[i];
      const attributes: Json = { POSITION: this.erisimci(kon, 'VEC3', 34962, true) };
      if (p.normal) { const n = Float32Array.from(p.normal); for (let i = 2; i < n.length; i += 3) n[i] = -n[i]; attributes.NORMAL = this.erisimci(n, 'VEC3', 34962); }
      if (p.uv) attributes.TEXCOORD_0 = this.erisimci(p.uv, 'VEC2', 34962);
      if (p.kemikler && p.agirliklar) { attributes.JOINTS_0 = this.erisimci(p.kemikler, 'VEC4', 34962); attributes.WEIGHTS_0 = this.erisimci(p.agirliklar, 'VEC4', 34962); }
      const ind = p.indeks instanceof Uint32Array ? Uint32Array.from(p.indeks) : Uint16Array.from(p.indeks);
      for (let i = 0; i + 2 < ind.length; i += 3) { const t = ind[i + 1]; ind[i + 1] = ind[i + 2]; ind[i + 2] = t; }
      return { attributes, indices: this.erisimci(ind, 'SCALAR', 34963), material: p.malzeme };
    });
    this.json.meshes.push({ name: ad, primitives });
    return this.json.meshes.length - 1;
  }

  /** Düğüm ekler. konum/donus Knight Online koordinatlarında verilir. */
  dugum(d: { ad?: string; mesh?: number; konum?: number[]; donus?: number[]; olcek?: number[]; cocuklar?: number[]; skin?: number }, kok = false): number {
    const n: Json = {};
    if (d.ad) n.name = d.ad;
    if (d.mesh !== undefined) n.mesh = d.mesh;
    if (d.skin !== undefined) n.skin = d.skin;
    if (d.konum) n.translation = [d.konum[0], d.konum[1], -d.konum[2]];
    if (d.donus) n.rotation = [-d.donus[0], -d.donus[1], d.donus[2], d.donus[3]];
    if (d.olcek) n.scale = d.olcek;
    if (d.cocuklar?.length) n.children = d.cocuklar;
    this.json.nodes.push(n);
    const i = this.json.nodes.length - 1;
    if (kok) (this.json.scenes[0].nodes as number[]).push(i);
    return i;
  }

  glb(): Buffer {
    const bin = Buffer.concat(this.parcalar);
    const binHizali = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
    this.json.buffers = [{ byteLength: binHizali.length }];
    for (const k of ['skins', 'animations'] as const) if (this.json[k] && !(this.json[k] as Json[]).length) delete this.json[k];
    const j = Buffer.from(JSON.stringify(this.json), 'utf8');
    const jHizali = Buffer.concat([j, Buffer.alloc((4 - (j.length % 4)) % 4, 0x20)]);
    const bas = Buffer.alloc(12);
    bas.writeUInt32LE(0x46546c67, 0); bas.writeUInt32LE(2, 4); bas.writeUInt32LE(12 + 8 + jHizali.length + 8 + binHizali.length, 8);
    const jb = Buffer.alloc(8); jb.writeUInt32LE(jHizali.length, 0); jb.writeUInt32LE(0x4e4f534a, 4);
    const bb = Buffer.alloc(8); bb.writeUInt32LE(binHizali.length, 0); bb.writeUInt32LE(0x004e4942, 4);
    return Buffer.concat([bas, jb, jHizali, bb, binHizali]);
  }
}
