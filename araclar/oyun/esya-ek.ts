// Eşya ipucu için veritabanından (LILITH_MYKO.ITEM) gelen ek bilgiler: unique eşyalar (ItemType = 4) ve her eşyanın hasar/savunma/bonus/direnç alanları.
//   npm run esya-ek   -> donusturulmus/web/esya/ek.json  { alanlar: [...], unique: [Num...], yukselt: { "1": [Num...], ... "9": [...] }, ek: { "<Num>": [alanSırası, değer, alanSırası, değer, ...] } }
// Yalnızca sıfırdan farklı alanlar yazılır. Orijinal client bunları eşya numarasından eklenti tablosundan çıkarır; burada sunucunun gerçek değeri kullanılır.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { sqlSorgu } from '../tarama/sql.ts';

export const ALANLAR = [
  'FireDamage', 'IceDamage', 'LightningDamage', 'PoisonDamage', 'HPDrain', 'MPDamage', 'MPDrain',
  'DaggerAc', 'SwordAc', 'ClubAc', 'AxeAc', 'SpearAc', 'BowAc',
  'StrB', 'StaB', 'DexB', 'IntelB', 'ChaB', 'MaxHpB', 'MaxMpB',
  'FireR', 'ColdR', 'LightningR', 'MagicR', 'PoisonR', 'CurseR',
] as const;

function main(): number {
  const sutunlar = ALANLAR.map((a) => `ISNULL(${a}, 0)`).join(', ');
  const kosul = ALANLAR.map((a) => `ISNULL(${a}, 0) <> 0`).join(' OR ');
  const satirlar = sqlSorgu(`SELECT Num, ${sutunlar} FROM ITEM WHERE Num IS NOT NULL AND (${kosul}) ORDER BY Num`);
  const ek: Record<string, number[]> = {};
  for (const s of satirlar) {
    const dizi: number[] = [];
    for (let i = 0; i < ALANLAR.length; i++) { const v = Number(s[i + 1]); if (v) dizi.push(i, v); }
    if (dizi.length) ek[s[0]] = dizi;
  }
  const unique = sqlSorgu('SELECT DISTINCT Num FROM ITEM WHERE ItemType = 4 AND Num IS NOT NULL ORDER BY Num').map((r) => Number(r[0]));
  // GM Market (GM dükkanı) sekmeleri: +1…+9 yükseltilmiş eşyalar (ItemType 5/11/12, numara sonu 001-009), her seviye ayrı liste
  const yukselt: Record<string, number[]> = {};
  for (let n = 1; n <= 9; n++) yukselt[n] = sqlSorgu(`SELECT Num FROM ITEM WHERE Num % 1000 = ${n} AND ItemType IN (5, 11, 12) AND LEN(ISNULL(strName, '')) > 0 ORDER BY Num`).map((r) => Number(r[0]));
  const hedef = path.join(CIKTI_DIZINI, 'web', 'esya');
  fs.mkdirSync(hedef, { recursive: true });
  fs.writeFileSync(path.join(hedef, 'ek.json'), JSON.stringify({ alanlar: ALANLAR, unique, yukselt, ek }));
  console.log(`${Object.keys(ek).length} eşyada ek bilgi, ${unique.length} unique eşya -> ${path.join(hedef, 'ek.json')}`);
  return 0;
}

if (process.argv[1]?.endsWith('esya-ek.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
