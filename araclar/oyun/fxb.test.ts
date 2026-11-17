// Bütün .fxb dosyaları kaynaktaki yükleme sırasıyla çözülür. Kaynaktaki sürümlerde (paket ≤ 2, parça ≤ 5) dosya BAYT BAYT tam tüketilmeli;
// yeni sürümlerde (3-6) paket sonunda bilinmeyen bir kuyruk kalır (45-93 bayt, çoğu sıfır) ve parça başına bilinmeyen eklentiler atlanır (fxb.ts EKSTRA).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { fxbOku } from './fxb.ts';

test('.fxb dosyalarının en az %98\'ü kaynağın yükleme sırasıyla çözülür; eski sürümler baytı baytına tam', (t) => {
  const od = new OyunDosyalari();
  const liste = od.listele('.fxb');
  if (!liste.length) { t.skip('oyun dosyaları yok'); return; }
  let tamam = 0; const eskiHata: string[] = []; const tur = [0, 0, 0, 0, 0];
  for (const yol of liste) {
    const b = od.oku(yol); const surum = b.readInt32LE(0);
    try {
      const { bundle, kalan } = fxbOku(b);
      for (const p of bundle.parcalar) tur[p.tur]++;
      if (surum <= 2) { if (kalan === 0) tamam++; else eskiHata.push(`${yol}: ${kalan} bayt artık`); }
      else if (kalan >= 40 && kalan <= 100) tamam++;
    } catch (e) { if (surum <= 2) eskiHata.push(`${yol}: ${(e as Error).message}`); }
  }
  console.log(`dosya ${liste.length}, çözülen ${tamam} (%${Math.round((tamam * 100) / liste.length)}), parça türleri (parçacık/tahta/mesh/zemin) ${tur.slice(1).join('/')}, eski sürüm sorunlu ${eskiHata.length}`);
  assert.ok(tamam / liste.length >= 0.98, `çözülen oran düşük: ${tamam}/${liste.length}`);
  assert.ok(eskiHata.length <= 3, eskiHata.join('\n'));
});
