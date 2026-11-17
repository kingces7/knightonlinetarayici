# admin226 hesabında: KEAdmin karakterini "kingces" olarak yeniden adlandırır, hesabın DİĞER bütün karakterlerini (eski kingces, cessy, magician) siler.
# GERİ ALINAMAZ: önce veritabanının tam yedeği alınır (oyun-dosyalari/yedek/, git'e girmez). Karakter oyundayken çalışmaz.
#   Kullanım:  powershell -ExecutionPolicy Bypass -File araclar\sunucu\admin-kingces.ps1
$ErrorActionPreference = 'Stop'
$hesap = 'admin226'; $yeni = 'kingces'; $admin = 'KEAdmin'; $silinecek = @('kingces', 'cessy', 'magician')
$cs = 'Server=.\SQLEXPRESS;Database=LILITH_MYKO;Integrated Security=True'
$c = New-Object System.Data.SqlClient.SqlConnection $cs; $c.Open()
function Sorgu([string]$s) { $q = $c.CreateCommand(); $q.CommandText = $s; $q.CommandTimeout = 300; $q.ExecuteScalar() }
function Calistir([string]$s) { $q = $c.CreateCommand(); $q.CommandText = $s; $q.CommandTimeout = 300; [void]$q.ExecuteNonQuery() }
if ([int](Sorgu "SELECT COUNT(*) FROM CURRENTUSER WHERE strAccountID='$hesap'") -gt 0) { "$hesap şu an oyunda: önce oyundan Exit ile çıkın. Durduruldu."; exit 1 }
if ([int](Sorgu "SELECT COUNT(*) FROM USERDATA WHERE strUserID='$admin'") -ne 1) { "$admin karakteri yok ya da zaten yeniden adlandırılmış. Durduruldu."; exit 1 }
# 1) yedek
$yedekDizin = Join-Path (Split-Path $PSScriptRoot -Parent | Split-Path -Parent) 'oyun-dosyalari\yedek'
New-Item -ItemType Directory -Force $yedekDizin | Out-Null
$yedek = Join-Path $yedekDizin ("LILITH_MYKO_kingces_oncesi_{0:yyyyMMdd_HHmmss}.bak" -f (Get-Date))
try { Calistir "BACKUP DATABASE LILITH_MYKO TO DISK = N'$yedek' WITH INIT" } catch { $yedek = Join-Path $env:TEMP 'LILITH_MYKO_kingces_oncesi.bak'; Calistir "BACKUP DATABASE LILITH_MYKO TO DISK = N'$yedek' WITH INIT" }
"Yedek: $yedek"
# 2) karakter adı sütunu olan tablolar
$q = $c.CreateCommand(); $q.CommandText = "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME IN ('strUserId','strCharID','strCharName') AND TABLE_NAME NOT IN ('CURRENTUSER')"
$r = $q.ExecuteReader(); $tablolar = @(); while ($r.Read()) { $tablolar += , @($r.GetString(0), $r.GetString(1)) }; $r.Close()
$tx = $c.BeginTransaction()
try {
  foreach ($t in $tablolar) {
    $tab = $t[0]; $kol = $t[1]
    $k = $c.CreateCommand(); $k.Transaction = $tx; $k.CommandTimeout = 300
    $k.CommandText = "DELETE FROM [$tab] WHERE [$kol] IN ('" + ($silinecek -join "','") + "')"; [void]$k.ExecuteNonQuery()
    $k.CommandText = "UPDATE [$tab] SET [$kol] = '$yeni' WHERE [$kol] = '$admin'"; [void]$k.ExecuteNonQuery()
  }
  $k = $c.CreateCommand(); $k.Transaction = $tx
  $k.CommandText = "UPDATE ACCOUNT_CHAR SET bCharNum = 1, strCharID1 = '$yeni', strCharID2 = NULL, strCharID3 = NULL, strCharID4 = NULL WHERE strAccountID = '$hesap'"; [void]$k.ExecuteNonQuery()
  $tx.Commit()
} catch { $tx.Rollback(); throw }
"Tamam: $admin -> $yeni; $hesap hesabında yalnızca $yeni kaldı."
$c.Close()
