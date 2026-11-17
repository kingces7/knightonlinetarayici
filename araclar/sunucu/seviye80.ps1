# Oyunun en yüksek seviyesini 80 yapar ve admin karakterini (kingces) seviye 80'e göre doldurur; sunucuyu yeniden başlatır.
#   - GameServer.ini GAMEMAXLEVEL=80, veritabanı SERVER_SETTINGS.MaximumLevelChange=80
#   - Karakter: seviye 80, statlar toplamı 297 + 3×80 + 2×(80−60) = 577 (sunucu kuralı), boş stat puanı 0; skill ağaçları 70'e kadar (Master ağacı seviye−60 = 20)
# Oyun/karakter açıkken çalışmaz (çıkışta ezilir, sunucu yeniden başlatılamaz). Kullanım: powershell -ExecutionPolicy Bypass -File araclar\sunucu\seviye80.ps1
$ErrorActionPreference = 'Stop'
$kok = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
function Sorgu($q) { & sqlcmd -S '.\SQLEXPRESS' -E -d LILITH_MYKO -h -1 -W -Q "SET NOCOUNT ON; $q" }
if (@(Sorgu "SELECT strCharID FROM CURRENTUSER" | Where-Object { $_ -and $_.Trim() }).Count -gt 0) { 'Çevrimiçi oyuncu var: önce oyundan Exit ile çıkın. Durduruldu.'; exit 1 }
$ini = Join-Path $kok 'oyun-dosyalari\derleme\calistir\GameServer.ini'
(Get-Content $ini) -replace '^GAMEMAXLEVEL=.*', 'GAMEMAXLEVEL=80' | Set-Content $ini
Sorgu "UPDATE SERVER_SETTINGS SET MaximumLevelChange = 80"
# STR 255, STA 152, DEX 70, INT 50, CHA 50 = 577
Sorgu "UPDATE USERDATA SET Level = 80, Exp = 0, Strong = 255, Sta = 152, Dex = 70, Intel = 50, Cha = 50, Points = 0, strSkill = CAST(0x00000000004646461400 AS varchar(10)) WHERE strUserID = 'kingces'"
& (Join-Path $kok 'kopru\sunucu-yeniden-baslat.ps1')
'Tamam: en yüksek seviye 80, kingces seviye 80 (STR 255 / STA 152 / DEX 70 / INT 50 / CHA 50).'
