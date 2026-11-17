# Admin karakterinin (KEAdmin, admin226 hesabında) sınıfını değiştirir: sınıfa göre bütün skill ağaçları açık olur (seviye 65 (sunucunun en yüksek seviyesi, GameServer.ini GAMEMAXLEVEL), ağaç puanları dolu).
# Sunucu bir karakterin yalnızca KENDİ sınıfının skill'lerini kullanmasına izin verir; başka sınıfın skill'lerini denemek için önce bu betikle sınıf değiştirilir.
# GÜVENLİK: karakter oyundaysa durur (oyundayken veritabanı değişikliği çıkışta ezilir). Önce oyundan Exit ile çıkılmalı.
#   Kullanım:  powershell -ExecutionPolicy Bypass -File araclar\sunucu\admin-sinif.ps1 -Sinif 208
#   Sınıf kodları (El Morad): 205 Warrior novice, 206 Warrior master, 207 Rogue novice, 208 Rogue master, 209 Mage novice, 210 Mage master, 211 Priest novice, 212 Priest master.
param([Parameter(Mandatory = $true)][ValidateSet(205,206,207,208,209,210,211,212)][int]$Sinif, [string]$Karakter = 'KEAdmin')
$ErrorActionPreference = 'Stop'
function Sorgu($q) { & sqlcmd -S '.\SQLEXPRESS' -E -d LILITH_MYKO -h -1 -W -Q "SET NOCOUNT ON; $q" }
if (@(Sorgu "SELECT strCharID FROM CURRENTUSER WHERE strCharID='$Karakter'" | Where-Object { $_ -and $_.Trim() }).Count -gt 0) { "$Karakter şu an oyunda: önce oyundan Exit ile çıkın. Durduruldu."; exit 1 }
# Skill puanları: bayt 0 boş puan, 5–7 ağaçlar (65), 8 Master (5, yalnız master sınıfta)
$master = $Sinif % 2 -eq 0
$skill = if ($master) { '0x00000000004141410500' } else { '0x00000000004141410000' }
Sorgu "UPDATE USERDATA SET Class=$Sinif, Level=65, Authority=0, strSkill=CAST($skill AS varchar(10)) WHERE strUserID='$Karakter'"
"$Karakter -> sınıf $Sinif (seviye 65 (sunucunun en yüksek seviyesi, GameServer.ini GAMEMAXLEVEL), GM yetkisi, ağaç puanları dolu)"
