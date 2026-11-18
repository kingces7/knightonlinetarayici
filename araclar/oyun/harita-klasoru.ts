// Harita klasörü: oyundaki her bölge (harita) için bir klasör; içinde o haritaya özel canavar / drop / NPC / mağaza listeleri ve teknik bilgiler.
//   node araclar/oyun/harita-klasoru.ts        -> harita/<harita adı>/...   (+ harita/README.md ve harita/_tum-haritalar.csv)
// Kaynak: LILITH_MYKO (ZONE_INFO1098, K_NPCPOS1098, K_MONSTER, K_NPC, K_MONSTER_ITEM, ITEM_SELLTABLE, START_POSITION1098), sunucu harita dosyaları (.smd: kapılar, nesne olayları), client Zones.csv.
// Oyunun kendi dosyaları kopyalanmaz; yalnızca adlar, değerler ve yol listeleri yazılır (depoya girebilir).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CIKTI_DIZINI, DEPO_KOKU } from '../ortak/yollar.ts';
import { smdOku } from '../harita/smd.ts';

const SERVER = '.' + String.fromCharCode(92) + 'SQLEXPRESS';
const sorgu = (q: string): string[][] => execFileSync('sqlcmd', ['-S', SERVER, '-E', '-d', 'LILITH_MYKO', '-h', '-1', '-W', '-s', '|', '-Q', 'SET NOCOUNT ON; ' + q], { encoding: 'utf8', maxBuffer: 1 << 28 })
  .split(/\r?\n/).filter((x) => x.trim()).map((x) => x.split('|').map((y) => y.trim()));
const csv = (s: (string | number)[]) => s.map((x) => { const t = String(x); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(',');
const yaz = (d: string, ad: string, satirlar: (string | number)[][]) => fs.writeFileSync(path.join(d, ad), satirlar.map(csv).join('\n') + '\n');

const esyaAd = new Map<number, string>((JSON.parse(fs.readFileSync(path.join(CIKTI_DIZINI, 'web', 'esya', 'tum.json'), 'utf8')) as { no: number; ad: string }[]).map((e) => [e.no, e.ad] as const));
const sutunlar = sorgu("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ZONE_INFO1098' ORDER BY ORDINAL_POSITION").map((r) => r[0]);
const bolgeler = sorgu('SELECT * FROM ZONE_INFO1098 ORDER BY ZoneNo').map((r) => Object.fromEntries(sutunlar.map((s, i) => [s, r[i]])));
const canavarlar = sorgu('SELECT p.ZoneID, m.sSid, m.strName, m.sPid, m.sSize, m.sLevel, m.iHpPoint, m.sAc, m.sDamage, m.sAttackDelay, m.iExp, m.iMoney, m.sItem, p.ActType, p.NumNPC, p.iRange, p.LeftX, p.TopZ, p.RegTime FROM K_NPCPOS1098 p JOIN K_MONSTER m ON m.sSid = p.NpcID WHERE p.ActType < 100');
const npcler = sorgu('SELECT p.ZoneID, n.sSid, n.strName, n.sPid, n.byType, n.iSellingGroup, p.LeftX, p.TopZ, p.byDirection FROM K_NPCPOS1098 p JOIN K_NPC n ON n.sSid = p.NpcID WHERE p.ActType >= 100');
const dropSatir = new Map<number, number[]>(sorgu('SELECT * FROM K_MONSTER_ITEM').map((r) => [Number(r[0]), r.slice(1).map(Number)] as const));
const satis = new Map<number, number[]>();
for (const r of sorgu('SELECT * FROM ITEM_SELLTABLE')) { const g = Number(r[0]); satis.set(g, [...(satis.get(g) ?? []), ...r.slice(1, 25).map(Number).filter((x) => x > 0)]); }
const baslangic = new Map(sorgu('SELECT * FROM START_POSITION1098').map((r) => [Number(r[0]), r] as const));
const zonesCsv = fs.readFileSync(path.join(CIKTI_DIZINI, 'tablolar', 'Data', 'Zones.csv'), 'utf8').split('\n').slice(2).map((l) => l.split(','));
const smdKlasoru = path.join(DEPO_KOKU, 'oyun-dosyalari', 'derleme', 'calistir', 'Map');

const klasor = path.join(DEPO_KOKU, 'harita'); fs.mkdirSync(klasor, { recursive: true });
const adSayac = new Map<string, number>(); for (const b of bolgeler) adSayac.set(b.strZoneName, (adSayac.get(b.strZoneName) ?? 0) + 1);
const gecerliAd = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').trim();
let indeks = '# Harita klasörü\n\n`node araclar/oyun/harita-klasoru.ts` ile üretilir (elle düzenlemeyin; notlar için her klasörde `NOTLAR.md` vardır ve üzerine yazılmaz).\n\nHer klasör bir oyun bölgesidir: **canavarlar.csv**, **drop-listesi.csv**, **npc-listesi.csv**, **magaza-listesi.csv**, **kapilar-ve-olaylar.csv**, **bolge-bilgisi.json**, **istemci-dosyalari.csv** (varsa).\n\n| Bölge no | Harita | Sunucu haritası | Canavar yerleşimi | NPC | Durum |\n|---|---|---|---|---|---|\n';
const tum: (string | number)[][] = [['bolge_no', 'harita', 'klasor', 'sunucu_haritasi', 'durum', 'canavar_yerlesimi', 'canavar_adedi', 'npc_yerlesimi', 'seviye_araligi']];

for (const b of bolgeler) {
  const no = Number(b.ZoneNo), ad = gecerliAd(b.strZoneName) + ((adSayac.get(b.strZoneName) ?? 1) > 1 ? ` (bölge ${no})` : '');
  const d = path.join(klasor, ad); fs.mkdirSync(d, { recursive: true });
  const cz = canavarlar.filter((r) => Number(r[0]) === no), nz = npcler.filter((r) => Number(r[0]) === no);
  // canavarlar
  yaz(d, 'canavarlar.csv', [['sid', 'ad', 'model', 'boyut', 'seviye', 'hp', 'savunma', 'hasar', 'saldiri_gecikmesi', 'exp', 'altin', 'davranis', 'yerlesim_sayisi', 'toplam_adet', 'dogus_sn', 'yerlesimler (x:z)'],
    ...[...new Set(cz.map((r) => r[1]))].map((sid) => { const s = cz.filter((r) => r[1] === sid), r = s[0]; return [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[13], s.length, s.reduce((a, x) => a + Number(x[14]), 0), r[18], s.map((x) => `${x[16]}:${x[17]}`).join(' ')]; }).sort((a, c) => Number(a[4]) - Number(c[4]))]);
  // drop
  const drop: (string | number)[][] = [['canavar_sid', 'canavar', 'esya_no', 'esya_adi', 'yuzde']];
  for (const sid of [...new Set(cz.map((r) => r[1]))]) {
    const r = cz.find((x) => x[1] === sid)!, v = dropSatir.get(Number(r[12])); if (!v) continue;
    for (let i = 0; i < 12; i++) { const no2 = v[i * 2], pay = v[i * 2 + 1]; if (!no2 || !pay) continue; drop.push([sid, r[2], no2, no2 < 100000000 ? `(rastgele eşya grubu ${no2})` : (esyaAd.get(no2) ?? 'bilinmiyor'), (pay / 100).toFixed(2) + '%']); }
  }
  yaz(d, 'drop-listesi.csv', drop);
  // npc ve mağaza
  yaz(d, 'npc-listesi.csv', [['sid', 'ad', 'model', 'tur', 'satis_grubu', 'x', 'z', 'yon'], ...nz.map((r) => [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]])]);
  const mag: (string | number)[][] = [['satis_grubu', 'npc_adi', 'esya_no', 'esya_adi']];
  for (const g of [...new Set(nz.map((r) => Number(r[5])).filter((x) => x > 0))]) for (const e of satis.get(g) ?? []) mag.push([g, nz.find((r) => Number(r[5]) === g)![2], e, esyaAd.get(e) ?? '']);
  yaz(d, 'magaza-listesi.csv', mag);
  // sunucu haritası: kapılar, nesne olayları, başlangıç
  const smdAd = fs.existsSync(smdKlasoru) ? fs.readdirSync(smdKlasoru).find((f) => f.toLowerCase() === b.strZoneSmdName.toLowerCase()) : undefined;
  const olay: (string | number)[][] = [['tur', 'no', 'ad / tür', 'bölge', 'x', 'z', 'ek']];
  const st = baslangic.get(no); if (st) olay.push(['başlangıç noktası', no, 'Karus x:z / El Morad x:z', '', `${st[1]}:${st[2]}`, `${st[3]}:${st[4]}`, '']);
  let kapiSayisi = 0;
  if (smdAd) { try { const s = smdOku(fs.readFileSync(path.join(smdKlasoru, smdAd)));
    for (const k of s.kapilar) { olay.push(['ışınlanma kapısı', k.id, k.ad, k.bolge, k.x, k.z, `ücret ${k.ucret}, ulus ${k.millet}`]); kapiSayisi++; }
    for (const o of s.nesneOlaylari) olay.push(['nesne olayı', o.indeks, `tür ${o.tur}`, '', Math.round(o.x), Math.round(o.z), `sahip ${o.sahip}, npc ${o.npc}`]);
  } catch { /* okunamadı */ } }
  yaz(d, 'kapilar-ve-olaylar.csv', olay);
  // istemci dosyaları (Zones.csv: gtd adı = sunucu harita adından)
  const taban = b.strZoneSmdName.toLowerCase().replace(/^1098/, '').replace(/\.smd$/, '');
  const zr = zonesCsv.find((r) => (r[1] ?? '').toLowerCase().includes(`zones\\${taban}.gtd`));
  if (zr) yaz(d, 'istemci-dosyalari.csv', [['alan', 'yol'], ...zr.filter((x) => /[\\/]/.test(x) && /\.[A-Za-z0-9]{2,8}$/.test(x.trim())).map((x) => ['dosya', x.replace(/"/g, '').trim()])]);
  fs.writeFileSync(path.join(d, 'bolge-bilgisi.json'), JSON.stringify({ bolgeNo: no, ad: b.strZoneName, sunucuHaritasi: b.strZoneSmdName, sunucuHaritaDosyasiVar: !!smdAd, istemciHaritasi: zr ? taban : null, ayarlar: b }, null, 1));
  const lv = cz.map((r) => Number(r[5]));
  const durum = b.Status === '1' ? 'açık' : 'kapalı';
  tum.push([no, b.strZoneName, ad, b.strZoneSmdName, durum, [...new Set(cz.map((r) => r[1]))].length, cz.reduce((a, r) => a + Number(r[14]), 0), nz.length, lv.length ? `${Math.min(...lv)}-${Math.max(...lv)}` : '']);
  const notlar = path.join(d, 'NOTLAR.md'); if (!fs.existsSync(notlar)) fs.writeFileSync(notlar, `# ${b.strZoneName} — notlar\n\nElle tutulan notlar buraya yazılır (üretici betik bu dosyaya dokunmaz).\n`);
  fs.writeFileSync(path.join(d, 'README.md'), `# ${b.strZoneName} (bölge ${no})\n\nSunucu haritası: \`${b.strZoneSmdName}\`${smdAd ? '' : ' (dosya yok)'} · ${durum} · seviye ${b.MinLevel}-${b.MaxLevel}\n\n- canavarlar.csv: ${[...new Set(cz.map((r) => r[1]))].length} tür\n- npc-listesi.csv: ${nz.length} kayıt\n- kapilar-ve-olaylar.csv: ${kapiSayisi} kapı\n`);
  indeks += `| ${no} | ${b.strZoneName} | ${b.strZoneSmdName} | ${[...new Set(cz.map((r) => r[1]))].length} tür / ${cz.reduce((a, r) => a + Number(r[14]), 0)} | ${nz.length} | ${durum} |\n`;
}
yaz(klasor, '_tum-haritalar.csv', tum);
fs.writeFileSync(path.join(klasor, 'README.md'), indeks);
console.log(`harita/: ${bolgeler.length} bölge klasörü`);
