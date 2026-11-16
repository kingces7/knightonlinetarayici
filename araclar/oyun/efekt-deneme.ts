// DENEYSEL — .fxb biçiminin yalnızca "tek parçacıklı" türü için alan tahmini (docs/formatlar/fxb.md, "Deneme" bölümü).
// Kaynak kodu yok; alan anlamları 12 örnek dosya karşılaştırılarak TAHMİN edildi (ör. hız min/maks'ın tam ters işaretli
// çıkması, boyut/açı değerlerinin mantıklı görünmesi). DOĞRULANMAMIŞTIR. Bu yüzden gerçek skill'lere bağlanmaz;
// yalnızca görsel bir deneme olarak client/src/dunya/efektDeneme.ts ile test edilir (window.ke.efektDene()).
//   npm run efekt-deneme   -> donusturulmus/web/efekt/dust.json + dust.png
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { dokuPng } from '../model/dokuYardim.ts';

const BS = String.fromCharCode(92);

/** Tahmini alan yerleşimi (bkz. dosya başı not): yalnızca tip=5 (tek parçacıklı), 85+260 bayttan sonraki kuyrukta. */
export interface ParcacikTahmini {
  doku: string;
  /** Saniye. */
  omur: number; omurRastgele: number;
  /** Boyut: başlangıç/bitiş. */
  boyutBas: number; boyutBit: number;
  /** Her eksende [-maks, +maks] aralığında rastgele hız (m/sn tahmini). */
  hizMaksX: number; hizMaksY: number; hizMaksZ: number;
  /** Yukarı sürüklenme (duman gibi efektlerde yüksek, toz gibi efektlerde düşük). */
  surukleY: number;
  /** Yayılma açısı (derece; 360 = her yöne). */
  aci: number;
}

export function parcacikOku(b: Buffer): ParcacikTahmini {
  const idx = b.indexOf('fx' + BS);
  if (idx !== 85) throw new Error('tek parçacıklı tür değil (yol 85. baytta başlamıyor)');
  let end = idx; while (end < b.length && b[end] >= 32 && b[end] < 127) end++;
  const doku = b.subarray(idx, end).toString('latin1');
  const t = b.subarray(345); // path tamponu her zaman 345. bayta kadar (bkz. fxb.md)
  if (t.readUInt32LE(0) !== 5) throw new Error(`beklenmeyen parça türü ${t.readUInt32LE(0)}`);
  return {
    doku,
    omur: t.readFloatLE(8), omurRastgele: t.readFloatLE(12),
    boyutBas: t.readFloatLE(24), boyutBit: t.readFloatLE(28),
    hizMaksX: Math.abs(t.readFloatLE(40)), hizMaksY: Math.abs(t.readFloatLE(44)), hizMaksZ: Math.abs(t.readFloatLE(48)),
    surukleY: t.readFloatLE(64),
    aci: t.readFloatLE(76),
  };
}

function main(): number {
  const od = new OyunDosyalari();
  const yol = 'fx' + BS + 'marseu_gear_2007_dust.fxb'; // adı da "dust"; 3 örnekte de aynı bulunup doğrulandı (bkz. fxb.md)
  const veri = parcacikOku(od.oku(yol));
  const dokuYolu = `${veri.doku}0000.dxt`; // yol metni zaten "fx\particle\...\<ad>_" ile bitiyor, kare numarası eklenir
  const png = dokuPng(od, dokuYolu, 256);
  if (!png) throw new Error(`doku bulunamadı: ${dokuYolu}`);
  const hedef = path.join(CIKTI_DIZINI, 'web', 'efekt');
  fs.mkdirSync(hedef, { recursive: true });
  fs.writeFileSync(path.join(hedef, 'dust.png'), png.png);
  fs.writeFileSync(path.join(hedef, 'dust.json'), JSON.stringify({ ...veri, dokuPng: 'efekt/dust.png' }, null, 1));
  console.log('DENEYSEL (doğrulanmamış) alan tahmini:', JSON.stringify(veri, null, 1));
  console.log('->', hedef);
  return 0;
}

if (process.argv[1]?.endsWith('efekt-deneme.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
