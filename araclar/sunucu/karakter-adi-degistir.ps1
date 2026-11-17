# Bir karakterin adını bütün tablolarda değiştirir (hesabın karakter listesi dahil). Karakter oyunda değilken çalıştırılmalı; yeni ad kullanımda olmamalı.
#   Kullanım:  powershell -ExecutionPolicy Bypass -File araclar\sunucu\karakter-adi-degistir.ps1 -Eski KoTest -Yeni PvPRobot
param([Parameter(Mandatory = $true)][string]$Eski, [Parameter(Mandatory = $true)][string]$Yeni)
$ErrorActionPreference = 'Stop'
$c = New-Object System.Data.SqlClient.SqlConnection 'Server=.\SQLEXPRESS;Database=LILITH_MYKO;Integrated Security=True'; $c.Open()
function Sayi($s) { $q = $c.CreateCommand(); $q.CommandText = $s; [int]$q.ExecuteScalar() }
if ((Sayi "SELECT COUNT(*) FROM CURRENTUSER WHERE strCharID='$Eski'") -gt 0) { "$Eski oyunda: önce çıkış yapılmalı."; exit 1 }
if ((Sayi "SELECT COUNT(*) FROM USERDATA WHERE strUserID='$Yeni'") -gt 0) { "$Yeni adı zaten kullanılıyor."; exit 1 }
$q = $c.CreateCommand(); $q.CommandText = "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME IN ('strUserId','strCharID','strCharName') AND TABLE_NAME <> 'CURRENTUSER'"
$r = $q.ExecuteReader(); $liste = @(); while ($r.Read()) { $liste += , @($r.GetString(0), $r.GetString(1)) }; $r.Close()
$tx = $c.BeginTransaction()
try {
  foreach ($t in $liste) { $k = $c.CreateCommand(); $k.Transaction = $tx; $k.CommandText = "UPDATE [$($t[0])] SET [$($t[1])] = '$Yeni' WHERE [$($t[1])] = '$Eski'"; [void]$k.ExecuteNonQuery() }
  foreach ($n in 1..4) { $k = $c.CreateCommand(); $k.Transaction = $tx; $k.CommandText = "UPDATE ACCOUNT_CHAR SET strCharID$n = '$Yeni' WHERE strCharID$n = '$Eski'"; [void]$k.ExecuteNonQuery() }
  $tx.Commit()
} catch { $tx.Rollback(); throw }
"Tamam: $Eski -> $Yeni"; $c.Close()
