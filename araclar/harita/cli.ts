// Harita dışa aktarma (araclar/ klasöründe):
//   npm run harita -- moradon            -> donusturulmus/web/harita/moradon/ altına arazi verisi + karo atlası
//   npm run harita -- moradon --onizleme -> ayrıca kuşbakışı önizleme resmi (donusturulmus/onizleme/)
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, oyunDisindaOlmali } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';
import { gtdOku, dokuKonumu, type Arazi } from './arazi.ts';

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
        rgba[hedef + c] = t2 ? Math.round(c1 * (1 - al) + ornek(t2, uv2[0], uv2[1], c) * al) : c1;
      }
      rgba[hedef + 3] = 255;
    }
  }
  return pngKodla(boy, boy, rgba);
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
  fs.writeFileSync(path.join(hedef, 'karolar.png'), png);
  const n = a.boyut * a.boyut;
  const bin = Buffer.alloc(n * 4 + n * 2 * 2 + n * 2);
  let o = 0;
  Buffer.from(a.yukseklik.buffer).copy(bin, o); o += n * 4;
  Buffer.from(a.doku1.buffer).copy(bin, o); o += n * 2;
  Buffer.from(a.doku2.buffer).copy(bin, o); o += n * 2;
  Buffer.from(a.yon1).copy(bin, o); o += n;
  Buffer.from(a.yon2).copy(bin, o);
  fs.writeFileSync(path.join(hedef, 'arazi.bin'), bin);
  fs.writeFileSync(path.join(hedef, 'arazi.json'), JSON.stringify({
    ad: a.ad, boyut: a.boyut, birim: a.birim, karoSayisi: a.karolar.length,
    atlas: { dosya: 'karolar.png', kolon: ATLAS_KOLON, satir, karoPx: KARO_PX },
    ikili: { dosya: 'arazi.bin', duzen: 'float32 yukseklik[N*N], uint16 doku1[N*N], uint16 doku2[N*N], uint8 yon1[N*N], uint8 yon2[N*N]; sira x*N+z' },
  }, null, 2));
  console.log(`  -> ${hedef}`);
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
