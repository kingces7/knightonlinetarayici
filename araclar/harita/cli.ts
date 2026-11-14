// Harita dışa aktarma (araclar/ klasöründe):
//   npm run harita -- moradon            -> donusturulmus/web/harita/moradon/ altına arazi verisi + karo atlası
//   npm run harita -- moradon --onizleme -> ayrıca kuşbakışı önizleme resmi (donusturulmus/onizleme/)
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, SUNUCU_HARITA_DIZINI, oyunDisindaOlmali } from '../ortak/yollar.ts';
import { smdOku } from './smd.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { dxtOku, rgbayaCevir, tctOku } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';
import { gtdOku, dokuKonumu, type Arazi } from './arazi.ts';
import { nesneleriDisaAktar } from './nesneler.ts';

const KARO_PX = 128;
const ATLAS_KOLON = 16;

/** Yön kodu (0-7) için karo içi (u,v) dönüşümü. */
export function yonUv(yon: number, u: number, v: number): [number, number] {
  switch (yon & 7) {
    case 0: return [u, v];
    case 1: return [v, 1 - u];
    case 2: return [1 - u, 1 - v];
    case 3: return [1 - v, u];
    case 4: return [1 - u, v];
    case 5: return [u, 1 - v];
    case 6: return [v, u];
    default: return [1 - v, 1 - u];
  }
}

function karolariYukle(od: OyunDosyalari, a: Arazi): Uint8Array[] {
  const onbellek = new Map<string, Buffer>();
  return a.karolar.map(({ kaynak, sira }) => {
    try {
      let b = onbellek.get(kaynak);
      if (!b) { b = od.oku(kaynak); onbellek.set(kaynak, b); }
      const d = dxtOku(b.subarray(dokuKonumu(b, sira)));
      if (d.genislik !== KARO_PX || d.yukseklik !== KARO_PX) throw new Error(`karo boyu ${d.genislik}x${d.yukseklik}`);
      return rgbayaCevir(d);
    } catch (e) {
      console.log(`  uyarı: karo ${kaynak}#${sira} okunamadı (${(e as Error).message}); gri kullanılacak`);
      return new Uint8Array(KARO_PX * KARO_PX * 4).fill(128);
    }
  });
}

function atlasYap(karolar: Uint8Array[]): { png: Buffer; satir: number } {
  const satir = Math.ceil(karolar.length / ATLAS_KOLON);
  const g = ATLAS_KOLON * KARO_PX, y = satir * KARO_PX;
  const rgba = new Uint8Array(g * y * 4);
  karolar.forEach((k, i) => {
    const ox = (i % ATLAS_KOLON) * KARO_PX, oy = Math.floor(i / ATLAS_KOLON) * KARO_PX;
    for (let r = 0; r < KARO_PX; r++) rgba.set(k.subarray(r * KARO_PX * 4, (r + 1) * KARO_PX * 4), ((oy + r) * g + ox) * 4);
  });
  return { png: pngKodla(g, y, rgba), satir };
}

/**
 * Yaklaşık renk haritası (karo başına RGB). Oyunun gerçek renk haritası (.tct) şifreli olduğu için,
 * geçiş karolarının saydam kısımlarının altına konacak taban rengi karoların opak kısımlarının
 * ortalamasından ve komşularından tahmin eder.
 */
function tabanRenk(a: Arazi, karolar: Uint8Array[]): Buffer {
  const ort = karolar.map((k) => {
    let r = 0, g = 0, b = 0, w = 0;
    // Geçiş karolarının siyah kısmı ortalamaya katılmaz
    for (let i = 0; i < k.length; i += 4) { if (Math.max(k[i], k[i + 1], k[i + 2]) < 45) continue; r += k[i]; g += k[i + 1]; b += k[i + 2]; w++; }
    return w ? [r / w, g / w, b / w, 1] : [0, 0, 0, 0];
  });
  const k = a.boyut - 1;
  let alan = new Float32Array(k * k * 4);
  for (let tx = 0; tx < k; tx++) for (let tz = 0; tz < k; tz++) {
    const i = tx * a.boyut + tz, p = (tz * k + tx) * 4;
    const kaynak = [ort[a.doku1[i]], a.doku2[i] < ort.length ? ort[a.doku2[i]] : null];
    for (const c of kaynak) if (c && c[3]) { alan[p] += c[0]; alan[p + 1] += c[1]; alan[p + 2] += c[2]; alan[p + 3] += 1; }
  }
  // Boşlukları doldurup yumuşat (birkaç tur 3x3 ortalama)
  for (let tur = 0; tur < 6; tur++) {
    const yeni = new Float32Array(alan.length);
    for (let x = 0; x < k; x++) for (let z = 0; z < k; z++) {
      let r = 0, g = 0, b = 0, w = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= k || zz >= k) continue;
        const p = (zz * k + xx) * 4; r += alan[p]; g += alan[p + 1]; b += alan[p + 2]; w += alan[p + 3];
      }
      const p = (z * k + x) * 4;
      if (w) { yeni[p] = r / w; yeni[p + 1] = g / w; yeni[p + 2] = b / w; yeni[p + 3] = 1; }
    }
    alan = yeni;
  }
  const cikti = Buffer.alloc(k * k * 4);
  for (let i = 0; i < k * k; i++) for (let c = 0; c < 3; c++) cikti[i * 4 + c] = Math.round(alan[i * 4 + c]);
  for (let i = 0; i < k * k; i++) cikti[i * 4 + 3] = 255;
  return cikti;
}

function onizleme(a: Arazi, karolar: Uint8Array[], pxKaro: number): Buffer {
  const k = a.boyut - 1, boy = k * pxKaro;
  const rgba = new Uint8Array(boy * boy * 4);
  const ornek = (karo: Uint8Array, u: number, v: number, i: number) => {
    const x = Math.min(KARO_PX - 1, Math.floor(u * KARO_PX)), y = Math.min(KARO_PX - 1, Math.floor(v * KARO_PX));
    return karo[(y * KARO_PX + x) * 4 + i];
  };
  for (let tx = 0; tx < k; tx++) for (let tz = 0; tz < k; tz++) {
    const i = tx * a.boyut + tz;
    const t1 = karolar[a.doku1[i]], t2 = a.doku2[i] < karolar.length ? karolar[a.doku2[i]] : null;
    for (let py = 0; py < pxKaro; py++) for (let px = 0; px < pxKaro; px++) {
      const u = (px + 0.5) / pxKaro, v = (py + 0.5) / pxKaro;
      const [u1, v1] = yonUv(a.yon1[i], u, v);
      const hedef = (((k - 1 - tz) * pxKaro + (pxKaro - 1 - py)) * boy + tx * pxKaro + px) * 4; // kuzey yukarı
      let al = 0;
      let uv2: [number, number] = [0, 0];
      if (t2) { uv2 = yonUv(a.yon2[i], u, v); al = ornek(t2, uv2[0], uv2[1], 3) / 255; }
      for (let c = 0; c < 3; c++) {
        const c1 = ornek(t1, u1, v1, c);
        rgba[hedef + c] = t2 ? Math.min(255, c1 + ornek(t2, uv2[0], uv2[1], c)) : c1;
      }
      rgba[hedef + 3] = 255;
    }
  }
  return pngKodla(boy, boy, rgba);
}

/**
 * Gerçek renk haritası (.tct): N×N parça, her biri 128×128 piksel (yaklaşık 1 piksel/metre).
 * Düzen, yaklaşık taban renge göre 128 olası düzen arasından ölçülerek seçildi (Moradon r=0,83; eski Moradon r=0,86;
 * ikinci en iyi 0,48 / 0,40): parça i, x-parçası = ⌊i/N⌋, z-parçası = i mod N; parça içinde satırlar z ekseninde ters.
 * Çıktı: ham RGBA, satır = z, sütun = x (S×S).
 */
export function renkHaritasi(parcalar: Uint8Array[]): { rgba: Uint8Array; boyut: number } {
  const N = Math.round(Math.sqrt(parcalar.length)), P = 128, S = N * P;
  if (N * N !== parcalar.length) throw new Error(`.tct parça sayısı kare değil (${parcalar.length})`);
  const rgba = new Uint8Array(S * S * 4);
  parcalar.forEach((p, i) => {
    const cx = Math.floor(i / N), cz = i % N;
    for (let y = 0; y < P; y++) {
      const hedefSatir = cz * P + (P - 1 - y);
      rgba.set(p.subarray(y * P * 4, (y + 1) * P * 4), (hedefSatir * S + cx * P) * 4);
    }
  });
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255; // A1R5G5B5 saydamlığı renk haritasında anlamsız
  return { rgba, boyut: S };
}

/** İstemci haritası → sunucu haritası (.smd) eşleşmesi. İstemci adıyla aynı olmayanlar burada. */
const SUNUCU_HARITASI: Record<string, string> = { moradon: '1098moradon_0826.smd', '14th_oldmoradon': 'old_moradon.smd' };

/**
 * Sunucu haritasından çarpışma üçgenlerini (carpisma.bin: ham float32, üçgen başına 9 sayı, x/y/z — istemci
 * arazisiyle aynı dünya koordinatı) ve kapı/olay bilgisini (sunucu.json) yazar. Dosya yoksa atlar.
 */
function sunucuVerisiniYaz(harita: string, hedef: string): void {
  const ad = SUNUCU_HARITASI[harita.toLowerCase()] ?? `${harita}.smd`;
  if (!fs.existsSync(SUNUCU_HARITA_DIZINI)) { console.log('  çarpışma: sunucu harita klasörü yok, atlandı'); return; }
  const dosya = fs.readdirSync(SUNUCU_HARITA_DIZINI).find((f) => f.toLowerCase() === ad.toLowerCase());
  if (!dosya) { console.log(`  çarpışma: sunucu haritası (${ad}) bulunamadı, atlandı`); return; }
  const s = smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, dosya)));
  fs.writeFileSync(path.join(hedef, 'carpisma.bin'), Buffer.from(s.yuzler.buffer, s.yuzler.byteOffset, s.yuzler.byteLength));
  fs.writeFileSync(path.join(hedef, 'sunucu.json'), JSON.stringify({ kaynak: dosya, kapilar: s.kapilar, nesneOlaylari: s.nesneOlaylari, dogus: s.dogus }, null, 1));
  console.log(`  çarpışma: ${s.yuzler.length / 9} üçgen, ${s.kapilar.length} kapı, ${s.nesneOlaylari.length} nesne olayı (${dosya})`);
}

function main(argv: string[]): number {
  const harita = argv.find((x) => !x.startsWith('--'));
  if (!harita) { console.log('Kullanım: npm run harita -- <harita_adı> [--onizleme]'); return 1; }
  const od = new OyunDosyalari();
  const a = gtdOku(od.oku(`Zones/${harita}.gtd`));
  console.log(`${harita}: ${a.boyut}x${a.boyut} ızgara, ${a.karolar.length} karo dokusu`);
  const karolar = karolariYukle(od, a);
  const hedef = path.join(CIKTI_DIZINI, 'web', 'harita', harita.toLowerCase());
  oyunDisindaOlmali(hedef);
  fs.mkdirSync(hedef, { recursive: true });
  const { png, satir } = atlasYap(karolar);
  fs.writeFileSync(path.join(hedef, 'karolar.png'), png); // bakmak/düzenlemek için
  // Oyun için ham RGBA: tarayıcıda PNG'yi canvas ile okumak saydam piksellerin rengini siliyor.
  fs.writeFileSync(path.join(hedef, 'karolar.bin'), Buffer.concat(karolar.map((k) => Buffer.from(k.buffer, k.byteOffset, k.byteLength))));
  const n = a.boyut * a.boyut;
  const bin = Buffer.alloc(n * 4 + n * 2 * 2 + n * 2);
  let o = 0;
  Buffer.from(a.yukseklik.buffer).copy(bin, o); o += n * 4;
  Buffer.from(a.doku1.buffer).copy(bin, o); o += n * 2;
  Buffer.from(a.doku2.buffer).copy(bin, o); o += n * 2;
  Buffer.from(a.yon1).copy(bin, o); o += n;
  Buffer.from(a.yon2).copy(bin, o);
  fs.writeFileSync(path.join(hedef, 'arazi.bin'), bin);
  fs.writeFileSync(path.join(hedef, 'taban.bin'), tabanRenk(a, karolar));
  let renk: { dosya: string; boyut: number } | null = null;
  try {
    const r = renkHaritasi(tctOku(od.oku(`Zones/${harita}.tct`)).map((d) => rgbayaCevir(d)));
    fs.writeFileSync(path.join(hedef, 'renk.bin'), r.rgba);
    renk = { dosya: 'renk.bin', boyut: r.boyut };
    console.log(`  renk haritası: ${r.boyut}×${r.boyut}`);
  } catch (e) { console.log(`  renk haritası (.tct) okunamadı, yaklaşık taban kullanılacak: ${(e as Error).message}`); }
  fs.writeFileSync(path.join(hedef, 'arazi.json'), JSON.stringify({
    ad: a.ad, boyut: a.boyut, birim: a.birim, karoSayisi: a.karolar.length,
    atlas: { dosya: 'karolar.png', kolon: ATLAS_KOLON, satir, karoPx: KARO_PX },
    renk,
    ikili: { dosya: 'arazi.bin', duzen: 'float32 yukseklik[N*N], uint16 doku1[N*N], uint16 doku2[N*N], uint8 yon1[N*N], uint8 yon2[N*N]; sira x*N+z' },
  }, null, 2));
  console.log(`  -> ${hedef}`);
  sunucuVerisiniYaz(harita, hedef);
  if (!argv.includes('--nesnesiz')) {
    const { glb, rapor } = nesneleriDisaAktar(od, harita);
    fs.writeFileSync(path.join(hedef, 'nesneler.glb'), glb);
    console.log(`  nesneler: ${rapor.nesne} nesne (${rapor.atlanan} atlandı), ${rapor.model} model (${rapor.eksikModel} okunamadı), ` +
      `${rapor.doku} doku (${rapor.sifreliDoku} şifreli → gri), ${(rapor.boyut / 1048576).toFixed(1)} MB`);
  }
  if (argv.includes('--onizleme')) {
    const d = path.join(CIKTI_DIZINI, 'onizleme');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, `${harita}_kusbakisi.png`), onizleme(a, karolar, 4));
    console.log(`  önizleme -> ${path.join(d, `${harita}_kusbakisi.png`)}`);
  }
  od.kapat();
  return 0;
}

try { process.exit(main(process.argv.slice(2))); } catch (e) { console.log('HATA: ' + (e as Error).message); process.exit(1); }
