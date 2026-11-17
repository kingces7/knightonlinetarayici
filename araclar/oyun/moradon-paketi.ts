// Moradon paketi: Moradon'a ait her şeyin tek klasörde (moradon/) toplanmış, okunabilir dökümü.
//   node araclar/oyun/moradon-paketi.ts      (SQL Server'daki LILITH_MYKO veritabanı ve donusturulmus/ klasörü gerekir)
// Çıktılar (moradon/):
//   gorunum-paketleri.json — Moradon'un görünümü için gereken web dosyaları (harita, karakter/canavar/NPC modelleri, eşya simgeleri, ses) ve boyutları
//   canavarlar.csv         — Moradon'daki tüm canavarlar (K_NPCPOS1098 bölge 21 + K_MONSTER): değerler, slot ve adet
//   drop-listesi.csv       — canavar başına düşme tablosu (K_MONSTER_ITEM): eşya adı, yüzde
//   npc-listesi.csv        — Moradon'daki dost NPC adları ve konumları
//   bosslar.csv            — Moradon boss'ları (Dragon Tooth Boss, Kecoon Boss)
// Oyunun kendi dosyaları kopyalanmaz; yalnızca adlar, değerler ve yol listeleri yazılır.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const KOK = path.resolve(import.meta.dirname, '..', '..'), WEB = path.join(KOK, 'donusturulmus', 'web'), CIKTI = path.join(KOK, 'moradon');
const SERVER = '.' + String.fromCharCode(92) + 'SQLEXPRESS';
function sorgu(q: string): string[][] {
  const c = execFileSync('sqlcmd', ['-S', SERVER, '-E', '-d', 'LILITH_MYKO', '-h', '-1', '-W', '-s', '|', '-Q', 'SET NOCOUNT ON; ' + q], { encoding: 'utf8', maxBuffer: 1 << 27 });
  return c.split(/\r?\n/).filter((x) => x.trim()).map((x) => x.split('|').map((y) => y.trim()));
}
const csv = (satirlar: (string | number)[][]) => satirlar.map((s) => s.map((x) => { const t = String(x); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(',')).join('\n') + '\n';
fs.mkdirSync(CIKTI, { recursive: true });

const esyalar = new Map<number, { ad: string; simge: string }>((JSON.parse(fs.readFileSync(path.join(WEB, 'esya', 'tum.json'), 'utf8')) as { no: number; ad: string; simge: string }[]).map((e) => [e.no, { ad: e.ad, simge: e.simge }] as const));

// ---- canavarlar
const slotlar = sorgu('SELECT p.NpcID, p.NumNPC, p.iRange, p.LeftX, p.TopZ, p.RegTime, p.ActType FROM K_NPCPOS1098 p JOIN K_MONSTER m ON m.sSid = p.NpcID WHERE p.ZoneID = 21 ORDER BY p.NpcID');
const m = new Map(sorgu('SELECT sSid, strName, sPid, sSize, sLevel, iHpPoint, sAc, sDamage, sAttackDelay, iExp, iMoney, sItem, byActType FROM K_MONSTER WHERE sSid IN (SELECT NpcID FROM K_NPCPOS1098 WHERE ZoneID = 21)').map((r) => [Number(r[0]), r] as const));
const toplam = new Map<number, { slot: number; adet: number; yer: string[]; reg: string }>();
for (const r of slotlar) { const [sid, adet, , x, z, reg] = r; const k = toplam.get(Number(sid)) ?? { slot: 0, adet: 0, yer: [], reg }; k.slot++; k.adet += Number(adet); k.yer.push(`${x}:${z}`); toplam.set(Number(sid), k); }
const canavarSatirlari: (string | number)[][] = [['sid', 'ad', 'model', 'boyut', 'seviye', 'hp', 'savunma', 'hasar', 'saldiri_gecikmesi', 'exp', 'altin', 'davranis', 'slot_sayisi', 'toplam_adet', 'dogus_sn', 'slot_konumlari']];
for (const [sid, k] of [...toplam].sort((a, b) => Number(m.get(a[0])?.[4] ?? 0) - Number(m.get(b[0])?.[4] ?? 0))) { const r = m.get(sid); if (!r) continue; canavarSatirlari.push([sid, r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[12], k.slot, k.adet, k.reg, k.yer.join(' ')]); }
fs.writeFileSync(path.join(CIKTI, 'canavarlar.csv'), csv(canavarSatirlari));

// ---- drop listesi
const dropSatirlari: (string | number)[][] = [['canavar_sid', 'canavar', 'esya_no', 'esya_adi', 'yuzde']];
for (const [sid] of toplam) {
  const r = m.get(sid); if (!r) continue;
  const d = sorgu(`SELECT * FROM K_MONSTER_ITEM WHERE sIndex = ${r[11]}`)[0]; if (!d) continue;
  for (let i = 0; i < 12; i++) { const no = Number(d[1 + i * 2]), pay = Number(d[2 + i * 2]); if (!no || !pay) continue; dropSatirlari.push([sid, r[1], no, no < 100000000 ? `(rastgele eşya grubu ${no})` : (esyalar.get(no)?.ad ?? 'bilinmiyor'), (pay / 100).toFixed(2) + '%']); }
}
fs.writeFileSync(path.join(CIKTI, 'drop-listesi.csv'), csv(dropSatirlari));

// ---- NPC listesi
const npc = JSON.parse(fs.readFileSync(path.join(WEB, 'harita', '14th_oldmoradon', 'npc.json'), 'utf8')).npc as { sid: number; ad: string; x: number; z: number; tur: number; model: number; satis: number }[];
fs.writeFileSync(path.join(CIKTI, 'npc-listesi.csv'), csv([['sid', 'ad', 'tur', 'model', 'satis_grubu', 'x', 'z'], ...npc.map((n) => [n.sid, n.ad, n.tur, n.model, n.satis, Math.round(n.x), Math.round(n.z)])]));

// ---- bosslar
const bosslar: (string | number)[][] = [['sid', 'ad', 'model', 'seviye', 'hp', 'savunma', 'hasar', 'boyut', 'dogus_sn', 'konum']];
for (const sid of [32600, 32601]) {
  const r = sorgu(`SELECT sSid, strName, sPid, sLevel, iHpPoint, sAc, sDamage, sSize FROM K_MONSTER WHERE sSid = ${sid}`)[0], p = sorgu(`SELECT RegTime, LeftX, TopZ FROM K_NPCPOS1098 WHERE NpcID = ${sid} AND ZoneID = 21`)[0];
  if (r && p) bosslar.push([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], p[0], `${p[1]}:${p[2]}`]);
}
fs.writeFileSync(path.join(CIKTI, 'bosslar.csv'), csv(bosslar));

// ---- görünüm paketleri
const boyut = (y: string) => { try { return fs.statSync(path.join(WEB, y)).size; } catch { return null; } };
const dosya = (y: string) => ({ yol: y.split(path.sep).join('/'), boyut: boyut(y) });
const liste = (dizin: string) => { const t = path.join(WEB, dizin); return fs.existsSync(t) ? fs.readdirSync(t, { recursive: true, withFileTypes: true }).filter((d) => d.isFile()).map((d) => dosya(path.join(dizin, path.relative(t, path.join(d.parentPath, d.name))))) : []; };
const modeller = [...new Set([...slotlar.map((r) => Number(m.get(Number(r[0]))?.[2])), ...npc.map((n) => n.model), 1102, 100])].filter(Boolean).sort((a, b) => a - b);
const ikonlar = new Set<string>(); for (const s of dropSatirlari.slice(1)) { const e = esyalar.get(Number(s[2])); if (e?.simge) ikonlar.add(e.simge); }
const paket = {
  aciklama: "Moradon'un tarayıcıda görünmesi için gereken web dosyaları (donusturulmus/web altındaki yollar). Oyunun orijinal dosyaları değil, bizim dönüştürdüğümüz çıktılardır.",
  harita: liste(path.join('harita', '14th_oldmoradon')),
  karakter_modelleri: modeller.map((no) => dosya(path.join('karakter', `${no}.glb`))),
  esya_simgeleri_drop: [...ikonlar].map((s) => dosya(path.join('esya', s))),
  ses: [dosya(path.join('ses', 'ses.json'))],
};
fs.writeFileSync(path.join(CIKTI, 'gorunum-paketleri.json'), JSON.stringify(paket, null, 1));
fs.writeFileSync(path.join(CIKTI, 'README.md'), `# Moradon paketi\n\nBu klasör \`node araclar/oyun/moradon-paketi.ts\` ile üretilir (elle düzenlemeyin).\n\n| Dosya | İçerik |\n|---|---|\n| gorunum-paketleri.json | Moradon görünümü için web dosyaları: harita, ${modeller.length} model, ${ikonlar.size} drop simgesi |\n| canavarlar.csv | ${canavarSatirlari.length - 1} canavar türü, ${[...toplam.values()].reduce((a, b) => a + b.adet, 0)} canavar |\n| drop-listesi.csv | ${dropSatirlari.length - 1} düşme kaydı |\n| npc-listesi.csv | ${npc.length} NPC |\n| bosslar.csv | ${bosslar.length - 1} boss |\n`);
console.log(`moradon/: canavar türü ${canavarSatirlari.length - 1}, drop ${dropSatirlari.length - 1}, NPC ${npc.length}, boss ${bosslar.length - 1}, model ${modeller.length}, simge ${ikonlar.size}`);
