# Sunucu veritabanindan (SALT OKUNUR) bolge tablosunu JSON'a yazar: ZONE_INFO1098 + START_POSITION1098.
# Kullanim (araclar klasorunde):  powershell -ExecutionPolicy Bypass -File harita\bolge-disa-aktar.ps1
# Cikti: ..\donusturulmus\tablolar\bolge-sunucu.json  (git'e girmez; harita/bolge-tara.ts okur)
param(
  [string]$Sunucu = '.\SQLEXPRESS',
  [string]$Veritabani = 'LILITH_MYKO'
)
$ErrorActionPreference = 'Stop'
$depo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$hedef = Join-Path $depo 'donusturulmus\tablolar'
New-Item -ItemType Directory -Force $hedef | Out-Null
$c = New-Object System.Data.SqlClient.SqlConnection "Server=$Sunucu;Database=$Veritabani;Integrated Security=True;TrustServerCertificate=True;ApplicationIntent=ReadOnly"
$c.Open()
$q = $c.CreateCommand()
$q.CommandText = 'SELECT ZoneNo, strZoneSmdName, strZoneName, Status, ZoneType, MinLevel, MaxLevel, ExpLost FROM ZONE_INFO1098 ORDER BY ZoneNo'
$r = $q.ExecuteReader()
$bolgeler = @()
while ($r.Read()) {
  $bolgeler += [ordered]@{ no = [int]$r[0]; smd = [string]$r[1]; ad = [string]$r[2]; durum = [int]$r[3]; tur = [int]$r[4]; enDusukSeviye = [int]$r[5]; enYuksekSeviye = [int]$r[6]; deneyimKaybi = ([int]$r[7] -ne 0) }
}
$r.Close()
$q.CommandText = 'SELECT ZoneID, sKarusX, sKarusZ, sElmoradX, sElmoradZ FROM START_POSITION1098 ORDER BY ZoneID'
$r = $q.ExecuteReader()
$baslangic = @()
while ($r.Read()) { $baslangic += [ordered]@{ no = [int]$r[0]; karus = @([int]$r[1], [int]$r[2]); elmorad = @([int]$r[3], [int]$r[4]) } }
$r.Close(); $c.Close()
$cikti = [ordered]@{ bolgeler = $bolgeler; baslangic = $baslangic }
$yol = Join-Path $hedef 'bolge-sunucu.json'
[System.IO.File]::WriteAllText($yol, ($cikti | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
"Yazildi: $yol ($($bolgeler.Count) bolge, $($baslangic.Count) baslangic noktasi)"
