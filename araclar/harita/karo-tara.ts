// Bütün client haritalarının (Zones/*.gtd) karo verisini oyun dosyalarından okuyup tarar:
//   node harita/karo-tara.ts                -> 58 haritanın hepsi
//   node harita/karo-tara.ts karus2004 ...  -> yalnız verilenler
// Denetler: (1) karo doku listesi (.gtt dosyası + sıra) gerçekten o dokuya mı gidiyor (ardışık okuma ile "NTF" aramasının konumları aynı mı),
// (2) karolar çözülüyor mu (boyut/biçim/boş-tek renk), (3) harita karo bilgisi tutarlı mı (geçersiz indeks, yön > 7),
// (4) komşu karo dikişleri: orijinal yön tablosu (O) ile client'ın önceki eşlemesi (C) karşılaştırması, en kötü karo grupları.
import fs from 'node:fs';
import path from 'node:path';
import { OYUN_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { dxtOku, rgbayaCevir, seviyeBoyu, veriDuzeni } from '../doku/dxt.ts';
import { dokuKonumu, gtdOku } from './arazi.ts';
import { dikisMaliyeti, hipC, hipO, type Harita } from './karo-denetim.ts';

const P = 128;
export interface Sorun { harita: string; tur: string; ayrinti: string }

/** .gtt'yi başlıklara bakarak ardışık gezip her dokunun konumunu verir (oyunun SkipFileHandle yöntemi). */
export function ardisikKonumlar(b: Buffer): number[] | null {
  const konum: number[] = [];
  let o = 0;
  while (o + 24 <= b.length) {
    const adUz = b.readInt32LE(o), h = o + 4 + adUz;
    if (adUz < 0 || adUz > 260 || h + 20 > b.length || b.toString('latin1', h, h + 3) !== 'NTF') return null;
    const g = b.readInt32LE(h + 4), y = b.readInt32LE(h + 8), bc = b.readUInt32LE(h + 12), mm = b.readInt32LE(h + 16) !== 0;
    let toplam: number;
    try { toplam = veriDuzeni(bc, g, y, mm).toplam; seviyeBoyu(bc, g, y); } catch { return null; }
    konum.push(o);
    o = h + 20 + toplam;
  }
  return o === b.length ? konum : null;
}

export interface Karolar { harita: Harita; sorunlar: Sorun[]; karoBicim: string[] }

export function haritaOyundan(od: OyunDosyalari, ad: string): Karolar {
  const sorunlar: Sorun[] = [];
  const a = gtdOku(fs.readFileSync(path.join(OYUN_DIZINI, 'Zones', `${ad}.gtd`)));
  const nn = a.boyut * a.boyut;
  const karolar = new Uint8Array(a.karolar.length * P * P * 4);
  const bicimler: string[] = [];
  const onbellek = new Map<string, { b: Buffer; ardisik: number[] | null; aranan: number[] }>();
  a.karolar.forEach(({ kaynak, sira }, i) => {
    try {
      let e = onbellek.get(kaynak);
      if (!e) {
        const b = od.oku(kaynak);
        const ard = ardisikKonumlar(b);
        const aranan: number[] = []; for (let s = 0; ; s++) { try { aranan.push(dokuKonumu(b, s)); } catch { break; } }
        e = { b, ardisik: ard, aranan }; onbellek.set(kaynak, e);
        if (ard && ard.length !== aranan.length) sorunlar.push({ harita: ad, tur: 'gtt-sayi', ayrinti: `${kaynak}: ardışık ${ard.length} doku, "NTF" araması ${aranan.length}` });
        if (!ard) sorunlar.push({ harita: ad, tur: 'gtt-ardisik', ayrinti: `${kaynak}: ardışık okunamadı (başlık/boy tutarsız); "NTF" araması ${aranan.length} doku` });
      }
      const aranan = e.aranan[sira];
      if (aranan === undefined) throw new Error(`${sira}. doku yok (dosyada ${e.aranan.length})`);
      if (e.ardisik && e.ardisik[sira] !== undefined && Math.abs(e.ardisik[sira] - aranan) > 4) sorunlar.push({ harita: ad, tur: 'gtt-konum', ayrinti: `karo ${i} ${kaynak}#${sira}: ardışık konum ${e.ardisik[sira]}, arama ${aranan}` });
      const d = dxtOku(e.b.subarray(aranan));
      if (d.genislik !== P || d.yukseklik !== P) throw new Error(`karo boyu ${d.genislik}x${d.yukseklik}`);
      const rgba = rgbayaCevir(d);
      karolar.set(rgba, i * P * P * 4);
      bicimler.push(`${d.bicimAdi}/v${d.surum}${d.mipmap ? '/mip' : ''}`);
      // tek renk / tamamen siyah mı?
      let mn = 255, mx = 0; for (let p = 0; p < rgba.length; p += 4) { const v = Math.max(rgba[p], rgba[p + 1], rgba[p + 2]); if (v < mn) mn = v; if (v > mx) mx = v; }
      if (mx === 0) sorunlar.push({ harita: ad, tur: 'karo-siyah', ayrinti: `karo ${i} (${kaynak}#${sira}) tamamen siyah` });
      else if (mx - mn < 3) sorunlar.push({ harita: ad, tur: 'karo-tekrenk', ayrinti: `karo ${i} (${kaynak}#${sira}) tek renk (${mn}..${mx})` });
    } catch (e) {
      bicimler.push('HATA');
      karolar.fill(128, i * P * P * 4, (i + 1) * P * P * 4);
      sorunlar.push({ harita: ad, tur: 'karo-okunamadi', ayrinti: `karo ${i} ${kaynak}#${sira}: ${(e as Error).message}` });
    }
  });
  const harita: Harita = { ad, n: a.boyut, k: a.boyut - 1, karoSayisi: a.karolar.length, P, doku1: a.doku1, doku2: a.doku2, yon1: a.yon1, yon2: a.yon2, yukseklik: a.yukseklik, karolar };
  // karo bilgisi tutarlılığı
  let gecersiz1 = 0, gecersiz2 = 0, yon8 = 0;
  for (let x = 0; x < harita.k; x++) for (let z = 0; z < harita.k; z++) {
    const i = x * harita.n + z;
    if (a.doku1[i] !== 1023 && a.doku1[i] >= a.karolar.length) gecersiz1++;
    if (a.doku2[i] !== 1023 && a.doku2[i] >= a.karolar.length) gecersiz2++;
    if (a.doku1[i] < a.karolar.length && (a.yon1[i] & 0x7f) > 7) yon8++;
    if (a.doku2[i] < a.karolar.length && a.yon2[i] > 7) yon8++;
  }
  if (gecersiz1) sorunlar.push({ harita: ad, tur: 'doku1-gecersiz', ayrinti: `${gecersiz1} karoda doku1 indeksi karo sayısını (${a.karolar.length}) aşıyor` });
  if (gecersiz2) sorunlar.push({ harita: ad, tur: 'doku2-gecersiz', ayrinti: `${gecersiz2} karoda doku2 indeksi karo sayısını aşıyor (1023 dışı)` });
  if (yon8) sorunlar.push({ harita: ad, tur: 'yon>7', ayrinti: `${yon8} karoda yön kodu 7'den büyük (tablo yalnız 0-7)` });
  void nn;
  return { harita, sorunlar, karoBicim: bicimler };
}

/** Dikiş taraması: örneklenmiş komşu çiftler; hipotez başına ortalama/kötü oran ve karo indeksi başına kötü dikiş sayısı. */
export function dikisTara(h: Harita, adim = 7) {
  const sonuc: Record<string, { say: number; top: number; kotu: number }> = { O: { say: 0, top: 0, kotu: 0 }, C: { say: 0, top: 0, kotu: 0 } };
  const karoKotu = new Map<number, { say: number; kotu: number }>();
  const ekle = (i: number, kotuMu: boolean) => { const e = karoKotu.get(i) ?? { say: 0, kotu: 0 }; e.say++; if (kotuMu) e.kotu++; karoKotu.set(i, e); };
  for (let x = 0; x < h.k - 1; x++) for (let z = 0; z < h.k - 1; z++) {
    if ((x * 31 + z * 17) % adim) continue;
    for (const tur of [0, 1] as const) {
      const mO = dikisMaliyeti(h, [x, z], tur, hipO), mC = dikisMaliyeti(h, [x, z], tur, hipC);
      if (mO < 0) continue;
      for (const [ad, m] of [['O', mO], ['C', mC]] as const) { const s = sonuc[ad]; s.say++; s.top += m; if (m > 40) s.kotu++; }
      const A = h.doku1[x * h.n + z], B = tur === 0 ? h.doku1[(x + 1) * h.n + z] : h.doku1[x * h.n + z + 1];
      ekle(A, mO > 40); ekle(B, mO > 40);
    }
  }
  return { sonuc, karoKotu };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('karo-tara.ts')) {
  const od = new OyunDosyalari();
  const istenen = process.argv.slice(2);
  const adlar = istenen.length ? istenen : fs.readdirSync(path.join(OYUN_DIZINI, 'Zones')).filter((f) => /\.gtd$/i.test(f)).map((f) => f.replace(/\.gtd$/i, '')).sort((a, b) => a.localeCompare(b, 'en'));
  const tumSorun: Sorun[] = [];
  const ozet: string[] = [];
  console.log('harita'.padEnd(26), 'N'.padStart(4), 'karo'.padStart(5), 'karolar', ' O: ort/kötü%'.padEnd(16), ' C: ort/kötü%'.padEnd(16), 'sorun');
  for (const ad of adlar) {
    let r: Karolar;
    try { r = haritaOyundan(od, ad); } catch (e) { console.log(ad.padEnd(26), 'OKUNAMADI', (e as Error).message); tumSorun.push({ harita: ad, tur: 'gtd-okunamadi', ayrinti: (e as Error).message }); continue; }
    const { sonuc, karoKotu } = dikisTara(r.harita, r.harita.k > 300 ? 7 : 3);
    const f = (s: { say: number; top: number; kotu: number }) => `${(s.top / s.say).toFixed(1)}/${((s.kotu / s.say) * 100).toFixed(1)}%`.padEnd(14);
    const hata = r.karoBicim.filter((x) => x === 'HATA').length;
    console.log(ad.padEnd(26), String(r.harita.n).padStart(4), String(r.harita.karoSayisi).padStart(5), (hata ? `${hata} HATA` : 'tamam').padEnd(7), f(sonuc.O), f(sonuc.C), r.sorunlar.length);
    tumSorun.push(...r.sorunlar);
    const kotuKaro = [...karoKotu].filter(([, v]) => v.say >= 30 && v.kotu / v.say > 0.25).sort((a, b) => b[1].kotu - a[1].kotu).slice(0, 5);
    if (kotuKaro.length) ozet.push(`  ${ad}: dikişi sürekli kötü karo indeksleri (≥30 dikiş, >%25 kötü): ` + kotuKaro.map(([i, v]) => `#${i} (${v.kotu}/${v.say})`).join(', '));
  }
  console.log('\n--- Sorunlar (türe göre) ---');
  const turler = new Map<string, Sorun[]>(); for (const s of tumSorun) (turler.get(s.tur) ?? turler.set(s.tur, []).get(s.tur)!).push(s);
  for (const [t, l] of turler) { console.log(`${t}: ${l.length}`); for (const s of l.slice(0, 12)) console.log(`   ${s.harita}: ${s.ayrinti}`); if (l.length > 12) console.log(`   … +${l.length - 12}`); }
  if (!tumSorun.length) console.log('(yok)');
  if (ozet.length) { console.log('\n--- Dikişi kötü karolar ---'); console.log(ozet.join('\n')); }
}
