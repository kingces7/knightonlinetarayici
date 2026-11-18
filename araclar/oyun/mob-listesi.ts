// Bir bölgenin .mob dosyasını (client: Zones/<n>.mob = bölgede yüklenecek canavar/NPC numaraları, konum YOK) okuyup sunucu verisiyle karşılaştırır.
//   node araclar/oyun/mob-listesi.ts 1 1 luferson        (mob dosyası no, sunucu bölgesi, çıktı klasörü)
// Çıktı: <klasör>/mob-listesi.csv  sid, ad, tur (canavar/NPC), sunucuda_var_mi, sunucudaki_slot_sayisi, toplam_adet, ornek_konum
// Biçim: int32 sürüm (1), int32 adet, sonra adet × int32 numara (docs/formatlar/README.md).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { OYUN_DIZINI, DEPO_KOKU } from '../ortak/yollar.ts';

const [mobNo = '1', bolge = '1', klasor = 'luferson'] = process.argv.slice(2);
const b = fs.readFileSync(path.join(OYUN_DIZINI, 'Zones', `${mobNo}.mob`));
const surum = b.readInt32LE(0), adet = b.readInt32LE(4);
const idler = Array.from({ length: adet }, (_, i) => b.readInt32LE(8 + i * 4));
if (b.length !== 8 + adet * 4) console.log(`uyarı: dosya boyu beklenenden farklı (${b.length} ≠ ${8 + adet * 4})`);

const SERVER = '.' + String.fromCharCode(92) + 'SQLEXPRESS';
const sorgu = (q: string): string[][] => execFileSync('sqlcmd', ['-S', SERVER, '-E', '-d', 'LILITH_MYKO', '-h', '-1', '-W', '-s', '|', '-Q', 'SET NOCOUNT ON; ' + q], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split(/\r?\n/).filter((x) => x.trim()).map((x) => x.split('|').map((y) => y.trim()));
const canavar = new Map(sorgu('SELECT sSid, strName FROM K_MONSTER').map((r) => [Number(r[0]), r[1]] as const));
const npc = new Map(sorgu('SELECT sSid, strName FROM K_NPC').map((r) => [Number(r[0]), r[1]] as const));
const slot = new Map<number, { slot: number; adet: number; yer: string }>();
for (const r of sorgu(`SELECT NpcID, NumNPC, LeftX, TopZ FROM K_NPCPOS1098 WHERE ZoneID = ${bolge}`)) {
  const k = slot.get(Number(r[0])) ?? { slot: 0, adet: 0, yer: `${r[2]}:${r[3]}` }; k.slot++; k.adet += Number(r[1]); slot.set(Number(r[0]), k);
}
const csv = (s: (string | number)[]) => s.map((x) => { const t = String(x); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(',');
const satirlar = [csv(['sid', 'ad', 'tur', 'sunucuda_var_mi', 'sunucudaki_slot_sayisi', 'toplam_adet', 'ornek_konum'])];
let var_ = 0;
for (const id of idler) {
  const s = slot.get(id), ad = canavar.get(id) ?? npc.get(id) ?? '', tur = canavar.has(id) ? 'canavar' : npc.has(id) ? 'npc' : 'tanimsiz';
  if (s) var_++;
  satirlar.push(csv([id, ad, tur, s ? 'evet' : 'hayır', s?.slot ?? 0, s?.adet ?? 0, s?.yer ?? '']));
}
const hedef = path.join(DEPO_KOKU, klasor); fs.mkdirSync(hedef, { recursive: true });
fs.writeFileSync(path.join(hedef, 'mob-listesi.csv'), satirlar.join('\n') + '\n');
console.log(`${mobNo}.mob: sürüm ${surum}, ${adet} numara; sunucuda (bölge ${bolge}) yerleşimi olan: ${var_}, olmayan: ${adet - var_} -> ${klasor}/mob-listesi.csv`);
