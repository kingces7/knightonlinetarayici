// TEXT_PACKETS (sunucu mesajları) ve QUEST_TALK_US içindeki bozuk (0x80+ bayt) simge baytlarını temizler; %s/%d kodları ve ASCII metin korunur.
// Kural: iki harf arasındaki bozuk dizi tek tırnak (Islante??s → Islante's), diğer bozuk diziler silinir; geriye anlamlı metin kalmazsa satır boşaltılır.
//   node sunucu/bozuk-metin-temizle.ts --dene   → yalnız listeler;  parametresiz → yedekleyip uygular (TEXT_PACKETS_YEDEK_BOZUK, QUEST_TALK_US_YEDEK_BOZUK)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sqlSorgu, SQL_SUNUCU, SQL_VERITABANI } from '../tarama/sql.ts';

const HEDEFLER = [
  { tablo: 'TEXT_PACKETS', anahtar: 'ID', metin: '[text]', tip: 'varchar(2000)', yedek: 'TEXT_PACKETS_YEDEK_BOZUK' },
  { tablo: 'QUEST_TALK_US', anahtar: 'iNum', metin: 'strTalk', tip: 'char(1000)', yedek: 'QUEST_TALK_US_YEDEK_BOZUK', kayik: true },
];

const harf = (b: number | undefined) => b !== undefined && ((b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a));

// kayik: QUEST_TALK_US'ta kesme işareti bozulurken sonraki harf bir eksik kodlanmış (that¤r = that's, can¤s = can't, you¤qe = you're, I¤ue = I've, we¤kl = we'll)
function temizle(bayt: number[], kayik = false): number[] {
  const cikti: number[] = [];
  for (let i = 0; i < bayt.length;) {
    if (bayt[i] < 0x80) { cikti.push(bayt[i++]); continue; }
    let j = i; while (j < bayt.length && bayt[j] >= 0x80) j++;
    if (kayik && harf(cikti[cikti.length - 1]) && bayt[j] >= 0x61 && bayt[j] <= 0x7a) { cikti.push(0x27, bayt[j] + 1); i = j + 1; continue; }
    if (harf(cikti[cikti.length - 1]) && harf(bayt[j])) cikti.push(0x27); // harf ?? harf → '
    i = j;
  }
  // bozuk dizi silinince kalan "?" / "@" artıkları ve çift boşluk
  let s = Buffer.from(cikti).toString('latin1');
  s = s.replace(/^[@?\s]+(?=%|[A-Za-z<])/, '').replace(/ +$/, (m) => (m.length > 1 && /[\r\n]/.test(s) ? m : ''));
  if (!/[A-Za-z]{3,}/.test(s)) s = ''; // "s", "(?)" gibi anlamsız artıklar
  return [...Buffer.from(s, 'latin1')];
}

function main(): number {
  const dene = process.argv.includes('--dene');
  const sql: string[] = ['SET NOCOUNT ON;'];
  let toplam = 0;
  for (const h of HEDEFLER) {
    const satirlar = sqlSorgu(`SELECT ${h.anahtar}, CONVERT(varchar(max), CAST(${h.metin} AS varbinary(max)), 2) FROM ${h.tablo}`);
    const degisen: { id: string; once: string; yeni: number[] }[] = [];
    for (const [id, hex] of satirlar) {
      const bayt = [...Buffer.from(hex ?? '', 'hex')];
      if (!bayt.some((b) => b >= 0x80)) continue;
      degisen.push({ id, once: Buffer.from(bayt).toString('latin1'), yeni: temizle(bayt, h.kayik) });
    }
    console.log(`${h.tablo}: ${degisen.length} bozuk satır`);
    for (const d of degisen) console.log(`  ${d.id}: ${JSON.stringify(d.once.replace(/[\x80-\xff]+/g, '¤').slice(0, 90))} → ${JSON.stringify(Buffer.from(d.yeni).toString('latin1').slice(0, 90))}`);
    if (!degisen.length) continue;
    toplam += degisen.length;
    sql.push(`IF OBJECT_ID('${h.yedek}') IS NULL SELECT * INTO ${h.yedek} FROM ${h.tablo};`);
    for (const d of degisen) sql.push(`UPDATE ${h.tablo} SET ${h.metin} = CAST(0x${Buffer.from(d.yeni).toString('hex') || '20'} AS varbinary(max)) WHERE ${h.anahtar} = ${Number(d.id)};`);
  }
  if (dene || !toplam) return 0;
  const dosya = path.join(os.tmpdir(), 'bozuk-metin-temizle.sql');
  fs.writeFileSync(dosya, sql.join('\n'), 'utf8');
  const r = spawnSync('sqlcmd', ['-S', SQL_SUNUCU, '-E', '-C', '-b', '-d', SQL_VERITABANI, '-f', '65001', '-i', dosya], { encoding: 'utf8' });
  fs.rmSync(dosya, { force: true });
  console.log(`${r.stdout}${r.stderr}`.trim() || `${toplam} satır güncellendi`);
  return r.status ?? 1;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
