// Çarpışma: sunucu haritasındaki (.smd) üçgenlerle duvar engeli ve zemin (köprü, kat, merdiven) yüksekliği.
// Koordinatlar Knight Online dünyası: (x, y yukarı, z). Veri carpisma.bin: üçgen başına 9 float.
const HUCRE = 4; // ızgara hücresi (m)
const ZEMIN_NORMAL = 0.55; // normal.y bundan büyükse yürünebilir zemin, mutlak değer küçükse duvar; küçük (aşağı bakan) ise tavan (yalnızca kamera için)

export class Carpisma {
  private readonly v: Float32Array;
  private readonly n: Float32Array; // üçgen başına normal (3)
  private readonly sinif: Uint8Array; // 0 = yok say, 1 = zemin, 2 = duvar, 3 = tavan (yalnızca kamera çarpışması)
  private readonly hucreler: Map<number, number[]> = new Map();
  private readonly kolon: number;

  constructor(veri: Float32Array, haritaBoyu: number) {
    this.v = veri;
    const adet = veri.length / 9;
    this.kolon = Math.ceil(haritaBoyu / HUCRE) + 1;
    this.n = new Float32Array(adet * 3);
    this.sinif = new Uint8Array(adet);
    for (let t = 0; t < adet; t++) {
      const o = t * 9;
      const ux = veri[o + 3] - veri[o], uy = veri[o + 4] - veri[o + 1], uz = veri[o + 5] - veri[o + 2];
      const wx = veri[o + 6] - veri[o], wy = veri[o + 7] - veri[o + 1], wz = veri[o + 8] - veri[o + 2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const u = Math.hypot(nx, ny, nz);
      if (u < 1e-9) continue; // dejenere üçgen
      nx /= u; ny /= u; nz /= u;
      this.n[t * 3] = nx; this.n[t * 3 + 1] = ny; this.n[t * 3 + 2] = nz;
      this.sinif[t] = ny > ZEMIN_NORMAL ? 1 : Math.abs(ny) <= ZEMIN_NORMAL ? 2 : 3;
      if (!this.sinif[t]) continue;
      const x0 = Math.min(veri[o], veri[o + 3], veri[o + 6]), x1 = Math.max(veri[o], veri[o + 3], veri[o + 6]);
      const z0 = Math.min(veri[o + 2], veri[o + 5], veri[o + 8]), z1 = Math.max(veri[o + 2], veri[o + 5], veri[o + 8]);
      const a0 = Math.max(0, Math.floor(x0 / HUCRE)), a1 = Math.floor(x1 / HUCRE);
      const b0 = Math.max(0, Math.floor(z0 / HUCRE)), b1 = Math.floor(z1 / HUCRE);
      for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
        const k = a * this.kolon + b;
        const l = this.hucreler.get(k);
        if (l) l.push(t); else this.hucreler.set(k, [t]);
      }
    }
  }

  static async yukle(url: string, haritaBoyu: number): Promise<Carpisma | null> {
    const yanit = await fetch(url);
    if (!yanit.ok) return null;
    const tampon = await yanit.arrayBuffer();
    if (tampon.byteLength % 36 !== 0) return null; // vite, dosya yoksa index.html döndürebilir
    return new Carpisma(new Float32Array(tampon), haritaBoyu);
  }

  /** (x,z) noktasının altındaki/üstündeki en yüksek yürünebilir zemin; `ustY`'yi geçmeyenler arasından. Yoksa null. */
  zemin(x: number, z: number, ustY: number): number | null {
    const l = this.hucreler.get(Math.floor(x / HUCRE) * this.kolon + Math.floor(z / HUCRE));
    if (!l) return null;
    let en: number | null = null;
    for (const t of l) {
      if (this.sinif[t] !== 1) continue;
      const o = t * 9, v = this.v;
      // (x,z) üçgenin yatay izdüşümünde mi?
      const d1 = (x - v[o + 6]) * (v[o + 5] - v[o + 8]) - (v[o + 3] - v[o + 6]) * (z - v[o + 8]);
      const d2 = (x - v[o]) * (v[o + 8] - v[o + 2]) - (v[o + 6] - v[o]) * (z - v[o + 2]);
      const d3 = (x - v[o + 3]) * (v[o + 2] - v[o + 5]) - (v[o] - v[o + 3]) * (z - v[o + 5]);
      const eksi = d1 < 0 || d2 < 0 || d3 < 0, arti = d1 > 0 || d2 > 0 || d3 > 0;
      if (eksi && arti) continue;
      const nx = this.n[t * 3], ny = this.n[t * 3 + 1], nz = this.n[t * 3 + 2];
      const y = v[o + 1] - (nx * (x - v[o]) + nz * (z - v[o + 2])) / ny;
      if (y <= ustY && (en === null || y > en)) en = y;
    }
    return en;
  }

  /**
   * Yarıçapı `r` olan bir daireyi (x,z) noktasından duvarların dışına iter. `y` ayak yüksekliği; vücut
   * y+0.4 … y+1.6 arasında sayılır (düşük basamaklar engel olmaz). Yeni (x,z) döndürür.
   */
  duvarlardanIt(x: number, z: number, y: number, r: number): [number, number] {
    const yAlt = y + 0.45, yUst = y + 1.5;
    for (let tur = 0; tur < 3; tur++) {
      let itildi = false;
      const a0 = Math.floor((x - r) / HUCRE), a1 = Math.floor((x + r) / HUCRE);
      const b0 = Math.floor((z - r) / HUCRE), b1 = Math.floor((z + r) / HUCRE);
      for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
        const l = this.hucreler.get(a * this.kolon + b);
        if (!l) continue;
        for (const t of l) {
          if (this.sinif[t] !== 2) continue;
          const o = t * 9, v = this.v;
          const yMin = Math.min(v[o + 1], v[o + 4], v[o + 7]), yMax = Math.max(v[o + 1], v[o + 4], v[o + 7]);
          if (yMax < yAlt || yMin > yUst) continue;
          for (const yy of [Math.max(yAlt, yMin), Math.min(yUst, yMax)]) {
            const seg = this.kesit(o, yy);
            if (!seg) continue;
            const [sx, sz, ex, ez] = seg;
            const dx = ex - sx, dz = ez - sz, uz2 = dx * dx + dz * dz;
            let k = uz2 > 1e-9 ? ((x - sx) * dx + (z - sz) * dz) / uz2 : 0;
            k = k < 0 ? 0 : k > 1 ? 1 : k;
            const px = sx + dx * k, pz = sz + dz * k;
            let fx = x - px, fz = z - pz;
            const d = Math.hypot(fx, fz);
            if (d >= r) continue;
            if (d < 1e-5) { fx = this.n[t * 3]; fz = this.n[t * 3 + 2]; const m = Math.hypot(fx, fz) || 1; fx /= m; fz /= m; }
            else { fx /= d; fz /= d; }
            x = px + fx * r; z = pz + fz * r; itildi = true;
          }
        }
      }
      if (!itildi) break;
    }
    return [x, z];
  }

  /**
   * Kamera için: (a → b) doğru parçasının ilk üçgenle (zemin, duvar, tavan) kesiştiği oran (0..1). Kesişmiyorsa null.
   * Başlangıca çok yakın (oran < 0,02) kesişimler yok sayılır (oyuncunun kendi bastığı yüzey).
   */
  dogruKesisimi(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number | null {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const uz = Math.hypot(dx, dz), adim = Math.max(1, Math.ceil(uz / (HUCRE * 0.5)));
    const gorulen = new Set<number>();
    let en: number | null = null;
    const v = this.v;
    for (let i = 0; i <= adim; i++) {
      const x = ax + (dx * i) / adim, z = az + (dz * i) / adim;
      const l = this.hucreler.get(Math.floor(x / HUCRE) * this.kolon + Math.floor(z / HUCRE));
      if (!l) continue;
      for (const t of l) {
        if (gorulen.has(t)) continue;
        gorulen.add(t);
        // Möller–Trumbore: doğru parçası × üçgen
        const o = t * 9;
        const e1x = v[o + 3] - v[o], e1y = v[o + 4] - v[o + 1], e1z = v[o + 5] - v[o + 2];
        const e2x = v[o + 6] - v[o], e2y = v[o + 7] - v[o + 1], e2z = v[o + 8] - v[o + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-9) continue;
        const inv = 1 / det;
        const tx = ax - v[o], ty = ay - v[o + 1], tz = az - v[o + 2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const w = (dx * qx + dy * qy + dz * qz) * inv;
        if (w < 0 || u + w > 1) continue;
        const k = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (k >= 0.02 && k <= 1 && (en === null || k < en)) en = k;
      }
    }
    return en;
  }

  /** Üçgenin y = yy yatay düzlemiyle kesişimi (xz doğru parçası); kesmiyorsa null. */
  private kesit(o: number, yy: number): [number, number, number, number] | null {
    const v = this.v;
    const nok: number[] = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const y0 = v[o + i * 3 + 1] - yy, y1 = v[o + j * 3 + 1] - yy;
      if ((y0 < 0 && y1 < 0) || (y0 > 0 && y1 > 0) || y0 === y1) continue;
      const k = y0 / (y0 - y1);
      nok.push(v[o + i * 3] + (v[o + j * 3] - v[o + i * 3]) * k, v[o + i * 3 + 2] + (v[o + j * 3 + 2] - v[o + i * 3 + 2]) * k);
    }
    return nok.length >= 4 ? [nok[0], nok[1], nok[2], nok[3]] : null;
  }
}
