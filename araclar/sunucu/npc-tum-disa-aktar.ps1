# Tüm bölgelerin dost NPC konum/yönlerini JSON yapar (NPC bakış yönü analizi için: client/scripts/npcyonAnaliz.mjs).
# Kullanım: powershell -ExecutionPolicy Bypass -File sunucu
pc-tum-disa-aktar.ps1 <cikti.json>
param([string]$Cikti)
$c = New-Object System.Data.SqlClient.SqlConnection "Server=.\SQLEXPRESS;Database=LILITH_MYKO;Integrated Security=True;TrustServerCertificate=True"
$c.Open(); $q = $c.CreateCommand()
$q.CommandText = "SELECT p.ZoneID, z.strZoneSmdName AS smd, p.NpcID, p.strName, p.LeftX, p.TopZ, p.byDirection, n.byType FROM K_NPCPOS1098 p JOIN K_NPC n ON n.sSid=p.NpcID JOIN (SELECT ZoneNo, MIN(strZoneSmdName) strZoneSmdName FROM ZONE_INFO1098 GROUP BY ZoneNo) z ON z.ZoneNo=p.ZoneID WHERE p.NpcID>=10000 AND p.NpcID<30000 AND p.byDirection IS NOT NULL"
$r = $q.ExecuteReader(); $l = @()
while ($r.Read()) { $l += @{ zone = [int]$r['ZoneID']; smd = [string]$r['smd']; sid = [int]$r['NpcID']; ad = [string]$r['strName']; x = [double]$r['LeftX']; z = [double]$r['TopZ']; yon = [int]$r['byDirection']; tur = [int]$r['byType'] } }
$l | ConvertTo-Json -Compress | Set-Content -Encoding UTF8 $Cikti
"$($l.Count) NPC"
