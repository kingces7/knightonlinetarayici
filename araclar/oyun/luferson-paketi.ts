// Luferson Castle paketi (sunucu bölgesi 1 / client bölge 10, "karus2004"): bölgeye ait her şeyin tek klasörde (luferson/) döküm ve düzenleme alanı.
//   node araclar/oyun/luferson-paketi.ts      (SQL Server'daki LILITH_MYKO veritabanı ve oyun client klasörü gerekir)
// Çıktılar (luferson/):
//   istemci-dosyalari.csv  — client'ta bu haritaya ait grafik/harita/gökyüzü/ses dosyaları (yol, tür, boyut)
//   sunucu-dosyalari.csv   — sunucunun kullandığı harita (.smd) ve olay dosyaları
//   canavarlar.csv         — bölge 1'deki canavarlar (K_NPCPOS1098 + K_MONSTER)
//   drop-listesi.csv       — canavar başına düşme tablosu
//   npc-listesi.csv        — bölge 1'deki dost NPC'ler
//   NOTLAR.md              — kullanıcının elle düzenlediği notlar (bu betik üzerine yazmaz)
// Oyunun kendi dosyaları kopyalanmaz; yalnızca yollar, adlar ve değerler yazılır.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { OYUN_DIZINI, DEPO_KOKU, CIKTI_DIZINI } from '../ortak/yollar.ts';

const CIKTI = path.join(DEPO_KOKU, 'luferson'), BOLGE = 1, ISTEMCI_BOLGE = 10;
const SUNUCU_CALISTIR = path.join(DEPO_KOKU, 'oyun-dosyalari', 'derleme', 'calistir');
const SERVER = '.' + String.fromCharCode(92) + 'SQLEXPRESS';
function sorgu(q: string): string[][] {
  const c = execFileSync('sqlcmd', ['-S', SERVER, '-E', '-d', 'LILITH_MYKO', '-h', '-1', '-W', '-s', '|', '-Q', 'SET NOCOUNT ON; ' + q], { encoding: 'utf8', maxBuffer: 1 << 27 });
  return c.split(/\r?\n/).filter((x) => x.trim()).map((x) => x.split('|').map((y) => y.trim()));
}
const csv = (s: (string | number)[][]) => s.map((r) => r.map((x) => { const t = String(x); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(',')).join('\n') + '\n';
const boyut = (y: string): number | '' => { try { return fs.statSync(y).size; } catch { return ''; } };
fs.mkdirSync(CIKTI, { recursive: true });

// ---- client dosyaları
const yollar = new Map<string, string>(); // yol (client'a göre, / ile) -> tür
const ekle = (yol: string, tur: string) => { const y = yol.trim().replace(/\\/g, '/'); if (y && !yollar.has(y.toLowerCase())) yollar.set(y.toLowerCase(), `${tur}|${y}`); };
const zoneSatiri = fs.readFileSync(path.join(CIKTI_DIZINI, 'tablolar', 'Data', 'Zones.csv'), 'utf8').split('\n').find((s) => s.startsWith(`${ISTEMCI_BOLGE},`));
if (zoneSatiri) for (const a of zoneSatiri.replace(/"/g, '').split(',')) if (/\.[A-Za-z0-9]{2,8}$/.test(a.trim()) && /[\\/]/.test(a)) ekle(a, 'bölge tablosu (Zones.csv)');
for (const d of fs.readdirSync(path.join(OYUN_DIZINI, 'Zones'))) if (/^(karus2004|karus 2004|karus_start|old_karus)\./i.test(d) || d === '1.mob') ekle(`Zones/${d}`, d.endsWith('.mob') ? 'canavar/NPC yerleşimi' : 'harita');
for (const d of fs.readdirSync(path.join(OYUN_DIZINI, 'Misc', 'Sky'))) if (/karus/i.test(d)) ekle(`Misc/Sky/${d}`, 'gökyüzü');
ekle('Snd/1_karus.ogg', 'müzik');
const istemci: (string | number)[][] = [['yol', 'tür', 'var_mı', 'boyut_bayt']];
for (const v of [...yollar.values()].sort()) { const [tur, yol] = v.split('|'); const b = boyut(path.join(OYUN_DIZINI, yol)); istemci.push([yol, tur, b === '' ? 'hayır' : 'evet', b]); }
fs.writeFileSync(path.join(CIKTI, 'istemci-dosyalari.csv'), csv(istemci));

// ---- sunucu dosyaları
const sunucu: (string | number)[][] = [['yol', 'tür', 'boyut_bayt']];
const haritaKlasoru = path.join(SUNUCU_CALISTIR, 'Map');
for (const d of fs.existsSync(haritaKlasoru) ? fs.readdirSync(haritaKlasoru) : []) if (/karus/i.test(d)) sunucu.push([`Map/${d}`, 'sunucu haritası (.smd)', boyut(path.join(haritaKlasoru, d))]);
for (const d of ['1.aievt']) if (fs.existsSync(path.join(haritaKlasoru, d))) sunucu.push([`Map/${d}`, 'yapay zekâ olayları', boyut(path.join(haritaKlasoru, d))]);
fs.writeFileSync(path.join(CIKTI, 'sunucu-dosyalari.csv'), csv(sunucu));

// ---- canavarlar ve drop
const slotlar = sorgu(`SELECT p.NpcID, p.NumNPC, p.iRange, p.LeftX, p.TopZ, p.RegTime FROM K_NPCPOS1098 p JOIN K_MONSTER m ON m.sSid = p.NpcID WHERE p.ZoneID = ${BOLGE} ORDER BY p.NpcID`);
const m = new Map(sorgu(`SELECT sSid, strName, sPid, sSize, sLevel, iHpPoint, sAc, sDamage, sAttackDelay, iExp, iMoney, sItem, byActType FROM K_MONSTER WHERE sSid IN (SELECT NpcID FROM K_NPCPOS1098 WHERE ZoneID = ${BOLGE})`).map((r) => [Number(r[0]), r] as const));
const toplam = new Map<number, { slot: number; adet: number; yer: string[]; reg: string }>();
for (const r of slotlar) { const [sid, adet, , x, z, reg] = r; const k = toplam.get(Number(sid)) ?? { slot: 0, adet: 0, yer: [], reg }; k.slot++; k.adet += Number(adet); k.yer.push(`${x}:${z}`); toplam.set(Number(sid), k); }
const can: (string | number)[][] = [['sid', 'ad', 'model', 'boyut', 'seviye', 'hp', 'savunma', 'hasar', 'saldiri_gecikmesi', 'exp', 'altin', 'davranis', 'slot_sayisi', 'toplam_adet', 'dogus_sn', 'slot_konumlari']];
for (const [sid, k] of [...toplam].sort((a, b) => Number(m.get(a[0])?.[4] ?? 0) - Number(m.get(b[0])?.[4] ?? 0))) { const r = m.get(sid); if (r) can.push([sid, r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[12], k.slot, k.adet, k.reg, k.yer.join(' ')]); }
fs.writeFileSync(path.join(CIKTI, 'canavarlar.csv'), csv(can));

const esyalar = new Map<number, string>((JSON.parse(fs.readFileSync(path.join(CIKTI_DIZINI, 'web', 'esya', 'tum.json'), 'utf8')) as { no: number; ad: string }[]).map((e) => [e.no, e.ad] as const));
const drop: (string | number)[][] = [['canavar_sid', 'canavar', 'esya_no', 'esya_adi', 'yuzde']];
for (const [sid] of toplam) {
  const r = m.get(sid); if (!r) continue;
  const d = sorgu(`SELECT * FROM K_MONSTER_ITEM WHERE sIndex = ${r[11]}`)[0]; if (!d) continue;
  for (let i = 0; i < 12; i++) { const no = Number(d[1 + i * 2]), pay = Number(d[2 + i * 2]); if (!no || !pay) continue; drop.push([sid, r[1], no, no < 100000000 ? `(rastgele eşya grubu ${no})` : (esyalar.get(no) ?? 'bilinmiyor'), (pay / 100).toFixed(2) + '%']); }
}
fs.writeFileSync(path.join(CIKTI, 'drop-listesi.csv'), csv(drop));

// ---- dost NPC'ler
const npc = sorgu(`SELECT n.sSid, n.strName, p.LeftX, p.TopZ FROM K_NPCPOS1098 p JOIN K_NPC n ON n.sSid = p.NpcID WHERE p.ZoneID = ${BOLGE} ORDER BY n.sSid`);
fs.writeFileSync(path.join(CIKTI, 'npc-listesi.csv'), csv([['sid', 'ad', 'x', 'z'], ...npc]));

const notlar = path.join(CIKTI, 'NOTLAR.md');
if (!fs.existsSync(notlar)) fs.writeFileSync(notlar, `# Luferson Castle — notlar\n\nBu dosyayı elle düzenleyin; betik üzerine yazmaz. Yapılacaklar, kararlar ve eklenecek içerik buraya yazılır.\n`);
fs.writeFileSync(path.join(CIKTI, 'README.md'), `# Luferson Castle paketi\n\nSunucu bölgesi ${BOLGE} (client bölgesi ${ISTEMCI_BOLGE}, harita "karus2004"). \`node araclar/oyun/luferson-paketi.ts\` ile üretilir; CSV'ler her çalıştırmada yenilenir, \`NOTLAR.md\` yenilenmez.\n\n| Dosya | İçerik |\n|---|---|\n| istemci-dosyalari.csv | ${istemci.length - 1} client dosyası (harita, gökyüzü, müzik) |\n| sunucu-dosyalari.csv | ${sunucu.length - 1} sunucu dosyası |\n| canavarlar.csv | ${can.length - 1} canavar türü, ${[...toplam.values()].reduce((a, b) => a + b.adet, 0)} canavar |\n| drop-listesi.csv | ${drop.length - 1} düşme kaydı |\n| npc-listesi.csv | ${npc.length} NPC kaydı |\n| NOTLAR.md | elle tutulan notlar |\n\nOyunun kendi dosyaları bu klasöre kopyalanmaz (depoya girmez); yalnızca yollar ve değerler listelenir.\n`);
console.log(`luferson/: client dosyası ${istemci.length - 1}, sunucu dosyası ${sunucu.length - 1}, canavar türü ${can.length - 1}, drop ${drop.length - 1}, NPC ${npc.length}`);
