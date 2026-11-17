# Bu projede sunucuya aktarılan tüm veritabanı güncellemelerini (bosslar, tanımsız skill'ler) tek seferde uygular ve sunucuyu yeniden başlatır.
# Her adım tekrar çalıştırılabilir (zaten varsa atlanır). Sunucu kaynak yamaları (araclar\sunucu\yamalar\*.patch) derleme klasörüne işlenmiş ve derlenmiştir;
# yeni GameServer.exe varsa yeniden başlatma betiği onu kopyalar.
#   Kullanım:  powershell -ExecutionPolicy Bypass -File araclar\sunucu\sunucu-guncelle.ps1   (-YenidenBaslatma ile yalnız veritabanı)
param([switch]$YenidenBaslatma)
$ErrorActionPreference = 'Stop'
$kok = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
foreach ($d in 'dragon-tooth-boss.sql', 'kecoon-boss.sql') {
  "SQL: $d"
  & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\sql-calistir.ps1" -Dosya "$PSScriptRoot\$d"
}
# MAGIC tablosunda olmayan client skill'leri: node araclar\sunucu\skill-tanit.ts ile üretilir (zaten tanıtılmışsa "eklenecek 0" der).
$sql = 'E:\tmp\skill_tanit.sql'
node "$PSScriptRoot\skill-tanit.ts"
if ((Test-Path $sql) -and (Get-Item $sql).Length -gt 20) { & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\sql-calistir.ps1" -Dosya $sql }
if (-not $YenidenBaslatma) { & powershell -ExecutionPolicy Bypass -File "$kok\kopru\sunucu-yeniden-baslat.ps1" }
