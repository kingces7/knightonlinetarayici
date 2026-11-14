# Sunucu veritabanindan (SQL Server, LILITH_MYKO) bir bolgenin NPC yerlesimini JSON'a yazar.
# Kullanim (araclar klasorunde):
#   powershell -File sunucu\npc-disa-aktar.ps1 -Bolge 21 -Harita 14th_oldmoradon
# Cikti: ..\donusturulmus\web\harita\<harita>\npc.json
# Not: "Dost NPC" = sSid 10000..29999 (esnaf, rahip, sanctuary, banka...). Canavarlar sonra eklenecek.
param(
  [int]$Bolge = 21,
  [string]$Harita = '14th_oldmoradon',
  [string]$Sunucu = '.\SQLEXPRESS',
  [string]$Veritabani = 'LILITH_MYKO'
)
$ErrorActionPreference = 'Stop'
$depo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$hedef = Join-Path $depo "donusturulmus\web\harita\$Harita"
if (-not (Test-Path $hedef)) { throw "Harita klasoru yok: $hedef (once: npm run harita -- $Harita)" }
$cs = "Server=$Sunucu;Database=$Veritabani;Integrated Security=True;TrustServerCertificate=True"
$c = New-Object System.Data.SqlClient.SqlConnection $cs
$c.Open()
$q = $c.CreateCommand()
$q.CommandText = @"
SELECT p.NpcID, p.strName, p.LeftX, p.TopZ, p.NumNPC, p.iRange, p.byDirection, p.ActType,
       n.sPid, n.sSize, n.byType, n.byGroup, n.sLevel, n.iSellingGroup
FROM K_NPCPOS1098 p JOIN K_NPC n ON n.sSid = p.NpcID
WHERE p.ZoneID = @z AND p.NpcID >= 10000 AND p.NpcID < 30000
ORDER BY p.NpcID, p.LeftX
"@
[void]$q.Parameters.AddWithValue('@z', $Bolge)
$r = $q.ExecuteReader()
$liste = @()
while ($r.Read()) {
  $liste += [ordered]@{
    sid = [int]$r['NpcID']; ad = [string]$r['strName']; x = [double]$r['LeftX']; z = [double]$r['TopZ']
    adet = [int]$r['NumNPC']; alan = [int]$r['iRange']; yon = [int]$r['byDirection']; davranis = [int]$r['ActType']
    model = [int]$r['sPid']; boyut = [int]$r['sSize']; tur = [int]$r['byType']; grup = [int]$r['byGroup']
    seviye = [int]$r['sLevel']; satis = [int]$r['iSellingGroup']
  }
}
$c.Close()
$json = [ordered]@{ kaynak = "K_NPCPOS1098 bolge $Bolge"; npc = $liste } | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Join-Path $hedef 'npc.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
"{0} NPC kaydi yazildi -> {1}" -f $liste.Count, (Join-Path $hedef 'npc.json')
