// Arazi: yükseklik ızgarası + karo dokuları (araclar/harita ile üretilen veriler).
// Koordinatlar: Knight Online (x, y, z) -> sahne (x, y, -z). glTF nesneleri de aynı dönüşümle üretildi.
import * as THREE from 'three';
import { Carpisma } from './carpisma';

export interface AraziBilgisi {
  ad: string; boyut: number; birim: number; karoSayisi: number;
  atlas: { dosya: string; kolon: number; satir: number; karoPx: number };
  /** Gerçek renk haritası (.tct) varsa: ham RGBA, boyut×boyut, satır = z, sütun = x. */
  renk?: { dosya: string; boyut: number } | null;
}

export class Arazi {
  readonly bilgi: AraziBilgisi;
  readonly yukseklik: Float32Array;
  /** Arazi parçaları (her biri kendi sınırıyla görüş alanı dışında çizilmez); tıklama ışını için `intersectObject(mesh)` kullanılır. */
  readonly mesh: THREE.Group;
  private readonly malzeme: THREE.ShaderMaterial;
  /** Haritanın kenar uzunluğu (metre). */
  readonly genislik: number;
  /** Sunucu haritasından gelen duvar/zemin üçgenleri (varsa). */
  carpisma: Carpisma | null = null;

  private constructor(bilgi: AraziBilgisi, yukseklik: Float32Array, mesh: THREE.Group, malzeme: THREE.ShaderMaterial) {
    this.bilgi = bilgi; this.yukseklik = yukseklik; this.mesh = mesh; this.malzeme = malzeme;
    this.genislik = (bilgi.boyut - 1) * bilgi.birim;
  }

  static async yukle(klasor: string): Promise<Arazi> {
    const bilgi = (await (await fetch(`${klasor}/arazi.json`)).json()) as AraziBilgisi;
    const bin = await (await fetch(`${klasor}/arazi.bin`)).arrayBuffer();
    const n = bilgi.boyut, nn = n * n;
    let o = 0;
    const yukseklik = new Float32Array(bin, o, nn); o += nn * 4;
    const doku1 = new Uint16Array(bin, o, nn); o += nn * 2;
    const doku2 = new Uint16Array(bin, o, nn); o += nn * 2;
    const yon1 = new Uint8Array(bin, o, nn); o += nn;
    const yon2 = new Uint8Array(bin, o, nn);
    const karolar = await karoDizisi(`${klasor}/karolar.bin`, bilgi);

    // Karo bilgisi dokuları (karo başına bir piksel)
    const k = n - 1;
    const v1 = new Uint8Array(k * k * 4), v2 = new Uint8Array(k * k * 4);
    for (let tx = 0; tx < k; tx++) for (let tz = 0; tz < k; tz++) {
      const i = tx * n + tz, p = (tz * k + tx) * 4;
      v1[p] = doku1[i] & 255; v1[p + 1] = doku1[i] >> 8; v1[p + 2] = yon1[i];
      const var2 = doku2[i] < bilgi.karoSayisi;
      v2[p] = doku2[i] & 255; v2[p + 1] = doku2[i] >> 8; v2[p + 2] = yon2[i]; v2[p + 3] = var2 ? 255 : 0;
    }
    const veriDokusu = (v: Uint8Array) => {
      const t = new THREE.DataTexture(v, k, k, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
    };
    // Taban renk: gerçek renk haritası (.tct, ~1 piksel/metre) varsa o; yoksa karo ortalamalarından yaklaşık harita.
    let taban: THREE.DataTexture;
    if (bilgi.renk) {
      const r = bilgi.renk, veri = new Uint8Array(await (await fetch(`${klasor}/${r.dosya}`)).arrayBuffer());
      taban = new THREE.DataTexture(veri, r.boyut, r.boyut, THREE.RGBAFormat, THREE.UnsignedByteType);
      taban.minFilter = THREE.LinearMipmapLinearFilter; taban.generateMipmaps = true; taban.anisotropy = 8;
    } else {
      const tabanVeri = new Uint8Array(await (await fetch(`${klasor}/taban.bin`)).arrayBuffer());
      taban = new THREE.DataTexture(tabanVeri, k, k, THREE.RGBAFormat, THREE.UnsignedByteType);
      taban.minFilter = THREE.LinearFilter;
    }
    taban.magFilter = THREE.LinearFilter; taban.colorSpace = THREE.SRGBColorSpace; taban.needsUpdate = true;

    // Geometri: köşe başına bir nokta
    const geo = new THREE.BufferGeometry();
    const konum = new Float32Array(nn * 3);
    for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) {
      const i = x * n + z;
      konum[i * 3] = x * bilgi.birim; konum[i * 3 + 1] = yukseklik[i]; konum[i * 3 + 2] = -z * bilgi.birim;
    }
    const indeks = new Uint32Array(k * k * 6);
    let t = 0;
    for (let x = 0; x < k; x++) for (let z = 0; z < k; z++) {
      const a = x * n + z, b = (x + 1) * n + z, c = x * n + z + 1, d = (x + 1) * n + z + 1;
      indeks.set([a, b, c, c, b, d], t); t += 6;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(konum, 3));
    geo.setIndex(new THREE.BufferAttribute(indeks, 1));
    geo.computeVertexNormals();
    // Tüm arazi tek geometriydi (513×513 haritada ≈526 bin üçgen, hep çizilirdi). Şimdi PARCA×PARCA karelik parçalara bölünür: köşe ve normal verisi ortak, her parçanın kendi indeksi ve sınır küresi var;
    // görüş alanı (ve kamera uzak sınırı) dışındaki parçalar çizilmez. Üçgen bölünmesi öncekiyle aynı (yükseklikAl ve çarpışma bozulmaz).
    const PARCA = 32;
    const parcalar: { ix: Uint32Array; kure: THREE.Sphere }[] = [];
    for (let px = 0; px < k; px += PARCA) for (let pz = 0; pz < k; pz += PARCA) {
      const x1 = Math.min(px + PARCA, k), z1 = Math.min(pz + PARCA, k);
      const ix = new Uint32Array((x1 - px) * (z1 - pz) * 6); let q = 0, yMin = Infinity, yMax = -Infinity;
      for (let x = px; x < x1; x++) for (let z = pz; z < z1; z++) {
        const a = x * n + z, b = (x + 1) * n + z, c = x * n + z + 1, e = (x + 1) * n + z + 1;
        ix[q++] = a; ix[q++] = b; ix[q++] = c; ix[q++] = c; ix[q++] = b; ix[q++] = e;
        for (const v of [a, b, c, e]) { const h = yukseklik[v]; if (h < yMin) yMin = h; if (h > yMax) yMax = h; }
      }
      const cx = ((px + x1) / 2) * bilgi.birim, cz = -((pz + z1) / 2) * bilgi.birim, cy = (yMin + yMax) / 2;
      const yar = Math.hypot(((x1 - px) * bilgi.birim) / 2, ((z1 - pz) * bilgi.birim) / 2, (yMax - yMin) / 2) + 1;
      parcalar.push({ ix, kure: new THREE.Sphere(new THREE.Vector3(cx, cy, cz), yar) });
    }

    const malzeme = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        karolar: { value: karolar }, bilgi1: { value: veriDokusu(v1) }, bilgi2: { value: veriDokusu(v2) }, taban: { value: taban },
        birim: { value: bilgi.birim }, karoSayisi: { value: k }, detay: { value: 1.0 },
        gunesYonu: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
        sisRengi: { value: new THREE.Color(0x9fb4c8) }, sisYakin: { value: 150 }, sisUzak: { value: 600 },
      },
      vertexShader: /* glsl */ `
        out vec3 vDunya; out vec3 vNormal; out float vDerinlik;
        void main() {
          vDunya = position; vNormal = normal;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDerinlik = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        precision highp float; precision highp sampler2DArray;
        layout(location = 0) out highp vec4 pc_fragColor;
        #define gl_FragColor pc_fragColor
        uniform sampler2DArray karolar; uniform sampler2D bilgi1; uniform sampler2D bilgi2; uniform sampler2D taban;
        uniform float birim; uniform float karoSayisi; uniform float detay; uniform vec3 gunesYonu;
        uniform vec3 sisRengi; uniform float sisYakin; uniform float sisUzak;
        in vec3 vDunya; in vec3 vNormal; in float vDerinlik;
        vec2 yonUv(float yon, vec2 uv) {
          int d = int(yon + 0.5) & 7;
          if (d == 1) return vec2(uv.y, 1.0 - uv.x);
          if (d == 2) return vec2(1.0 - uv.x, 1.0 - uv.y);
          if (d == 3) return vec2(1.0 - uv.y, uv.x);
          if (d == 4) return vec2(1.0 - uv.x, uv.y);
          if (d == 5) return vec2(uv.x, 1.0 - uv.y);
          if (d == 6) return vec2(uv.y, uv.x);
          if (d == 7) return vec2(1.0 - uv.y, 1.0 - uv.x);
          return uv;
        }
        void main() {
          vec2 ko = vec2(vDunya.x, -vDunya.z) / birim;
          ivec2 karo = clamp(ivec2(floor(ko)), ivec2(0), ivec2(int(karoSayisi) - 1));
          vec2 yerel = fract(ko);
          vec4 b1 = texelFetch(bilgi1, karo, 0) * 255.0;
          vec4 b2 = texelFetch(bilgi2, karo, 0) * 255.0;
          // Türevleri karo sınırında sıçramasın diye sürekli koordinattan al
          vec2 dx = dFdx(ko), dy = dFdy(ko);
          // Geçiş karoları kenarlarında kararır (rengi saydamlıkla önceden çarpılmış gibi).
          // Karanlığı saydamlık olarak kullanıp katmanları alttan üste bindiriyoruz:
          // taban renk (yaklaşık renk haritası) -> 1. karo -> 2. karo.
          // Not: Oyunun birebir karışım kuralı şifreli renk haritası çözülünce uygulanacak.
          vec3 c = texture(taban, (ko - 0.5) / karoSayisi + 0.5 / karoSayisi).rgb;
          vec2 uv1 = yonUv(b1.z, yerel);
          vec3 t1 = textureGrad(karolar, vec3(uv1, b1.x + b1.y * 256.0), dx, dy).rgb;
          float a1 = smoothstep(0.02, 0.22, max(t1.r, max(t1.g, t1.b)));
          c = mix(c, t1 / max(a1, 0.35), a1 * detay);
          if (b2.w > 0.5) {
            vec2 uv2 = yonUv(b2.z, yerel);
            vec3 t2 = textureGrad(karolar, vec3(uv2, b2.x + b2.y * 256.0), dx, dy).rgb;
            float a2 = smoothstep(0.02, 0.22, max(t2.r, max(t2.g, t2.b)));
            c = mix(c, t2 / max(a2, 0.35), a2 * 0.85 * detay);
          }
          c = min(c, vec3(1.0));
          // Yumuşak diz: koyu/orta tonlar korunur (zemin canlı kalır), yalnızca parlak tonlar sıkıştırılır (beyaza/açık griye yanmasın, nesnelerle aynı koyulukta dursun).
          c = pow(c, vec3(1.12));
          vec3 asiri = max(c - vec3(0.62), vec3(0.0));
          c = min(c, vec3(0.62)) + asiri * 0.45;
          float isik = 0.64 + 0.5 * max(dot(normalize(vNormal), gunesYonu), 0.0); // 0,58 (gölge) … 1,08 (güneşe dönük)
          vec3 r = c * isik;
          float sis = smoothstep(sisYakin, sisUzak, vDerinlik);
          gl_FragColor = vec4(mix(r, sisRengi, sis), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Group();
    mesh.name = 'arazi';
    const konumAttr = geo.getAttribute('position'), normalAttr = geo.getAttribute('normal');
    for (const p of parcalar) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', konumAttr); g.setAttribute('normal', normalAttr); g.setIndex(new THREE.BufferAttribute(p.ix, 1));
      g.boundingSphere = p.kure; g.boundingBox = new THREE.Box3().setFromCenterAndSize(p.kure.center, new THREE.Vector3(p.kure.radius * 2, p.kure.radius * 2, p.kure.radius * 2));
      const m = new THREE.Mesh(g, malzeme); m.name = 'arazi-parca'; mesh.add(m);
    }
    geo.dispose();
    const arazi = new Arazi(bilgi, yukseklik, mesh, malzeme);
    // Çarpışma verisi isteğe bağlı: yoksa karakterler duvarlardan geçer (eski davranış).
    arazi.carpisma = await Carpisma.yukle(`${klasor}/carpisma.bin`, arazi.genislik).catch(() => null);
    return arazi;
  }

  /** Knight Online koordinatında (x, z) yükseklik (çift doğrusal ara değer). */
  yukseklikAl(x: number, z: number): number {
    const n = this.bilgi.boyut, b = this.bilgi.birim;
    const fx = Math.min(Math.max(x / b, 0), n - 1.001), fz = Math.min(Math.max(z / b, 0), n - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), ax = fx - ix, az = fz - iz;
    const h = (i: number, j: number) => this.yukseklik[i * n + j];
    // Üçgen bölünmesi geometriyle aynı: (a,b,c) ve (c,b,d)
    if (ax + az <= 1) return h(ix, iz) + (h(ix + 1, iz) - h(ix, iz)) * ax + (h(ix, iz + 1) - h(ix, iz)) * az;
    return h(ix + 1, iz + 1) + (h(ix, iz + 1) - h(ix + 1, iz + 1)) * (1 - ax) + (h(ix + 1, iz) - h(ix + 1, iz + 1)) * (1 - az);
  }

  /** Sis ayarı (nesnelerle uyumlu olsun diye). */
  sisAyarla(renk: THREE.Color, yakin: number, uzak: number): void {
    const u = this.malzeme.uniforms;
    u.sisRengi.value.copy(renk); u.sisYakin.value = yakin; u.sisUzak.value = uzak;
  }
}

async function karoDizisi(url: string, bilgi: AraziBilgisi): Promise<THREE.DataArrayTexture> {
  // Ham RGBA (karo karo art arda). PNG + canvas kullanılmıyor: saydam piksellerin rengini siliyor.
  const p = bilgi.atlas.karoPx;
  const veri = new Uint8Array(await (await fetch(url)).arrayBuffer());
  if (veri.length !== p * p * 4 * bilgi.karoSayisi) throw new Error('karolar.bin boyutu beklenenden farklı');
  const t = new THREE.DataArrayTexture(veri, p, p, bilgi.karoSayisi);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
