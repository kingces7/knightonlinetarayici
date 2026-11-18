# Sunucu veritabanindan (SQL Server, LILITH_MYKO) bir bolgenin dost NPC'lerinin satis gruplarini JSON'a yazar (ITEM_SELLTABLE).
# Kullanim (araclar klasorunde):  powershell -ExecutionPolicy Bypass -File sunucu\magaza-disa-aktar.ps1 -Bolge 21
# Cikti: ..\donusturulmus\web\magaza\gruplar.json   { "<grup>": [[eslya no x24 (sayfa 1)], [sayfa 2], ...] }  (0 = bos yuva)
param([int[]]$Bolge = @(21, 1, 2), [string]$Sunucu = '.\SQLEXPRESS', [string]$Veritabani = 'LILITH_MYKO')
$ErrorActionPreference = 'Stop'
$depo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$hedef = Join-Path $depo 'donusturulmus\web\magaza'
New-Item -ItemType Directory -Force $hedef | Out-Null
$c = New-Object System.Data.SqlClient.SqlConnection "Server=$Sunucu;Database=$Veritabani;Integrated Security=True;TrustServerCertificate=True"
$c.Open(); $q = $c.CreateCommand()
$q.CommandText = "SELECT DISTINCT n.iSellingGroup FROM K_NPCPOS1098 p JOIN K_NPC n ON n.sSid = p.NpcID WHERE p.ZoneID IN ($($Bolge -join ',')) AND p.NpcID >= 10000 AND p.NpcID < 30000 AND n.iSellingGroup > 0"
$r = $q.ExecuteReader(); $gruplar = @(); while ($r.Read()) { $gruplar += [int]$r[0] }; $r.Close()
$sonuc = @{}
foreach ($g in $gruplar) {
  $q2 = $c.CreateCommand()
  $q2.CommandText = "SELECT * FROM ITEM_SELLTABLE WHERE iSellingGroup = $g ORDER BY nIndex"
  $r2 = $q2.ExecuteReader(); $sayfalar = @()
  while ($r2.Read()) { $s = @(); for ($i = 1; $i -le 24; $i++) { $s += [int64]$r2["Item$i"] }; if (($s | ? { $_ -ne 0 }).Count) { $sayfalar += , $s } }
  $r2.Close(); $sonuc[[string]$g] = $sayfalar
}
$c.Close()
$sonuc | ConvertTo-Json -Depth 5 -Compress | Set-Content -Encoding UTF8 (Join-Path $hedef 'gruplar.json')
"Yazildi: $($gruplar.Count) satis grubu -> $hedef\gruplar.json"
