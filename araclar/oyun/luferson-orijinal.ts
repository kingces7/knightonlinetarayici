// Luferson Castle'ın ORİJİNAL canavar/NPC yerleşimi: resmî 1298 veritabanı (KN_online.K_NPCPOS bölge 1) ile Myko (LILITH_MYKO.K_NPCPOS1098 bölge 1) karşılaştırması.
//   node araclar/oyun/luferson-orijinal.ts            -> luferson/canavarlar-orijinal.csv
//   node araclar/oyun/luferson-orijinal.ts 2 elmorad-canavarlar-orijinal.csv   (başka bölge: numara, çıktı dosyası; luferson/ klasörüne yazar)
// Sütunlar: sid, ad, tur, x, z, x2, z2 (doğuş dikdörtgeni; orijinalde aralık = x..x2, z..z2), adet, dogus_sn, durum, mob_listesinde
// durum: "aynı" (Myko'da aynı sid ve aynı koordinat var), "koordinat farklı" (Myko'da bu sid bölge 1'de var ama bu noktada yok), "Myko'da yok" (sid hiç yok).
// Koordinatlar ORİJİNALDEN alınır, değiştirilmez. Veritabanına bu betik YAZMAZ.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DEPO_KOKU } from '../ortak/yollar.ts';

const BOLGE = process.argv[2] ?? '1', CIKTI = process.argv[3] ?? 'canavarlar-orijinal.csv';
const SERVER = '.' + String.fromCharCode(92) + 'SQLEXPRESS';
const sorgu = (db: string, q: string): string[][] => execFileSync('sqlcmd', ['-S', SERVER, '-E', '-d', db, '-h', '-1', '-W', '-s', '|', '-Q', 'SET NOCOUNT ON; ' + q], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split(/\r?\n/).filter((x) => x.trim()).map((x) => x.split('|').map((y) => y.trim()));
const csv = (s: (string | number)[]) => s.map((x) => { const t = String(x); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(',');

const adlar = new Map<number, string>();
for (const t of ['K_NPC', 'K_MONSTER']) { try { for (const r of sorgu('KN_online', `SELECT sSid, strName FROM ${t}`)) if (!adlar.has(Number(r[0]))) adlar.set(Number(r[0]), r[1]); } catch { /* tablo yok */ } }
const mykoAd = new Map<number, string>([...sorgu('LILITH_MYKO', 'SELECT sSid, strName FROM K_MONSTER'), ...sorgu('LILITH_MYKO', 'SELECT sSid, strName FROM K_NPC')].map((r) => [Number(r[0]), r[1]] as const));
const mykoYer = new Set(sorgu('LILITH_MYKO', `SELECT NpcID, LeftX, TopZ FROM K_NPCPOS1098 WHERE ZoneID = ${BOLGE}`).map((r) => `${r[0]}:${r[1]}:${r[2]}`));
const mykoSid = new Set(sorgu('LILITH_MYKO', `SELECT NpcID FROM K_NPCPOS1098 WHERE ZoneID = ${BOLGE}`).map((r) => Number(r[0])));
const mobYolu = path.join(DEPO_KOKU, 'luferson', 'mob-listesi.csv');
const mobta = new Set(BOLGE === '1' && fs.existsSync(mobYolu) ? fs.readFileSync(mobYolu, 'utf8').split('\n').slice(1).map((l) => Number(l.split(',')[0])).filter(Boolean) : []);

const satirlar = [csv(['sid', 'ad', 'tur', 'x', 'z', 'x2', 'z2', 'adet', 'dogus_sn', 'durum', 'mob_listesinde'])];
const sayac: Record<string, number> = {};
for (const r of sorgu('KN_online', `SELECT NpcID, LeftX, TopZ, RightX, BottomZ, NumNPC, RegTime FROM K_NPCPOS WHERE ZoneID = ${BOLGE} ORDER BY NpcID, LeftX, TopZ`)) {
  const sid = Number(r[0]), durum = mykoYer.has(`${sid}:${r[1]}:${r[2]}`) ? 'aynı' : mykoSid.has(sid) ? 'koordinat farklı' : "Myko'da yok";
  sayac[durum] = (sayac[durum] ?? 0) + 1;
  const tur = sid >= 10000 ? 'npc' : 'canavar';
  satirlar.push(csv([sid, adlar.get(sid) ?? mykoAd.get(sid) ?? '', tur, r[1], r[2], r[3], r[4], r[5], r[6], durum, BOLGE !== '1' ? 'bilinmiyor' : mobta.has(sid) ? 'evet' : 'hayır']));
}
fs.writeFileSync(path.join(DEPO_KOKU, 'luferson', CIKTI), satirlar.join('\n') + '\n');
console.log(`luferson/${CIKTI}: ${satirlar.length - 1} yerleşim`, JSON.stringify(sayac));
