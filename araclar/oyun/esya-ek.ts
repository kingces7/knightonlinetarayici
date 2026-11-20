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
  // Yükseltilmiş (+N) giyilebilir eşyaların gerçek değerleri: [savunma, saldırı, dayanıklılık, güç, sağlık, çeviklik, zekâ, karizma şartı, seviye şartı].
  // Client ipucu taban eşyanın (client tablosu) değerini gösteriyordu; sunucu ise her +N için daha yüksek savunma/saldırı/dayanıklılık ve şart ister.
  // Yalnız tabanından (x000 kaydı) farklı olanlar yazılır.
  const deger: Record<string, number[]> = {};
  const kolonlar = ['Ac', 'Damage', 'Duration', 'ReqStr', 'ReqSta', 'ReqDex', 'ReqIntel', 'ReqCha', 'ReqLevel'];
  const secim = kolonlar.map((k) => `CAST(i.${k} AS int)`).join(', ');
  const fark = kolonlar.map((k) => `i.${k} <> b.${k}`).join(' OR ');
  for (const s of sqlSorgu(`SELECT i.Num, ${secim} FROM ITEM i LEFT JOIN ITEM b ON b.Num = (i.Num / 1000) * 1000 WHERE i.Kind IN (11,21,22,31,32,41,42,51,52,60,70,71,91,92,93,94,110,181,210,220,230,240) AND i.Num % 1000 <> 0 AND LEN(ISNULL(i.strName, '')) > 0 AND (b.Num IS NULL OR ${fark}) ORDER BY i.Num`)) deger[s[0]] = s.slice(1).map(Number);
  const hedef = path.join(CIKTI_DIZINI, 'web', 'esya');
  fs.mkdirSync(hedef, { recursive: true });
  fs.writeFileSync(path.join(hedef, 'ek.json'), JSON.stringify({ alanlar: ALANLAR, unique, yukselt, ek, deger }));
  console.log(`${Object.keys(ek).length} eşyada ek bilgi, ${unique.length} unique eşya, ${Object.keys(deger).length} +N eşyada gerçek değer -> ${path.join(hedef, 'ek.json')}`);
  return 0;
}

if (process.argv[1]?.endsWith('esya-ek.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
