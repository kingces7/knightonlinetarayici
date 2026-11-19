# Sunucu veritabanindan (SQL Server, LILITH_MYKO) bir bolgenin canavarlarinin ganimet kurallarini JSON'a yazar.
# Sunucu kurali (Npc.cpp CNpc::GiveNpcHaveItem): para = iMoney * rastgele(70..100)/100 (en cok 32000); her K_MONSTER_ITEM satiri (12 yuva)
# icin rastgele(0,10000) <= sPersent ise esya duser; esya numarasi 100000000'dan kucukse bir esya GRUBUdur (MAKE_ITEM_GROUP_RANDOM varsa oradan,
# yoksa MAKE_ITEM_GROUP satirindan rastgele bir esya), degilse dogrudan esya numarasidir.
# Kullanim (araclar klasorunde):  powershell -ExecutionPolicy Bypass -File sunucu\ganimet-disa-aktar.ps1 -Bolge 21
# Cikti: ..\donusturulmus\web\oyun\ganimet-ham.json   { canavar: { "<sSid>": { para, ogeler: [{ no, yuzde }] } }, gruplar: { "<grup>": [esya no ...] } }
param([int]$Bolge = 21, [string]$Sunucu = '.\SQLEXPRESS', [string]$Veritabani = 'LILITH_MYKO')
$ErrorActionPreference = 'Stop'
$depo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$hedef = Join-Path $depo 'donusturulmus\web\oyun'
New-Item -ItemType Directory -Force $hedef | Out-Null
$c = New-Object System.Data.SqlClient.SqlConnection "Server=$Sunucu;Database=$Veritabani;Integrated Security=True;TrustServerCertificate=True"
$c.Open()
function Sorgu($sql) { $q = $c.CreateCommand(); $q.CommandText = $sql; $r = $q.ExecuteReader(); $l = @(); while ($r.Read()) { $s = @{}; for ($i = 0; $i -lt $r.FieldCount; $i++) { $s[$r.GetName($i)] = $r.GetValue($i) }; $l += $s }; $r.Close(); $l }
$canavar = @{}; $gruplar = @{}
$mon = Sorgu "SELECT DISTINCT m.sSid, m.iMoney, m.sItem FROM K_NPCPOS1098 p JOIN K_MONSTER m ON m.sSid = p.NpcID WHERE p.ZoneID = $Bolge"
foreach ($m in $mon) {
  $ogeler = @()
  if ([int]$m.sItem -gt 0) {
    $satir = @(Sorgu "SELECT * FROM K_MONSTER_ITEM WHERE sIndex = $([int]$m.sItem)")
    if ($satir.Count) {
      for ($j = 1; $j -le 12; $j++) {
        $k = $j.ToString('00'); $hn = $satir[0]["iItem$k"]; $hy = $satir[0]["sPersent$k"] # NULL yuva (ör. 750-752'de 12. yuva) bos sayilir
        $no = if ($hn -is [DBNull]) { [int64]0 } else { [int64]$hn }; $yuzde = if ($hy -is [DBNull]) { 0 } else { [int]$hy }
        if ($no -ne 0 -and $yuzde -ne 0) {
          $ogeler += @{ no = $no; yuzde = $yuzde }
          if ($no -lt 100000000 -and -not $gruplar.ContainsKey([string]$no)) {
            $liste = @(Sorgu "SELECT ItemID FROM MAKE_ITEM_GROUP_RANDOM WHERE GroupNo = $no AND ItemID <> 0" | % { [int64]$_.ItemID })
            if (-not $liste.Count) {
              $g = @(Sorgu "SELECT * FROM MAKE_ITEM_GROUP WHERE iItemGroupNum = $no")
              if ($g.Count) { for ($i = 1; $i -le 200; $i++) { $v = [int64]$g[0]["iItem_$i"]; if ($v -ne 0) { $liste += $v } } }
            }
            $gruplar[[string]$no] = $liste
          }
        }
      }
    }
  }
  $canavar[[string]$m.sSid] = @{ para = [int]$m.iMoney; ogeler = $ogeler }
}
$c.Close()
$json = @{ canavar = $canavar; gruplar = $gruplar } | ConvertTo-Json -Depth 8 -Compress
[System.IO.File]::WriteAllText((Join-Path $hedef 'ganimet-ham.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "$($canavar.Count) canavar, $($gruplar.Count) esya grubu -> $hedef"
