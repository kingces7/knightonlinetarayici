// Sunucu bölgesi (ZONE_INFO1098) → client haritası (Zones/*.gtd) eşlemesi.
//   powershell -File harita\bolge-disa-aktar.ps1   (bir kez: bölge tablosunu veritabanından, salt okunur, JSON'a alır)
//   node harita/bolge-tara.ts                       -> eşlemeyi hesaplar, donusturulmus/web/harita/bolgeler.json + bolgeler-eksik.json yazar
//   node harita/bolge-tara.ts --donustur            -> ayrıca eşleşen her harita için `node harita/cli.ts <ad>` çalıştırır (süre/boyut ölçülür)
//
// Eşleme sırası (bölgenin .smd'si = sunucunun gerçekten kullandığı harita; çarpışma ve kapılar ondan gelir):
//   A) client Zones.csv'nin o bölge için gösterdiği .gtd, .smd ile yükseklik olarak uyuşuyorsa  → "tam"
//   B) .smd'si bu bölgeninkiyle aynı olan başka bir .gtd (eslesme.ts SUNUCU_HARITASI ya da <ad>.smd) uyuşuyorsa → "tam"
//   C) .gtd hiçbirine uyuşmuyor ama Zones.csv'deki .gtd dosyası var → "gorsel" (yalnız arazi/nesne; çarpışma ve kapı verisi yok)
//   D) Zones.csv'de .gtd yok ya da dosyası yok; bütün .gtd'ler arasında tek ve güçlü (≥ %70) bir uyuşma varsa → "tam"
//   E) hiçbiri → eksik (bolgeler-eksik.json: neden yazılır)
// Elle karar verilenler ELLE tablosunda (nedenleriyle).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CIKTI_DIZINI, OYUN_DIZINI, SUNUCU_HARITA_DIZINI } from '../ortak/yollar.ts';
import { gtdOku } from './arazi.ts';
import { smdOku } from './smd.ts';
import { SUNUCU_HARITASI, eslesmeGuvenilir, yukseklikEslesmesi, type IzgaraKaynak, type YukseklikEslesmesi } from './eslesme.ts';

/** Elle verilmiş kararlar (algoritmanın tek başına seçemeyeceği ya da proje kararı olanlar). */
const ELLE: Record<number, { ad: string; neden: string }> = {
  18: { ad: 'moradon', neden: 'Kecoon Valley: 1098moradon_0826.smd hem moradon hem moradon_xmas ile uyuşuyor; moradon seçildi (xmas = mevsimlik sürüm; haritalar.ts kararı 2026-11-19)' },
  21: { ad: '14th_oldmoradon', neden: 'oyundaki Moradon = eski Moradon (old_moradon.smd %98,6; proje kararı)' },
};

interface BolgeSatiri { no: number; smd: string; ad: string; durum: number; tur: number; enDusukSeviye: number; enYuksekSeviye: number; deneyimKaybi: boolean }
interface BaslangicSatiri { no: number; karus: [number, number]; elmorad: [number, number] }

const sunucuJson = path.join(CIKTI_DIZINI, 'tablolar', 'bolge-sunucu.json');
if (!fs.existsSync(sunucuJson)) { console.log(`Yok: ${sunucuJson}\nÖnce: powershell -ExecutionPolicy Bypass -File harita\\bolge-disa-aktar.ps1`); process.exit(1); }
const { bolgeler, baslangic: baslangicListesi } = JSON.parse(fs.readFileSync(sunucuJson, 'utf8').replace(/^﻿/, '')) as { bolgeler: BolgeSatiri[]; baslangic: BaslangicSatiri[] };

// --- client .gtd'leri
const zonesDizin = path.join(OYUN_DIZINI, 'Zones');
const gtdler = new Map<string, IzgaraKaynak & { dosya: string }>(); // küçük harf ad -> arazi
for (const f of fs.readdirSync(zonesDizin).filter((x) => x.toLowerCase().endsWith('.gtd'))) {
  try { const a = gtdOku(fs.readFileSync(path.join(zonesDizin, f))); gtdler.set(f.slice(0, -4).toLowerCase(), { boyut: a.boyut, yukseklik: a.yukseklik, dosya: f }); } catch { /* okunamayan atlanır */ }
}

// --- sunucu .smd'leri
const smdDosyalari = new Map<string, string>(); // küçük harf -> gerçek ad
for (const f of fs.readdirSync(SUNUCU_HARITA_DIZINI)) if (f.toLowerCase().endsWith('.smd')) smdDosyalari.set(f.toLowerCase(), f);
const smdOnbellek = new Map<string, IzgaraKaynak | null>();
const smdAl = (ad: string): IzgaraKaynak | null => {
  const g = smdDosyalari.get(ad.toLowerCase());
  if (!g) return null;
  if (!smdOnbellek.has(g)) { try { smdOnbellek.set(g, smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, g)))); } catch { smdOnbellek.set(g, null); } }
  return smdOnbellek.get(g) ?? null;
};

// --- client Zones.csv: bölge no → .gtd adı
const csvGtd = new Map<number, string>(); // anahtar (no×10, bazılarında ×100) -> gtd adı (küçük harf)
const csvYol = new Map<number, string>(); // anahtar -> .gtd olmayanlar dahil ham yol (neden yazmak için)
const csvSky = new Map<string, string>(); // gtd adı -> Zones.csv'deki gökyüzü dosyası adı (Misc/Sky/<ad>.N3Sky)
const csvSkyAnahtar = new Map<number, string>(); // Zones.csv anahtarı -> gökyüzü dosyası adı
const csvGokyuzuAnahtar = (no: number): string | undefined => [no * 10, no * 100].map((k) => csvSkyAnahtar.get(k)).find(Boolean);
{
  const csv = path.join(CIKTI_DIZINI, 'tablolar', 'Data', 'Zones.csv');
  if (!fs.existsSync(csv)) { console.log(`Zones.csv yok: ${csv} (önce tbl-coz)`); process.exit(1); }
  for (const satir of fs.readFileSync(csv, 'utf8').split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = satir.split(',').map((s) => s.replace(/"/g, '').trim());
    const yol = c[1] ?? '';
    if (+c[0] && yol.includes('\\')) csvYol.set(+c[0], yol);
    if (+c[0] && /\.gtd$/i.test(yol)) {
      const ad = path.basename(yol.replace(/\\/g, '/')).slice(0, -4).toLowerCase();
      csvGtd.set(+c[0], ad);
      if (/\.n3sky$/i.test(c[8] ?? '') && !csvSky.has(ad)) csvSky.set(ad, path.basename((c[8] ?? '').replace(/\\/g, '/')).replace(/\.n3sky$/i, ''));
    }
    if (+c[0] && /\.n3sky$/i.test(c[8] ?? '')) csvSkyAnahtar.set(+c[0], path.basename((c[8] ?? '').replace(/\\/g, '/')).replace(/\.n3sky$/i, ''));
  }
}
/** Zones.csv anahtarı çoğunlukla bölge×10; Moradon/Kecoon gibi bazıları ×100, 63 için iki satır var (630 Worldwar, 6300 BattleZone_d). Önce ×10 sonra ×100; her ikisinin de .gtd'si olabilir. */
const csvAnahtarlari = (no: number): number[] => [no * 10, no * 100].filter((k) => csvYol.has(k));
const csvAdaylari = (no: number): string[] => csvAnahtarlari(no).map((k) => csvGtd.get(k)).filter((x): x is string => !!x);

const yuzde = (e: YukseklikEslesmesi) => (e.boyutAyni ? `%${(e.oran * 100).toFixed(1)}` : `boyut ${e.gtdBoyut}≠${e.smdBoyut}`);
const beklenenSmd = (gtdAd: string) => (SUNUCU_HARITASI[gtdAd] ?? `${gtdAd}.smd`).toLowerCase();

interface Cikti { ad: string; bolgeAdi: string; durum: 'tam' | 'gorsel'; smd: string | null; smdVar: boolean; esleme: string; yontem: string; uyari?: string; baslangic?: [number, number]; baslangicElmorad?: [number, number]; deneyimKaybi: boolean; enDusukSeviye: number; enYuksekSeviye: number; csvHarita?: string }
const sonuc: Record<number, Cikti> = {};
const eksik: Record<number, { bolgeAdi: string; smd: string; smdVar: boolean; csvHarita: string | null; neden: string }> = {};

for (const b of bolgeler) {
  const smd = smdAl(b.smd);
  const smdVar = smd !== null;
  const csvListe = csvAdaylari(b.no).filter((g) => gtdler.has(g)); // dosyası olan Zones.csv adayları
  const csv: string | undefined = csvListe[0];
  const csvVar = csv !== undefined;
  const olc = (g: string) => (smd ? yukseklikEslesmesi(gtdler.get(g)!, smd) : null);
  let secim: { ad: string; durum: 'tam' | 'gorsel'; yontem: string; e: YukseklikEslesmesi | null } | null = null;

  if (ELLE[b.no] && gtdler.has(ELLE[b.no].ad)) { const e = olc(ELLE[b.no].ad); secim = { ad: ELLE[b.no].ad, durum: e && eslesmeGuvenilir(e) ? 'tam' : 'gorsel', yontem: `elle (${ELLE[b.no].neden})`, e }; }
  if (!secim && smd) for (const g of csvListe) { const e = olc(g)!; if (eslesmeGuvenilir(e)) { secim = { ad: g, durum: 'tam', yontem: 'A: Zones.csv', e }; break; } }
  if (!secim && smd) { // B: .smd adı bu bölgeninkiyle aynı olan .gtd'ler; en iyisi
    const adaylar = [...gtdler.keys()].filter((g) => beklenenSmd(g) === b.smd.toLowerCase()).map((g) => ({ g, e: olc(g)! })).filter((x) => eslesmeGuvenilir(x.e)).sort((x, y) => y.e.oran - x.e.oran);
    if (adaylar.length) secim = { ad: adaylar[0].g, durum: 'tam', yontem: 'B: .smd adı', e: adaylar[0].e };
  }
  if (!secim && csvVar) secim = { ad: csv!, durum: 'gorsel', yontem: 'C: Zones.csv (çarpışma uyuşmuyor)', e: olc(csv!) };
  if (!secim && smd) { // D: tek ve güçlü yükseklik uyuşması
    const adaylar = [...gtdler.keys()].map((g) => ({ g, e: olc(g)! })).filter((x) => x.e.boyutAyni).sort((x, y) => y.e.oran - x.e.oran);
    if (adaylar.length && adaylar[0].e.oran >= 0.7 && (adaylar.length < 2 || adaylar[1].e.oran <= adaylar[0].e.oran - 0.05)) secim = { ad: adaylar[0].g, durum: 'tam', yontem: 'D: yalnız yükseklik', e: adaylar[0].e };
  }

  if (!secim) {
    const yollar = csvAnahtarlari(b.no).map((k) => csvYol.get(k)!);
    const neden = !yollar.length ? 'Zones.csv satırı yok' : `Zones.csv'nin gösterdiği ${yollar.map((y) => y.replace(/^Zones\\/, '')).join(', ')} client klasöründe ${yollar.some((y) => /\.lilith$/i.test(y)) ? 'okunamayan .lilith biçiminde' : 'yok'}`;
    eksik[b.no] = { bolgeAdi: b.ad, smd: b.smd, smdVar, csvHarita: yollar[0] ?? null, neden: `${neden}${neden ? '; ' : ''}${smdVar ? 'hiçbir .gtd ile tek ve güçlü yükseklik uyuşması yok' : `sunucu haritası (${b.smd}) klasörde yok`}` };
    continue;
  }
  const bs = baslangicListesi.find((x) => x.no === b.no);
  const g = gtdler.get(secim.ad)!;
  const sinir = (g.boyut - 1) * 4; // birim 4 m (arazi.json birim alanı)
  const icinde = (p: [number, number]) => p[0] > 0 && p[1] > 0 && p[0] < sinir && p[1] < sinir;
  const kar = bs && icinde(bs.karus) ? bs.karus : undefined, elm = bs && icinde(bs.elmorad) ? bs.elmorad : undefined;
  const uyari: string[] = [];
  if (secim.e && !secim.e.boyutAyni) uyari.push(`sunucu haritası ${secim.e.smdBoyut}×${secim.e.smdBoyut}, client ${g.boyut}×${g.boyut}: sunucu koordinatları client haritasına uymayabilir`);
  else if (secim.durum === 'gorsel' && smdVar) uyari.push(`.smd yüksekliği client haritasıyla uyuşmuyor (${secim.e ? yuzde(secim.e) : '-'}): çarpışma/kapı verisi yazılmaz`);
  if (!smdVar) uyari.push(`sunucu haritası (${b.smd}) klasörde yok: çarpışma/kapı verisi yok`);
  sonuc[b.no] = {
    ad: secim.ad, bolgeAdi: b.ad, durum: secim.durum, smd: smdVar ? smdDosyalari.get(b.smd.toLowerCase())! : null, smdVar,
    esleme: secim.e ? yuzde(secim.e) : '-', yontem: secim.yontem, ...(uyari.length ? { uyari: uyari.join('; ') } : {}),
    ...(kar ? { baslangic: kar } : elm ? { baslangic: elm } : {}), ...(elm ? { baslangicElmorad: elm } : {}),
    deneyimKaybi: b.deneyimKaybi, enDusukSeviye: b.enDusukSeviye, enYuksekSeviye: b.enYuksekSeviye, ...(csv && csv !== secim.ad ? { csvHarita: csv } : {}),
  };
}

const hedefDizin = path.join(CIKTI_DIZINI, 'web', 'harita');
fs.mkdirSync(hedefDizin, { recursive: true });
fs.writeFileSync(path.join(hedefDizin, 'bolgeler.json'), JSON.stringify(sonuc, null, 1));
fs.writeFileSync(path.join(hedefDizin, 'bolgeler-eksik.json'), JSON.stringify(eksik, null, 1));

const haritalar = [...new Set(Object.values(sonuc).map((s) => s.ad))].sort();
console.log(`${bolgeler.length} bölge: ${Object.keys(sonuc).length} eşleşti (tam ${Object.values(sonuc).filter((s) => s.durum === 'tam').length}, görsel ${Object.values(sonuc).filter((s) => s.durum === 'gorsel').length}), ${Object.keys(eksik).length} eksik; ${haritalar.length} ayrı harita`);
for (const b of bolgeler) {
  const s = sonuc[b.no];
  if (s) console.log(`${String(b.no).padStart(3)} ${b.ad.padEnd(24)} ${s.ad.padEnd(24)} ${s.durum.padEnd(6)} ${s.esleme.padEnd(14)} ${b.smd}${s.csvHarita ? `  (csv: ${s.csvHarita})` : ''}${s.uyari ? `  ⚠ ${s.uyari}` : ''}`);
  else console.log(`${String(b.no).padStart(3)} ${b.ad.padEnd(24)} ${'EKSİK'.padEnd(24)} ${eksik[b.no].neden}  [${b.smd}]`);
}

// Dönüştürülecek harita için cli.ts'in .smd seçimi: SUNUCU_HARITASI ya da <ad>.smd. Bölge .smd'si farklıysa uyarı verilir.
for (const [no, s] of Object.entries(sonuc)) {
  if (s.durum !== 'tam' || !s.smd) continue;
  const cliSmd = (SUNUCU_HARITASI[s.ad] ?? `${s.ad}.smd`).toLowerCase();
  if (cliSmd !== s.smd.toLowerCase()) console.log(`  not: bölge ${no} ${s.ad} için cli.ts ${cliSmd} kullanır, bölge ${s.smd} kullanıyor (SUNUCU_HARITASI'na eklemeyi düşün)`);
}

if (process.argv.includes('--donustur')) {
  const araclarDizini = path.join(import.meta.dirname, '..');
  const rapor: { harita: string; saniye: number; mb: number; tamam: boolean; cikti: string }[] = [];
  for (const ad of haritalar) {
    // Gökyüzü (gün döngüsü renkleri): npm run gokyuzu -- <harita> <sky adı>; yoksa client sabit renk kullanır
    const gokyuzuYolu = path.join(hedefDizin, ad, 'gokyuzu.json');
    // Haritanın kendi .gtd satırında gökyüzü yoksa (ör. .lilith satırı) bu haritayı kullanan bölgenin satırındakine bakılır
    const sky = csvSky.get(ad) ?? Object.entries(sonuc).filter(([, s]) => s.ad === ad).map(([no]) => csvGokyuzuAnahtar(Number(no))).find(Boolean);
    const atla = !process.argv.includes('--yeniden') && fs.existsSync(path.join(hedefDizin, ad, 'arazi.json'));
    if (atla) console.log(`ATLA  ${ad} (zaten dönüştürülmüş; yeniden için --yeniden)`);
    const gokyuzuYap = () => {
      if (!sky || fs.existsSync(gokyuzuYolu)) return;
      const g = spawnSync(process.execPath, ['oyun/gokyuzu.ts', ad, sky], { cwd: araclarDizini, encoding: 'utf8' });
      console.log(g.status === 0 ? `  gökyüzü ${ad} ← ${sky}` : `  gökyüzü YOK ${ad} ← ${sky}: ${(g.stdout + g.stderr).trim().split('\n').slice(-1)[0]}`);
    };
    if (atla) { gokyuzuYap(); continue; }
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ['harita/cli.ts', ad], { cwd: araclarDizini, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 20 * 60 * 1000 });
    const saniye = (Date.now() - t0) / 1000;
    const klasor = path.join(hedefDizin, ad);
    let boyut = 0;
    const gez = (d: string) => { for (const g of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, g.name); if (g.isDirectory()) gez(p); else boyut += fs.statSync(p).size; } };
    if (fs.existsSync(klasor)) gez(klasor);
    const tamam = r.status === 0 && fs.existsSync(path.join(klasor, 'arazi.json'));
    if (tamam) gokyuzuYap();
    rapor.push({ harita: ad, saniye: Math.round(saniye * 10) / 10, mb: Math.round(boyut / 1048576 * 10) / 10, tamam, cikti: (r.stdout + r.stderr).trim() });
    console.log(`${tamam ? 'TAMAM' : 'HATA '} ${ad.padEnd(26)} ${saniye.toFixed(1).padStart(6)} sn ${(boyut / 1048576).toFixed(1).padStart(7)} MB`);
  }
  fs.writeFileSync(path.join(CIKTI_DIZINI, 'tablolar', 'bolge-donusum-raporu.json'), JSON.stringify(rapor, null, 1));
}
