# Sunucu veritabanindan (SQL Server, LILITH_MYKO) oyuncu kurallarini JSON'a yazar:
#   - LEVEL_UP: seviye basina gereken deneyim (yeniden dogus 0)
#   - COEFFICIENT: sinif katsayilari (can/mana ve vurus formulleri; sunucu kaynagi: UserHealtMagicSpSystem.cpp, UserAbilityHandler.cpp)
#   - DAMAGE_SETTINGS: hasar carpanlari (Unit.cpp CUser::GetDamage)
#   - K_MONSTER: Moradon (bolge 21) canavarlarinin gercek degerleri (K_NPCPOS1098 ile eslesen)
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
$canavar = @(Sorgu 'SELECT m.sSid,m.strName,m.sPid,m.sSize,m.sLevel,m.iHpPoint,m.sAc,m.sHitRate,m.sEvadeRate,m.sDamage,m.sAttackDelay,m.iExp,m.iMoney,SUM(p.NumNPC) AS adet FROM K_NPCPOS1098 p JOIN K_MONSTER m ON m.sSid=p.NpcID WHERE p.ZoneID=21 GROUP BY m.sSid,m.strName,m.sPid,m.sSize,m.sLevel,m.iHpPoint,m.sAc,m.sHitRate,m.sEvadeRate,m.sDamage,m.sAttackDelay,m.iExp,m.iMoney ORDER BY m.sLevel,m.sSid' | % { @{ sid = [int]$_.sSid; ad = [string]$_.strName; model = [int]$_.sPid; boyut = [int]$_.sSize; seviye = [int]$_.sLevel; hp = [int]$_.iHpPoint; ac = [int]$_.sAc; isabet = [int]$_.sHitRate; kacis = [int]$_.sEvadeRate; hasar = [int]$_.sDamage; gecikme = [int]$_.sAttackDelay; exp = [int]$_.iExp; para = [int]$_.iMoney; adet = [int]$_.adet } })
$c.Close()
@{ deneyim = $deneyim; katsayi = $katsayi; hasarAyar = $hasarAyar; canavar = $canavar } | ConvertTo-Json -Depth 5 -Compress | Set-Content -Encoding UTF8 (Join-Path $hedef 'oyuncu.json')
"Yazildi: $(Join-Path $hedef 'oyuncu.json') (deneyim: $($deneyim.Count) seviye, sinif: $($katsayi.Count), canavar: $($canavar.Count))"
