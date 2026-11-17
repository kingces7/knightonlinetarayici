// Skill efektleri: .fxb paketlerini (fxb.ts, OpenKO kaynağından) web biçimine çevirir.
//   npm run efekt            -> dört sınıfın temel skill sayfalarındaki efektler
//   npm run efekt -- 2601 701  -> belirtilen fx.tbl numaraları
// Çıktı: donusturulmus/web/efekt/fx/<numara>.json + efekt/doku/<ad>.png (parça doku kareleri). Mesh parçaları (tür 3): .n3shape → .n3pmesh geometrisi JSON'a gömülür.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dokuPng } from '../model/dokuYardim.ts';
import { dokuKareleri, fxbOku, type FxParca } from './fxb.ts';
import { pmeshOku, shapeOku } from '../model/n3.ts';

const SAYFALAR = [2010, 2020, 2030, 2040, 1010, 1020, 1030, 1040]; // dört sınıfın temel skill sayfaları
const guvenli = (yol: string) => yol.toLowerCase().replace(/\.dxt$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/** FX mesh parçası: .n3shape'in her parçasının .n3pmesh geometrisi ve doku kareleri. */
function meshOku(od: OyunDosyalari, shapeYolu: string, hedef: string, yazilan: Set<string>): unknown[] {
  const sh = shapeOku(od.oku(shapeYolu));
  return sh.parcalar.map((sp) => {
    const m = pmeshOku(od.oku(sp.mesh));
    const dokular: string[] = [];
    for (const d of sp.dokular) {
      if (!d) continue;
      const ad = guvenli(d);
      if (!yazilan.has(ad)) { const png = dokuPng(od, d, 256); if (png) fs.writeFileSync(path.join(hedef, 'doku', `${ad}.png`), png.png); yazilan.add(ad); }
      dokular.push(`efekt/doku/${ad}.png`);
    }
    const r = (a: ArrayLike<number>) => Array.from(a, (v) => Math.round(v * 10000) / 10000);
    return { konum: r(m.konum), uv: r(m.uv), indeks: Array.from(m.indeks), dokular, fps: sp.fps, pivot: sp.pivot };
  });
}

function main(): number {
  const od = new OyunDosyalari();
  const fx = new Map<number, string>();
  for (const s of tbldenOku(od.oku('Data/fx.tbl'), 'windows-1252').satirlar) fx.set(Number(s[0]), String(s[2]));
  let idler = process.argv.slice(2).map(Number).filter((n) => n > 0);
  if (!idler.length) {
    const kume = new Set<number>();
    for (const s of tbldenOku(od.oku('Data/SkillMagicTable_us.tbl'), 'windows-1252').satirlar) {
      if (!SAYFALAR.includes(Number(s[16])) || Number(s[15]) <= 0) continue;
      for (const i of [7, 9, 11, 12]) if (Number(s[i]) > 0) kume.add(Number(s[i]));
    }
    idler = [...kume].sort((a, b) => a - b);
  }
  const hedef = path.join(CIKTI_DIZINI, 'web', 'efekt');
  fs.mkdirSync(path.join(hedef, 'fx'), { recursive: true });
  fs.mkdirSync(path.join(hedef, 'doku'), { recursive: true });
  const yazilan = new Set<string>();
  for (const id of idler) {
    const dosya = fx.get(id);
    if (!dosya) { console.log(`${id}: fx.tbl'de yok`); continue; }
    try {
      const { bundle } = fxbOku(od.oku(dosya));
      const parcalar: Record<string, unknown>[] = [];
      let atlanan = 0;
      for (const p of bundle.parcalar as FxParca[]) {
        const dokular: string[] = [];
        let meshler: unknown[] | undefined;
        if (p.tur === 3) { try { meshler = meshOku(od, p.sekilDosyasi, hedef, yazilan); } catch { atlanan++; continue; } }
        for (const k of dokuKareleri(p)) {
          const ad = guvenli(k);
          if (!yazilan.has(ad)) {
            const png = dokuPng(od, k, 256);
            if (png) fs.writeFileSync(path.join(hedef, 'doku', `${ad}.png`), png.png);
            yazilan.add(ad);
          }
          dokular.push(`efekt/doku/${ad}.png`);
        }
        const { dokuAdi: _a, hdrDokuAdi: _h, ...geri } = p as FxParca & { hdrDokuAdi: string };
        parcalar.push({ ...geri, dokular, ...(meshler ? { meshler } : {}) });
      }
      fs.writeFileSync(path.join(hedef, 'fx', `${id}.json`), JSON.stringify({ id, dosya, surum: bundle.surum, omur: bundle.omur, hiz: bundle.hiz, boyutaBagli: bundle.boyutaBagli, parcalar }));
      console.log(`${id}: ${dosya} -> ${parcalar.length} parça${atlanan ? ` (${atlanan} mesh atlandı)` : ''}`);
    } catch (e) { console.log(`${id}: ${dosya} ÇÖZÜLEMEDİ (${(e as Error).message})`); }
  }
  od.kapat();
  return 0;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
