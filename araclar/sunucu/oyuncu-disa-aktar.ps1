# Sunucu veritabanindan (SQL Server, LILITH_MYKO) oyuncu kurallarini JSON'a yazar:
#   - LEVEL_UP: seviye basina gereken deneyim (yeniden dogus 0)
#   - COEFFICIENT: sinif katsayilari (can/mana formulu, sunucu kaynagi: UserHealtMagicSpSystem.cpp SetMaxHp/SetMaxMp)
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
foreach ($s in (Sorgu 'SELECT sClass, Hp, Mp, Sp FROM COEFFICIENT')) { $katsayi[[string]$s.sClass] = @{ hp = [double]$s.Hp; mp = [double]$s.Mp; sp = [double]$s.Sp } }
$c.Close()
@{ deneyim = $deneyim; katsayi = $katsayi } | ConvertTo-Json -Depth 5 -Compress | Set-Content -Encoding UTF8 (Join-Path $hedef 'oyuncu.json')
"Yazildi: $(Join-Path $hedef 'oyuncu.json') (deneyim: $($deneyim.Count) seviye, sinif: $($katsayi.Count))"
