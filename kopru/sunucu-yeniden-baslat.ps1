# Oyun sunucusunu (GameServer) yeniden başlatır; veritabanı değişiklikleri (canavar slotları, ganimet…) böylece yüklenir. Giriş sunucusu açık kalır.
# GÜVENLİK: oyuncu oyundayken kapatılırsa son kayıttan (10 dk) sonraki ilerleme kaybolabilir; bu yüzden çevrimiçi oyuncu varsa durur.
#   Kullanım:  powershell -ExecutionPolicy Bypass -File kopru\sunucu-yeniden-baslat.ps1        (-Zorla ile oyuncu olsa da yeniden başlatır)
param([switch]$Zorla)
$ErrorActionPreference = 'Stop'
$cevrimici = & sqlcmd -S '.\SQLEXPRESS' -E -d LILITH_MYKO -h -1 -W -Q "SET NOCOUNT ON; SELECT strCharID FROM CURRENTUSER" | Where-Object { $_ -and $_.Trim() }
if ($cevrimici -and -not $Zorla) { "Çevrimiçi oyuncu var ($($cevrimici -join ', ')): önce oyundan Exit ile çıkmalı. Durduruldu."; exit 1 }
Get-Process GameServer -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 3
# Derleme klasöründe daha yeni bir GameServer.exe varsa (kaynak değişikliği sonrası derleme) çalıştırma klasörüne kopyalanır.
$kok = Split-Path $PSScriptRoot -Parent; $yeniExe = Join-Path $kok 'oyun-dosyalari\derleme\LILITH_Game-Server\x64\Release\GameServer.exe'; $hedefExe = Join-Path $kok 'oyun-dosyalari\derleme\calistir\GameServer.exe'
if ((Test-Path $yeniExe) -and ((Get-Item $yeniExe).LastWriteTime -gt (Get-Item $hedefExe).LastWriteTime)) { Copy-Item $yeniExe $hedefExe -Force; "GameServer.exe güncellendi." }
& "$PSScriptRoot\myko-baslat.ps1"
