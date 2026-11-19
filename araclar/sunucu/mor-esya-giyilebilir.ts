// Mor ("Upgrade Item") giyilebilir eşyaların stat/seviye şartlarını client tablosundaki (ipucunda gösterilen) değere indirir.
// Sorun: veritabanında +N eşyanın şartı her seviyede artıyordu (Hand Axe(+6): Str 98) ama client taban eşyanın şartını gösteriyordu (78);
// oyuncu ipucuna göre giyebilir sanıp sunucudan ret alıyordu. Şart yalnız düşürülür, hiçbir zaman artırılmaz.
//   node sunucu/mor-esya-giyilebilir.ts          -> uygular (yedek: ITEM_GEREKSINIM_YEDEK_20261119; ITEM değişince GameServer yeniden başlatılmalı)
//   node sunucu/mor-esya-giyilebilir.ts --dene   -> yalnız sayar
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { sqlSorgu, SQL_SUNUCU, SQL_VERITABANI } from '../tarama/sql.ts';

const GIYILEBILIR_TURLER = '11,21,22,31,32,41,42,51,52,60,70,71,91,92,93,94,110,181,210,220,230,240';

interface Tanim { no: number; gerekSeviye: number; gerekGuc: number; gerekSta: number; gerekCev: number; gerekZeka: number; gerekBuyu: number }

function main(): number {
  const dene = process.argv.includes('--dene');
  const tum: Tanim[] = JSON.parse(fs.readFileSync(path.join(CIKTI_DIZINI, 'web', 'esya', 'tum.json'), 'utf8'));
  const tablo = new Map(tum.map((e) => [e.no, e]));
  const satirlar = sqlSorgu(`SELECT Num, CAST(ReqStr AS int), CAST(ReqSta AS int), CAST(ReqDex AS int), CAST(ReqIntel AS int), CAST(ReqCha AS int), CAST(ReqLevel AS int)
    FROM ITEM WHERE LEN(ISNULL(strName, '')) > 0 AND Kind IN (${GIYILEBILIR_TURLER}) AND Num % 10 > 0 AND ItemType <> 4`);
  const degisecek: number[][] = [];
  let tabloda_yok = 0;
  for (const s of satirlar) {
    const [num, str, sta, dex, zek, cha, sev] = s.map(Number);
    const e = tablo.get(Math.floor(num / 1000) * 1000);
    if (!e) { tabloda_yok++; continue; }
    if (str > e.gerekGuc || sta > e.gerekSta || dex > e.gerekCev || zek > e.gerekZeka || cha > e.gerekBuyu || sev > e.gerekSeviye) {
      degisecek.push([num, e.gerekGuc, e.gerekSta, e.gerekCev, e.gerekZeka, e.gerekBuyu, e.gerekSeviye]);
    }
  }
  console.log(`${satirlar.length} mor giyilebilir eşya, ${degisecek.length} tanesinin şartı client ipucundan yüksek (client tablosunda olmayan: ${tabloda_yok})`);
  if (dene) return 0;
  if (!degisecek.length) return 0;

  const sql: string[] = ['SET NOCOUNT ON;', 'CREATE TABLE #T (Num int PRIMARY KEY, s int, sta int, d int, z int, c int, lv int);'];
  for (let i = 0; i < degisecek.length; i += 1000) {
    sql.push(`INSERT INTO #T VALUES ${degisecek.slice(i, i + 1000).map((r) => `(${r.join(',')})`).join(',')};`);
  }
  sql.push(
    `IF OBJECT_ID('ITEM_GEREKSINIM_YEDEK_20261119') IS NULL SELECT i.Num, i.ReqStr, i.ReqSta, i.ReqDex, i.ReqIntel, i.ReqCha, i.ReqLevel INTO ITEM_GEREKSINIM_YEDEK_20261119 FROM ITEM i JOIN #T t ON t.Num = i.Num;`,
    `UPDATE i SET ReqStr = IIF(t.s < i.ReqStr, t.s, i.ReqStr), ReqSta = IIF(t.sta < i.ReqSta, t.sta, i.ReqSta), ReqDex = IIF(t.d < i.ReqDex, t.d, i.ReqDex),
       ReqIntel = IIF(t.z < i.ReqIntel, t.z, i.ReqIntel), ReqCha = IIF(t.c < i.ReqCha, t.c, i.ReqCha), ReqLevel = IIF(t.lv < i.ReqLevel, t.lv, i.ReqLevel)
     FROM ITEM i JOIN #T t ON t.Num = i.Num;`,
    'SELECT @@ROWCOUNT;',
  );
  const dosya = path.join(os.tmpdir(), 'mor-esya-giyilebilir.sql');
  fs.writeFileSync(dosya, sql.join('\n'), 'utf8');
  const r = spawnSync('sqlcmd', ['-S', SQL_SUNUCU, '-E', '-C', '-b', '-d', SQL_VERITABANI, '-f', '65001', '-i', dosya], { encoding: 'utf8' });
  fs.rmSync(dosya, { force: true });
  console.log(`${r.stdout}${r.stderr}`.trim());
  return r.status ?? 1;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
