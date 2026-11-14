// Çözülmüş .tbl verisini satır/sütun yapısına ve düzenlenebilir JSON'a çevirir (ve tersi).
// Yapı: N3TableBase.h (Load / ReadData). Ayrıntı: docs/formatlar/tbl.md
import { dosyaCoz, dosyaSifrele, sifreAdaylari, type SifreTuru } from './sifreleme.ts';
import { bayta, metneCevir, type KodSayfasi } from './kodlama.ts';

/**
 * N3TableBase DATA_TYPE değerleri (0 = DT_NONE kullanılmaz).
 * 10 (INT64) eski kaynak kodda yok; yeni tablolarda görülüyor (ör. Player_experience.tbl),
 * 8 baytlık işaretli tam sayı olarak okunur.
 */
export const TURLER = ['', 'CHAR', 'BYTE', 'SHORT', 'WORD', 'INT', 'DWORD', 'STRING', 'FLOAT', 'DOUBLE', 'INT64'] as const;
const EN_BUYUK_TUR = TURLER.length - 1;
export type SutunTuru = Exclude<(typeof TURLER)[number], ''>;
export type Hucre = number | string;

export interface Tablo {
  sifreleme: SifreTuru;
  /** Sütun başlığından önce gelen baytlar (çift şifreli tablolarda 5 bayt; anlamı bilinmiyor, korunur). */
  onek: Uint8Array;
  sutunTurleri: SutunTuru[];
  satirlar: Hucre[][];
  /** Satırlardan sonra kalan, tabloya ait olmayan baytlar (normalde boş). */
  artik: Uint8Array;
  /** Şifreleme dolgusu; dosyayı birebir geri üretmek için. */
  kuyruk: Uint8Array;
}

const MAKS_SUTUN = 1000;

class Okuyucu {
  ofset = 0;
  private veri: Uint8Array;
  private dv: DataView;
  constructor(veri: Uint8Array) {
    this.veri = veri;
    this.dv = new DataView(veri.buffer, veri.byteOffset, veri.byteLength);
  }
  kalan(): number { return this.veri.length - this.ofset; }
  private gerek(n: number): void {
    if (this.ofset + n > this.veri.length) throw new Error(`Veri beklenenden erken bitti (ofset ${this.ofset})`);
  }
  i8(): number { this.gerek(1); return this.dv.getInt8(this.ofset++); }
  u8(): number { this.gerek(1); return this.dv.getUint8(this.ofset++); }
  i16(): number { this.gerek(2); const v = this.dv.getInt16(this.ofset, true); this.ofset += 2; return v; }
  u16(): number { this.gerek(2); const v = this.dv.getUint16(this.ofset, true); this.ofset += 2; return v; }
  i32(): number { this.gerek(4); const v = this.dv.getInt32(this.ofset, true); this.ofset += 4; return v; }
  u32(): number { this.gerek(4); const v = this.dv.getUint32(this.ofset, true); this.ofset += 4; return v; }
  i64(): bigint { this.gerek(8); const v = this.dv.getBigInt64(this.ofset, true); this.ofset += 8; return v; }
  bytes(n: number): Uint8Array { this.gerek(n); const b = this.veri.subarray(this.ofset, this.ofset + n); this.ofset += n; return b; }
}

class Yazici {
  private parcalar: Uint8Array[] = [];
  private boy = 0;
  private ekle(b: Uint8Array): void { this.parcalar.push(b); this.boy += b.length; }
  private sayi(n: number, yaz: (dv: DataView) => void): void {
    const b = new Uint8Array(n); yaz(new DataView(b.buffer)); this.ekle(b);
  }
  i8(v: number) { this.sayi(1, (d) => d.setInt8(0, v)); }
  u8(v: number) { this.sayi(1, (d) => d.setUint8(0, v)); }
  i16(v: number) { this.sayi(2, (d) => d.setInt16(0, v, true)); }
  u16(v: number) { this.sayi(2, (d) => d.setUint16(0, v, true)); }
  i32(v: number) { this.sayi(4, (d) => d.setInt32(0, v, true)); }
  u32(v: number) { this.sayi(4, (d) => d.setUint32(0, v, true)); }
  i64(v: bigint) { this.sayi(8, (d) => d.setBigInt64(0, v, true)); }
  f32bits(v: number) { this.u32(v); }
  f64bytes(b: Uint8Array) { this.ekle(b); }
  bytes(b: Uint8Array) { this.ekle(b); }
  sonuc(): Uint8Array {
    const c = new Uint8Array(this.boy); let o = 0;
    for (const p of this.parcalar) { c.set(p, o); o += p.length; }
    return c;
  }
}

// ---- Ondalık sayılar: JSON'da sayı olarak tutulur. NaN, sonsuz ve -0 gibi JSON'un
// gösteremediği değerler "#f32:XXXXXXXX" / "#f64:XXXXXXXXXXXXXXXX" (bit karşılığı) olarak yazılır.
function f32Hucre(bits: number): Hucre {
  const v = new Float32Array(new Uint32Array([bits]).buffer)[0];
  if (!Number.isFinite(v) || Object.is(v, -0)) return '#f32:' + bits.toString(16).padStart(8, '0');
  return v;
}
function f32Bitleri(h: Hucre, yer: string): number {
  if (typeof h === 'string') {
    const m = /^#f32:([0-9a-f]{8})$/i.exec(h);
    if (!m) throw new Error(`${yer}: FLOAT bekleniyordu, "${h}" geldi`);
    return parseInt(m[1], 16);
  }
  if (typeof h !== 'number') throw new Error(`${yer}: FLOAT bekleniyordu`);
  return new Uint32Array(new Float32Array([h]).buffer)[0];
}
function f64Hucre(b: Uint8Array): Hucre {
  const v = new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, true);
  if (!Number.isFinite(v) || Object.is(v, -0)) return '#f64:' + Buffer.from(b).toString('hex');
  return v;
}
function f64Baytlari(h: Hucre, yer: string): Uint8Array {
  if (typeof h === 'string') {
    const m = /^#f64:([0-9a-f]{16})$/i.exec(h);
    if (!m) throw new Error(`${yer}: DOUBLE bekleniyordu, "${h}" geldi`);
    return Uint8Array.from(Buffer.from(m[1], 'hex'));
  }
  if (typeof h !== 'number') throw new Error(`${yer}: DOUBLE bekleniyordu`);
  const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, h, true); return b;
}

// ---- 64 bit tam sayılar: güvenli aralıktaysa JSON'da sayı, değilse metin ("12345678901234567890").
function i64Hucre(v: bigint): Hucre {
  return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString();
}
function i64Degeri(h: Hucre, yer: string): bigint {
  let v: bigint;
  if (typeof h === 'number' && Number.isSafeInteger(h)) v = BigInt(h);
  else if (typeof h === 'string' && /^-?\d+$/.test(h)) v = BigInt(h);
  else throw new Error(`${yer}: INT64 için tam sayı bekleniyordu, ${JSON.stringify(h)} geldi`);
  if (v < -(2n ** 63n) || v >= 2n ** 63n) throw new Error(`${yer}: INT64 aralığı dışında`);
  return v;
}

function tamSayi(h: Hucre, en: number, en2: number, yer: string, tur: string): number {
  if (typeof h !== 'number' || !Number.isInteger(h) || h < en || h > en2) {
    throw new Error(`${yer}: ${tur} için ${en}..${en2} arası tam sayı bekleniyordu, ${JSON.stringify(h)} geldi`);
  }
  return h;
}

function basligiOku(o: Okuyucu): SutunTuru[] | null {
  if (o.kalan() < 8) return null;
  const n = o.i32();
  if (n <= 0 || n > MAKS_SUTUN || o.kalan() < n * 4 + 4) return null;
  const turler: SutunTuru[] = [];
  for (let i = 0; i < n; i++) {
    const t = o.i32();
    if (t < 1 || t > EN_BUYUK_TUR) return null;
    turler.push(TURLER[t] as SutunTuru);
  }
  return turler;
}

function satirlariOku(o: Okuyucu, turler: SutunTuru[], ks: KodSayfasi): Hucre[][] {
  const adet = o.i32();
  if (adet < 0) throw new Error('Satır sayısı negatif');
  const satirlar: Hucre[][] = [];
  for (let s = 0; s < adet; s++) {
    const satir: Hucre[] = [];
    for (const t of turler) {
      switch (t) {
        case 'CHAR': satir.push(o.i8()); break;
        case 'BYTE': satir.push(o.u8()); break;
        case 'SHORT': satir.push(o.i16()); break;
        case 'WORD': satir.push(o.u16()); break;
        case 'INT': satir.push(o.i32()); break;
        case 'DWORD': satir.push(o.u32()); break;
        case 'FLOAT': satir.push(f32Hucre(o.u32())); break;
        case 'DOUBLE': satir.push(f64Hucre(o.bytes(8))); break;
        case 'INT64': satir.push(i64Hucre(o.i64())); break;
        case 'STRING': {
          const uz = o.i32();
          if (uz < 0 || uz > o.kalan()) throw new Error(`Geçersiz metin uzunluğu ${uz} (satır ${s})`);
          satir.push(metneCevir(o.bytes(uz), ks));
          break;
        }
      }
    }
    satirlar.push(satir);
  }
  return satirlar;
}

/** Çözülmüş düz veriyi tabloya ayrıştırır. Önek uzunluğunu (0 veya 5) kendisi bulur. */
export function ayristir(veri: Uint8Array, sifreleme: SifreTuru, kuyruk: Uint8Array, ks: KodSayfasi): Tablo {
  const adaylar = sifreleme === 'usko-cift' ? [5, 0] : [0, 5];
  let ilkHata: unknown = null;
  for (const onekBoyu of adaylar) {
    if (veri.length < onekBoyu) continue;
    try {
      const o = new Okuyucu(veri);
      o.bytes(onekBoyu);
      const turler = basligiOku(o);
      if (!turler) continue;
      const satirlar = satirlariOku(o, turler, ks);
      return {
        sifreleme,
        onek: veri.slice(0, onekBoyu),
        sutunTurleri: turler,
        satirlar,
        artik: veri.slice(o.ofset),
        kuyruk,
      };
    } catch (e) {
      ilkHata ??= e;
    }
  }
  throw new Error('Tablo yapısı çözülemedi' + (ilkHata ? `: ${(ilkHata as Error).message}` : ''));
}

/** Tabloyu tekrar düz veriye (şifresiz) çevirir. */
export function duzVeriyeCevir(t: Tablo, ks: KodSayfasi): Uint8Array {
  const y = new Yazici();
  y.bytes(t.onek);
  y.i32(t.sutunTurleri.length);
  for (const tur of t.sutunTurleri) {
    const kod = TURLER.indexOf(tur);
    if (kod < 1) throw new Error(`Bilinmeyen sütun türü: ${tur}`);
    y.i32(kod);
  }
  y.i32(t.satirlar.length);
  t.satirlar.forEach((satir, s) => {
    if (satir.length !== t.sutunTurleri.length) {
      throw new Error(`Satır ${s + 1}: ${t.sutunTurleri.length} hücre olmalı, ${satir.length} var`);
    }
    t.sutunTurleri.forEach((tur, c) => {
      const h = satir[c];
      const yer = `Satır ${s + 1}, sütun ${c + 1}`;
      switch (tur) {
        case 'CHAR': y.i8(tamSayi(h, -128, 127, yer, tur)); break;
        case 'BYTE': y.u8(tamSayi(h, 0, 255, yer, tur)); break;
        case 'SHORT': y.i16(tamSayi(h, -32768, 32767, yer, tur)); break;
        case 'WORD': y.u16(tamSayi(h, 0, 65535, yer, tur)); break;
        case 'INT': y.i32(tamSayi(h, -2147483648, 2147483647, yer, tur)); break;
        case 'DWORD': y.u32(tamSayi(h, 0, 4294967295, yer, tur)); break;
        case 'FLOAT': y.f32bits(f32Bitleri(h, yer)); break;
        case 'DOUBLE': y.f64bytes(f64Baytlari(h, yer)); break;
        case 'INT64': y.i64(i64Degeri(h, yer)); break;
        case 'STRING': {
          if (typeof h !== 'string') throw new Error(`${yer}: metin bekleniyordu`);
          const b = bayta(h, ks);
          y.i32(b.length);
          y.bytes(b);
          break;
        }
      }
    });
  });
  y.bytes(t.artik);
  return y.sonuc();
}

/** Dosyayı çözer; şifre çeşidi imzadan belli değilse adayları sırayla dener. */
export function tbldenOku(dosya: Uint8Array, ks: KodSayfasi): Tablo {
  const hatalar: string[] = [];
  for (const tur of sifreAdaylari(dosya)) {
    try {
      const c = dosyaCoz(dosya, tur);
      return ayristir(c.veri, c.tur, c.kuyruk, ks);
    } catch (e) {
      hatalar.push(`${tur}: ${(e as Error).message}`);
    }
  }
  throw new Error('Tablo çözülemedi (' + hatalar.join(' | ') + ')');
}

export function tblyeYaz(t: Tablo, ks: KodSayfasi): Uint8Array {
  return dosyaSifrele({ tur: t.sifreleme, veri: duzVeriyeCevir(t, ks), kuyruk: t.kuyruk });
}

// ---------------- JSON ----------------

export interface TabloJson {
  _aciklama: string;
  bicimSurumu: 1;
  kaynak: string;
  sifreleme: SifreTuru;
  kodSayfasi: KodSayfasi;
  onek: string;
  sutunTurleri: SutunTuru[];
  satirSayisi: number;
  satirlar: Hucre[][];
  artik: string;
  kuyruk: string;
}

const ACIKLAMA =
  'KnightEmpire tablo dosyası. "satirlar" içindeki değerleri değiştirebilir, satır ekleyip silebilirsiniz. ' +
  'Her satırdaki değer sayısı ve sırası "sutunTurleri" ile aynı olmalı. İlk sütun satırın kimliğidir (ID) ve tekrar etmemeli. ' +
  'onek/artik/kuyruk alanlarına dokunmayın. Geri çevirmek için: npm run tbl-yaz -- <bu dosya>';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const hexten = (s: string) => Uint8Array.from(Buffer.from(s ?? '', 'hex'));

const META_ACIKLAMA =
  'Bu dosya aynı addaki .csv tablosunun geri yazılması için gereken bilgileri tutar. DEĞİŞTİRMEYİN. ' +
  'Düzenleme .csv dosyasında yapılır. Geri çevirmek için: npm run tbl-yaz -- <tablo.csv>';

/** CSV'nin yanında duran, satırlar dışındaki her şeyi tutan bilgi dosyası. */
export function metaOlustur(t: Tablo, kaynak: string, ks: KodSayfasi): Omit<TabloJson, 'satirlar'> {
  return {
    _aciklama: META_ACIKLAMA,
    bicimSurumu: 1,
    kaynak,
    sifreleme: t.sifreleme,
    kodSayfasi: ks,
    onek: hex(t.onek),
    sutunTurleri: t.sutunTurleri,
    satirSayisi: t.satirlar.length,
    artik: hex(t.artik),
    kuyruk: hex(t.kuyruk),
  };
}

export function jsonaCevir(t: Tablo, kaynak: string, ks: KodSayfasi): string {
  const ust: Omit<TabloJson, 'satirlar'> & { satirlar?: unknown } = {
    _aciklama: ACIKLAMA,
    bicimSurumu: 1,
    kaynak,
    sifreleme: t.sifreleme,
    kodSayfasi: ks,
    onek: hex(t.onek),
    sutunTurleri: t.sutunTurleri,
    satirSayisi: t.satirlar.length,
    artik: hex(t.artik),
    kuyruk: hex(t.kuyruk),
  };
  // Okunabilirlik için: üst bilgiler girintili, her tablo satırı tek satırda.
  const govde = JSON.stringify(ust, null, 2).replace(/\n}$/, '');
  const satirlar = t.satirlar.map((s) => '    ' + JSON.stringify(s)).join(',\n');
  return `${govde},\n  "satirlar": [\n${satirlar}${t.satirlar.length ? '\n' : ''}  ]\n}\n`;
}

export function jsondanOku(metin: string): { tablo: Tablo; ks: KodSayfasi; kaynak: string } {
  const j = JSON.parse(metin) as TabloJson;
  if (j.bicimSurumu !== 1) throw new Error('Desteklenmeyen JSON biçim sürümü');
  if (!Array.isArray(j.sutunTurleri) || !Array.isArray(j.satirlar)) throw new Error('sutunTurleri ve satirlar dizi olmalı');
  return {
    ks: j.kodSayfasi ?? 'windows-1254',
    kaynak: j.kaynak,
    tablo: {
      sifreleme: j.sifreleme,
      onek: hexten(j.onek),
      sutunTurleri: j.sutunTurleri,
      satirlar: j.satirlar,
      artik: hexten(j.artik),
      kuyruk: hexten(j.kuyruk),
    },
  };
}

/** İlk sütundaki (ID) tekrar eden değerleri bulur; oyun tekrar edenlerin sadece ilkini kullanır. */
export function tekrarEdenIdler(t: Tablo): number[] {
  const gorulen = new Set<Hucre>();
  const tekrar: number[] = [];
  for (const s of t.satirlar) {
    if (gorulen.has(s[0])) tekrar.push(s[0] as number);
    gorulen.add(s[0]);
  }
  return tekrar;
}
