// Paket gövdesi okuyucu/yazıcı. Sunucudaki `ByteBuffer` (shared/ByteBuffer.h) ile aynı kurallar:
// sayılar little-endian; yazı = önce uzunluk (1 bayt "SByte" ya da 2 bayt "DByte"), sonra ANSI (Windows-1252) baytlar, sonlandırıcı yok.
// Tarayıcıda ve Node'da çalışır (Buffer kullanmaz).

const KOD_COZ = new TextDecoder('windows-1252');

function ansiKodla(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const k = s.charCodeAt(i);
    b[i] = k < 256 ? k : 0x3f; // Latin-1 dışı karakter: '?'
  }
  return b;
}

export class PaketYazici {
  #parcalar: number[] = [];

  baytlar(): Uint8Array { return Uint8Array.from(this.#parcalar); }
  get uzunluk(): number { return this.#parcalar.length; }

  u8(d: number): this { this.#parcalar.push(d & 0xff); return this; }
  u16(d: number): this { return this.u8(d).u8(d >>> 8); }
  u32(d: number): this { return this.u16(d & 0xffff).u16(d >>> 16); }
  u64(d: bigint): this {
    let k = BigInt.asUintN(64, d);
    for (let i = 0; i < 8; i++) { this.u8(Number(k & 0xffn)); k >>= 8n; }
    return this;
  }
  i8(d: number): this { return this.u8(d); }
  i16(d: number): this { return this.u16(d); }
  i32(d: number): this { return this.u32(d); }
  f32(d: number): this {
    const t = new DataView(new ArrayBuffer(4)); t.setFloat32(0, d, true);
    for (let i = 0; i < 4; i++) this.u8(t.getUint8(i));
    return this;
  }
  ham(b: Uint8Array): this { for (const x of b) this.#parcalar.push(x); return this; }
  /** Yazı: uzunluk (varsayılan 2 bayt; `ikiBayt=false` ise 1 bayt) + ANSI baytlar. */
  yazi(s: string, ikiBayt = true): this {
    const b = ansiKodla(s);
    if (ikiBayt) this.u16(b.length); else this.u8(b.length);
    return this.ham(b);
  }
}

export class PaketOkuyucu {
  #v: Uint8Array;
  #g: DataView;
  konum = 0;

  constructor(veri: Uint8Array) {
    this.#v = veri;
    this.#g = new DataView(veri.buffer, veri.byteOffset, veri.byteLength);
  }

  get kalan(): number { return this.#v.length - this.konum; }

  #gerekli(n: number): void {
    if (this.konum + n > this.#v.length) throw new RangeError(`Paket kısa: ${n} bayt gerekli, ${this.kalan} kaldı`);
  }

  u8(): number { this.#gerekli(1); return this.#v[this.konum++]; }
  u16(): number { this.#gerekli(2); const d = this.#g.getUint16(this.konum, true); this.konum += 2; return d; }
  u32(): number { this.#gerekli(4); const d = this.#g.getUint32(this.konum, true); this.konum += 4; return d; }
  u64(): bigint { this.#gerekli(8); const d = this.#g.getBigUint64(this.konum, true); this.konum += 8; return d; }
  i8(): number { this.#gerekli(1); const d = this.#g.getInt8(this.konum); this.konum += 1; return d; }
  i16(): number { this.#gerekli(2); const d = this.#g.getInt16(this.konum, true); this.konum += 2; return d; }
  i32(): number { this.#gerekli(4); const d = this.#g.getInt32(this.konum, true); this.konum += 4; return d; }
  f32(): number { this.#gerekli(4); const d = this.#g.getFloat32(this.konum, true); this.konum += 4; return d; }
  ham(n: number): Uint8Array { this.#gerekli(n); const d = this.#v.subarray(this.konum, this.konum + n); this.konum += n; return d; }
  yazi(ikiBayt = true): string {
    const n = ikiBayt ? this.u16() : this.u8();
    return KOD_COZ.decode(this.ham(n));
  }
  kalanlar(): Uint8Array { return this.ham(this.kalan); }
}
