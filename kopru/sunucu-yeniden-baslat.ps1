# Oyun sunucusunu (GameServer) yeniden başlatır; veritabanı değişiklikleri (canavar slotları, ganimet…) böylece yüklenir. Giriş sunucusu açık kalır.
# GÜVENLİK: oyuncu oyundayken kapatılırsa son kayıttan (10 dk) sonraki ilerleme kaybolabilir; bu yüzden çevrimiçi oyuncu varsa durur.
#   Kullanım:  powershell -ExecutionPolicy Bypass -File kopru\sunucu-yeniden-baslat.ps1        (-Zorla ile oyuncu olsa da yeniden başlatır)
param([switch]$Zorla)
$ErrorActionPreference = 'Stop'
$cevrimici = & sqlcmd -S '.\SQLEXPRESS' -E -d LILITH_MYKO -h -1 -W -Q "SET NOCOUNT ON; SELECT strCharID FROM CURRENTUSER" | Where-Object { $_ -and $_.Trim() }
if ($cevrimici -and -not $Zorla) { "Çevrimiçi oyuncu var ($($cevrimici -join ', ')): önce oyundan Exit ile çıkmalı. Durduruldu."; exit 1 }
Get-Process GameServer -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 3
& "$PSScriptRoot\myko-baslat.ps1"
