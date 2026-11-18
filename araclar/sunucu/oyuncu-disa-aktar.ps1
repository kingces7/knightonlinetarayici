# Sunucu veritabanindan (SQL Server, LILITH_MYKO) oyuncu kurallarini JSON'a yazar:
#   - LEVEL_UP: seviye basina gereken deneyim (yeniden dogus 0)
#   - COEFFICIENT: sinif katsayilari (can/mana ve vurus formulleri; sunucu kaynagi: UserHealtMagicSpSystem.cpp, UserAbilityHandler.cpp)
#   - DAMAGE_SETTINGS: hasar carpanlari (Unit.cpp CUser::GetDamage)
#   - MAGIC + MAGIC_TYPE1/4: dort sinifin temel skill sayfalari (Karus 1010-1040, El Morad 2010-2040) skill kurallari (MagicInstance.cpp ExecuteType1/ExecuteType4)
#   - K_MONSTER: Moradon (21), Luferson (1) ve El Morad (2) canavarlarinin gercek degerleri (K_NPCPOS1098 ile eslesen)
# Kullanim (araclar klasorunde):  powershell -File sunucu\oyuncu-disa-aktar.ps1
# Cikti: ..\donusturulmus\web\oyun\oyuncu.json
param([string]$Sunucu = '.\SQLEXPRESS', [string]$Veritabani = 'LILITH_MYKO')
$ErrorActionPreference = 'Stop'
$depo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$hedef = Join-Path $depo 'donusturulmus\web\oyun'
New-Item -ItemType Directory -Force $hedef | Out-Null
$c = New-Object System.Data.SqlClient.SqlConnection "Server=$Sunucu;Database=$Veritabani;Integrated Security=True;TrustServerCertificate=True"
$c.Open()
function Sorgu($sql) { $q = $c.CreateCommand(); $q.CommandText = $sql; $r = $q.ExecuteReader(); $l = @(); while ($r.Read()) { $s = @{}; for ($i = 0; $i -lt $r.FieldCount; $i++) { $s[$r.GetName($i)] = $r.GetValue($i) }; $l += $s }; $r.Close(); $l }
$deneyim = @{}
foreach ($s in (Sorgu 'SELECT level, Exp FROM LEVEL_UP WHERE RebithLevel = 0 ORDER BY level')) { $deneyim[[string]$s.level] = [int64]$s.Exp }
$katsayi = @{}
foreach ($s in (Sorgu 'SELECT * FROM COEFFICIENT')) { $katsayi[[string]$s.sClass] = @{ hp = [double]$s.Hp; mp = [double]$s.Mp; sp = [double]$s.Sp; ac = [double]$s.Ac; isabet = [double]$s.Hitrate; kacis = [double]$s.Evasionrate; kisaKilic = [double]$s.ShortSword; jamadar = [double]$s.Jamadar; kilic = [double]$s.Sword; balta = [double]$s.Axe; sopa = [double]$s.Club; mizrak = [double]$s.Spear; mace = [double]$s.Pole; asa = [double]$s.Staff; yay = [double]$s.Bow } }
$ds = @(Sorgu 'SELECT TOP 1 mondef, montakedamage, rdamage FROM DAMAGE_SETTINGS')[0]
$hasarAyar = @{ mondef = [double]$ds.mondef; canavarHasarCarpani = [double]$ds.montakedamage; rdamage = [double]$ds.rdamage }
$canavar = @(Sorgu 'SELECT m.sSid,m.strName,m.sPid,m.sSize,m.sLevel,m.iHpPoint,m.sAc,m.sHitRate,m.sEvadeRate,m.sDamage,m.sAttackDelay,m.bySpeed1,m.bySpeed2,m.bySearchRange,m.byTracingRange,m.iExp,m.iMoney,SUM(p.NumNPC) AS adet FROM K_NPCPOS1098 p JOIN K_MONSTER m ON m.sSid=p.NpcID WHERE p.ZoneID IN (21, 1, 2) GROUP BY m.sSid,m.strName,m.sPid,m.sSize,m.sLevel,m.iHpPoint,m.sAc,m.sHitRate,m.sEvadeRate,m.sDamage,m.sAttackDelay,m.bySpeed1,m.bySpeed2,m.bySearchRange,m.byTracingRange,m.iExp,m.iMoney ORDER BY m.sLevel,m.sSid' | % { @{ sid = [int]$_.sSid; ad = [string]$_.strName; model = [int]$_.sPid; boyut = [int]$_.sSize; seviye = [int]$_.sLevel; hp = [int]$_.iHpPoint; ac = [int]$_.sAc; isabet = [int]$_.sHitRate; kacis = [int]$_.sEvadeRate; hasar = [int]$_.sDamage; gecikme = [int]$_.sAttackDelay; hizGez = [int]$_.bySpeed1; hizKovala = [int]$_.bySpeed2; arama = [int]$_.bySearchRange; izleme = [int]$_.byTracingRange; exp = [int]$_.iExp; para = [int]$_.iMoney; adet = [int]$_.adet } })
$beceri = @{}
# Temel skill sayfaları (Warrior/Rogue/Mage/Priest): El Morad 2010-2040, Karus 1010-1040; terfi sonrası (novice/master) sayfalar 1050-1129 ve 2050-2129 (ağaçlar dahil)
foreach ($m in (Sorgu 'SELECT MagicNum, EnName, Msp, ReCastTime, CastTime, Type1, Type2, SkillLevel, Moral, Range, Skill, UseStanding FROM MAGIC WHERE (Skill IN (1010,1020,1030,1040,2010,2020,2030,2040) AND SkillLevel > 0) OR Skill BETWEEN 1050 AND 1129 OR Skill BETWEEN 2050 AND 2129')) {
  $no = [int]$m.MagicNum
  $b = @{ no = $no; ad = ([string]$m.EnName).Trim(); msp = [int]$m.Msp; yenidenKullanim = [int]$m.ReCastTime; seviye = [int]$m.SkillLevel; tip = [int]$m.Type1; tip2 = [int]$m.Type2; moral = [int]$m.Moral; hazirlik = [int]$m.CastTime; menzil = [int]$m.Range; sayfa = [int]$m.Skill; ayakta = [int]$m.UseStanding }
  if ($b.tip -eq 1) {
    $t = @(Sorgu "SELECT * FROM MAGIC_TYPE1 WHERE iNum = $no")[0]
    $b.tip1 = @{ isabetTuru = [int]$t.Type; isabet = [int]$t.HitRate; vurus = [int]$t.Hit; ekHasar = [int]$t.AddDamage; canavarYuzde = [int]$t.AddDmgPercToNpc }
  } elseif ($b.tip -eq 2) {
    $t = @(Sorgu "SELECT * FROM MAGIC_TYPE2 WHERE iNum = $no")[0]
    if ($t) { $b.tip2v = @{ isabet = [int]$t.HitRate; hasar = [int]$t.AddDamage } }
  } elseif ($b.tip -eq 3) {
    $t = @(Sorgu "SELECT * FROM MAGIC_TYPE3 WHERE iNum = $no")[0]
    if ($t) { $b.tip3 = @{ turu = [int]$t.DirectType; ilk = [int]$t.FirstDamage; sureli = [int]$t.TimeDamage; sure = [int]$t.Duration; yaricap = [int]$t.Radius } }
  } elseif ($b.tip -eq 7) {
    $t = @(Sorgu "SELECT * FROM MAGIC_TYPE7 WHERE nIndex = $no")[0]
    if ($t) { $b.tip7 = @{ hasar = [int]$t.shDamage; yaricap = [int]$t.byRadius; sure = [int]$t.shDuration } }
  } elseif ($b.tip -eq 4) {
    $t = @(Sorgu "SELECT * FROM MAGIC_TYPE4 WHERE iNum = $no")[0]
    $b.tip4 = @{ turu = [int]$t.BuffType; sure = [int]$t.Duration; hiz = [int]$t.Speed; ac = [int]$t.AC; acYuzde = [int]$t.ACPct; saldiriHizi = [int]$t.AttackSpeed }
  }
  $beceri[[string]$no] = $b
}
$c.Close()
@{ deneyim = $deneyim; katsayi = $katsayi; hasarAyar = $hasarAyar; canavar = $canavar; beceri = $beceri } | ConvertTo-Json -Depth 5 -Compress | Set-Content -Encoding UTF8 (Join-Path $hedef 'oyuncu.json')
"Yazildi: $(Join-Path $hedef 'oyuncu.json') (deneyim: $($deneyim.Count) seviye, sinif: $($katsayi.Count), canavar: $($canavar.Count))"
