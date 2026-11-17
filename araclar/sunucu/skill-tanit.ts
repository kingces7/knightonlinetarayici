// Sunucu veritabanında (MAGIC) tanımı olmayan ama client skill tablosunda (SkillMagicTable_us) bulunan skill'leri sunucuya tanıtır.
//   node araclar/sunucu/skill-tanit.ts  -> E:/tmp/skill_tanit.sql ; sonra: powershell -File araclar\sunucu\sql-calistir.ps1 -Dosya <sql>
// MAGIC satırı client tablosundan (sütun eşlemesi gerçek Myko satırlarıyla sınandı: 205510, 211003, 207505, 205645); tür ayrıntıları Skill_Magic_1..4 tablolarından (MAGIC_TYPE1..4).
// Türü 1-4 olmayan (8: ışınlanma/diriltme/parti vb.) ya da tür verisi bulunmayan skill'ler atlanır ve rapor edilir.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const D = path.resolve(import.meta.dirname, '..', '..', 'donusturulmus', 'tablolar', 'Data');
function csv(dosya: string): string[][] {
  const metin = fs.readFileSync(path.join(D, dosya), 'utf8'), satirlar: string[][] = []; let alan = '', s: string[] = [], tirnak = false;
  for (let i = 0; i < metin.length; i++) { const c = metin[i];
    if (tirnak) { if (c === '"') { if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; } else alan += c; }
    else if (c === '"') tirnak = true; else if (c === ',') { s.push(alan); alan = ''; } else if (c === '\n') { s.push(alan.replace(/\r$/, '')); satirlar.push(s); s = []; alan = ''; } else alan += c; }
  if (alan || s.length) { s.push(alan); satirlar.push(s); }
  return satirlar;
}
const tablo = (dosya: string) => new Map(csv(dosya).filter((r) => /^\d+$/.test(r[0] ?? '')).map((r) => [Number(r[0]), r] as const));
const mevcut = new Set(execFileSync('sqlcmd', ['-S', '.' + String.fromCharCode(92) + 'SQLEXPRESS', '-E', '-d', 'LILITH_MYKO', '-h', '-1', '-W', '-Q', 'SET NOCOUNT ON; SELECT MagicNum FROM MAGIC'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split(/\s+/).filter((x) => /^\d+$/.test(x)).map(Number));
const ana = tablo('SkillMagicTable_us.csv'), t1 = tablo('Skill_Magic_1.csv'), t2 = tablo('Skill_Magic_2.csv'), t3 = tablo('Skill_Magic_3.csv'), t4 = tablo('Skill_Magic_4.csv');
const q = (s: string) => `N'${s.replace(/'/g, "''").trim()}'`, n = (x: string | undefined, vars = 0) => (x === undefined || x === '' || Number.isNaN(Number(x)) ? vars : Number(x));
const sql: string[] = ['SET NOCOUNT ON;']; const atlanan: string[] = []; let eklenen = 0;
for (const [no, r] of ana) {
  if (mevcut.has(no)) continue;
  const seviye = n(r[15]), sayfa = n(r[16]); if (!((sayfa >= 1050 && sayfa <= 1129) || (sayfa >= 2050 && sayfa <= 2129) || [1010, 1020, 1030, 1040, 2010, 2020, 2030, 2040].includes(sayfa))) continue;
  const tip1 = n(r[26]), tip2 = n(r[27]);
  const tipSatiri = tip1 === 1 ? t1.get(no) : tip1 === 2 ? t2.get(no) : tip1 === 3 ? t3.get(no) : tip1 === 4 ? t4.get(no) : undefined;
  if (!tipSatiri) { atlanan.push(`${no} ${r[1]} (tür ${tip1}${tip1 > 4 ? ': desteklenmiyor' : ': veri yok'})`); continue; }
  const menzil = n(r[28]) || (tip1 === 1 ? 15 : tip1 === 2 ? 45 : tip1 === 3 ? 25 : 0);
  sql.push(`INSERT INTO MAGIC (MagicNum, EnName, KrName, Description, t_1, BeforeAction, TargetAction, SelfEffect, FlyingEffect, TargetEffect, Moral, SkillLevel, Skill, Msp, HP, sSp, ItemGroup, UseItem, CastTime, ReCastTime, SuccessRate, Type1, Type2, Range, Etc, UseStanding) VALUES (${no}, ${q(r[1] || r[2])}, ${q(r[2] || r[1])}, ${q(r[3] ?? '')}, ${n(r[4])}, ${n(r[5])}, ${n(r[6])}, 0, 0, ${n(r[12])}, ${n(r[14])}, ${seviye}, ${sayfa}, ${n(r[17])}, ${n(r[18])}, 0, ${n(r[19])}, ${n(r[20])}, ${n(r[21])}, ${n(r[22])}, ${n(r[25], 100)}, ${tip1}, ${tip2}, ${menzil}, 0, 0);`);
  const x = tipSatiri;
  if (tip1 === 1) sql.push(`INSERT INTO MAGIC_TYPE1 (iNum, Type, HitRate, Hit, AddDamage, ComboType, ComboCount, ComboDamage, Range, Delay, AddDmgPercToUser, AddDmgPercToNpc) VALUES (${no}, ${n(x[1])}, ${n(x[2], 100)}, ${Math.max(1, Math.round(n(x[3], 100) * 0.37))}, ${n(x[4], 100)}, ${n(x[5])}, ${n(x[6], 1)}, ${n(x[7])}, 0, 0, 100, 100);`);
  if (tip1 === 2) sql.push(`INSERT INTO MAGIC_TYPE2 (iNum, HitType, HitRate, AddDamage, AddRange, NeedArrow, AddDmgPercToUser, AddDmgPercToNpc) VALUES (${no}, ${n(x[1])}, ${n(x[2], 100)}, ${n(x[3], 100)}, ${n(x[4], 100)}, ${n(x[5], 1)}, 100, 100);`);
  if (tip1 === 3) sql.push(`INSERT INTO MAGIC_TYPE3 (iNum, DirectType, FirstDamage, TimeDamage, Duration, Attribute, Radius, AddDmgPercToUser, AddDmgPercToNpc) VALUES (${no}, ${n(x[2])}, ${n(x[3])}, ${n(x[4])}, ${n(x[5])}, ${n(x[6])}, ${n(x[1])}, 100, 100);`);
  if (tip1 === 4) { const v = x.slice(1).map((z) => n(z)); while (v.length < 28) v.push(100); sql.push(`INSERT INTO MAGIC_TYPE4 (iNum, BuffType, Radius, Duration, AttackSpeed, Speed, AC, ACPct, Attack, MagicAttack, MaxHP, MaxHPPct, MaxMP, MaxMPPct, Str, Sta, Dex, Intel, Cha, FireR, ColdR, LightningR, MagicR, DiseaseR, PoisonR, ExpPct, SpecialAmount, HitRate, AvoidRate) VALUES (${no}, ${v.slice(0, 28).join(', ')});`); }
  eklenen++;
}
fs.writeFileSync('E:/tmp/skill_tanit.sql', sql.join('\nGO\n'));
console.log(`eklenecek ${eklenen} skill; atlanan ${atlanan.length}`); console.log(atlanan.slice(0, 40).join('\n'));
