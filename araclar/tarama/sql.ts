// SQL Server (LILITH_MYKO) sorguları. sqlcmd ile çalışır; ek bağımlılık gerekmez.
// Sunucu/veritabanı adı KE_SQL_SUNUCU ve KE_SQL_VERITABANI ortam değişkenleriyle değiştirilebilir.
import { spawnSync } from 'node:child_process';

const AYIRICI = '\x1f';
export const SQL_SUNUCU = process.env.KE_SQL_SUNUCU ?? '.\\SQLEXPRESS';
export const SQL_VERITABANI = process.env.KE_SQL_VERITABANI ?? 'LILITH_MYKO';

/** Sorguyu çalıştırır, satırları hücre dizisi olarak döner. NULL hücreler boş yazıdır. Hata olursa fırlatır. */
export function sqlSorgu(sorgu: string): string[][] {
  const r = spawnSync(
    'sqlcmd',
    ['-S', SQL_SUNUCU, '-E', '-C', '-b', '-d', SQL_VERITABANI, '-f', '65001', '-h', '-1', '-W', '-s', AYIRICI, '-Q', `SET NOCOUNT ON; ${sorgu}`],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
  );
  if (r.error) throw new Error(`sqlcmd çalıştırılamadı: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`SQL hatası: ${`${r.stdout}${r.stderr}`.trim().slice(0, 400)}`);
  return r.stdout
    .split(/\r?\n/)
    .filter((satir) => satir.length > 0)
    .map((satir) => satir.split(AYIRICI).map((h) => (h === 'NULL' ? '' : h)));
}

/** Tek sayı döndüren sorgu (ör. SELECT COUNT(*) ...). */
export function sqlSayi(sorgu: string): number {
  const satirlar = sqlSorgu(sorgu);
  const n = Number(satirlar[0]?.[0]);
  if (!Number.isFinite(n)) throw new Error(`Sayı beklenirken başka bir şey döndü: ${JSON.stringify(satirlar[0])}`);
  return n;
}

/** Bir "FROM ... WHERE ..." parçası için kayıt sayısı ve örnek satırlar. ornekSutun tek bir yazı ifadesi olmalı. */
export function sayVeOrnekle(from: string, ornekSutun: string, ornekAdedi = 8): { sayi: number; ornekler: string[] } {
  const sayi = sqlSayi(`SELECT COUNT(*) ${from}`);
  const ornekler = sayi > 0 ? sqlSorgu(`SELECT TOP ${ornekAdedi} ${ornekSutun} ${from}`).map((s) => s[0] ?? '') : [];
  return { sayi, ornekler };
}
