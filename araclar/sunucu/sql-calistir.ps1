# Bir .sql dosyasını LILITH_MYKO veritabanında çalıştırır (satırlara "GO" ile bölünebilir). Kullanım: powershell -ExecutionPolicy Bypass -File araclar\sunucu\sql-calistir.ps1 -Dosya x.sql
param([Parameter(Mandatory = $true)][string]$Dosya, [string]$Veritabani = 'LILITH_MYKO')
$ErrorActionPreference = 'Stop'
$c = New-Object System.Data.SqlClient.SqlConnection "Server=.\SQLEXPRESS;Database=$Veritabani;Integrated Security=True"; $c.Open()
$metin = [System.IO.File]::ReadAllText((Resolve-Path $Dosya), [System.Text.Encoding]::UTF8)
foreach ($parca in ($metin -split '(?im)^\s*GO\s*$')) { if (-not $parca.Trim()) { continue }; $k = $c.CreateCommand(); $k.CommandText = $parca; $k.CommandTimeout = 300; [void]$k.ExecuteNonQuery() }
$c.Close(); "Tamam: $Dosya"
