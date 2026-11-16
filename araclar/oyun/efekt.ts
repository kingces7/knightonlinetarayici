// Skill efektleri: .fxb paketlerini (fxb.ts, OpenKO kaynağından) web biçimine çevirir.
//   npm run efekt            -> skill sayfası 2010'daki skill'lerin efektleri
//   npm run efekt -- 2601 701  -> belirtilen fx.tbl numaraları
// Çıktı: donusturulmus/web/efekt/fx/<numara>.json + efekt/doku/<ad>.png (parça doku kareleri). Mesh parçaları (tür 3) henüz atlanır.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dokuPng } from '../model/dokuYardim.ts';
import { dokuKareleri, fxbOku, type FxParca } from './fxb.ts';

const SAYFA = 2010;
const guvenli = (yol: string) => yol.toLowerCase().replace(/\.dxt$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function main(): number {
  const od = new OyunDosyalari();
  const fx = new Map<number, string>();
  for (const s of tbldenOku(od.oku('Data/fx.tbl'), 'windows-1252').satirlar) fx.set(Number(s[0]), String(s[2]));
  let idler = process.argv.slice(2).map(Number).filter((n) => n > 0);
  if (!idler.length) {
    const kume = new Set<number>();
    for (const s of tbldenOku(od.oku('Data/SkillMagicTable_us.tbl'), 'windows-1252').satirlar) {
      if (Number(s[16]) !== SAYFA || Number(s[15]) <= 0) continue;
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
        if (p.tur === 3) { atlanan++; continue; } // mesh parçası
        const dokular: string[] = [];
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
        parcalar.push({ ...geri, dokular });
      }
      fs.writeFileSync(path.join(hedef, 'fx', `${id}.json`), JSON.stringify({ id, dosya, surum: bundle.surum, omur: bundle.omur, hiz: bundle.hiz, boyutaBagli: bundle.boyutaBagli, parcalar }));
      console.log(`${id}: ${dosya} -> ${parcalar.length} parça${atlanan ? ` (${atlanan} mesh atlandı)` : ''}`);
    } catch (e) { console.log(`${id}: ${dosya} ÇÖZÜLEMEDİ (${(e as Error).message})`); }
  }
  od.kapat();
  return 0;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
