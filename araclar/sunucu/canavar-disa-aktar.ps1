# Sunucu veritabanindan (SQL Server, LILITH_MYKO) bir bolgenin canavar yerlesimini JSON'a yazar (K_NPCPOS1098 + K_MONSTER).
# Kullanim (araclar klasorunde):
#   powershell -ExecutionPolicy Bypass -File sunucu\canavar-disa-aktar.ps1 -Bolge 21 -Harita 14th_oldmoradon
# Cikti: ..\donusturulmus\web\harita\<harita>\canavar.json   { yerlesim: [{ sid, x, z, adet, alan, dogus, davranis }], modeller: [sPid...] }
# Sunucu kurali (NpcThread.cpp): her kayit adet kadar canavari (x,z) cevresinde "alan" yaricapinda dogurur, "dogus" saniyede yeniden dogurur.
# davranis (ActType): 1-2 pasif, 3-4 pasif + yardimlasan, 100+ sabit nesne (alinmaz), digerleri saldirgan.
param([int]$Bolge = 21, [string]$Harita = '14th_oldmoradon', [string]$Sunucu = '.\SQLEXPRESS', [string]$Veritabani = 'LILITH_MYKO')
$ErrorActionPreference = 'Stop'
$depo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$hedef = Join-Path $depo "donusturulmus\web\harita\$Harita"
if (-not (Test-Path $hedef)) { throw "Harita klasoru yok: $hedef (once: npm run harita -- $Harita)" }
$c = New-Object System.Data.SqlClient.SqlConnection "Server=$Sunucu;Database=$Veritabani;Integrated Security=True;TrustServerCertificate=True"
$c.Open(); $q = $c.CreateCommand()
$q.CommandText = "SELECT p.NpcID, p.LeftX, p.TopZ, p.NumNPC, p.iRange, p.RegTime, p.ActType, m.sPid FROM K_NPCPOS1098 p JOIN K_MONSTER m ON m.sSid = p.NpcID WHERE p.ZoneID = @z AND p.ActType < 100 AND p.NumNPC > 0 ORDER BY p.NpcID, p.LeftX"
[void]$q.Parameters.AddWithValue('@z', $Bolge)
$r = $q.ExecuteReader(); $yer = @(); $modeller = @{}
while ($r.Read()) {
  $yer += @{ sid = [int]$r['NpcID']; x = [double]$r['LeftX']; z = [double]$r['TopZ']; adet = [int]$r['NumNPC']; alan = [int]$r['iRange']; dogus = [int]$r['RegTime']; davranis = [int]$r['ActType'] }
  $modeller[[string]$r['sPid']] = 1
}
$c.Close()
@{ yerlesim = $yer; modeller = @($modeller.Keys | % { [int]$_ } | Sort-Object) } | ConvertTo-Json -Depth 4 -Compress | Set-Content -Encoding UTF8 (Join-Path $hedef 'canavar.json')
"Yazildi: $($yer.Count) kayit, $(($yer | % { $_.adet } | Measure-Object -Sum).Sum) canavar, modeller: $($modeller.Keys -join ',')"
