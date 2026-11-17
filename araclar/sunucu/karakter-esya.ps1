# Bir karakterin ekipman yuvalarına (0–13) eşya yazar: -Karakter KoTest -Liste "yuva:eşyaNo:dayanım,..."  (önceki ekipman silinir). Karakter oyunda değilken çalıştırılmalı.
param([string]$Liste, [string]$Karakter = 'KoTest')

$c = New-Object System.Data.SqlClient.SqlConnection 'Server=.\SQLEXPRESS;Database=LILITH_MYKO;Integrated Security=True'; $c.Open()
$q = $c.CreateCommand(); $q.CommandText = "SELECT strItem FROM USERDATA WHERE strUserID='$Karakter'"
[byte[]]$b = $q.ExecuteScalar()
for ($i = 0; $i -lt 14 * 8; $i++) { $b[$i] = 0 }
foreach ($p in ($Liste -split ',' | Where-Object { $_ })) { $kv = $p -split ':'; $k = [int]$kv[0]; $n = [uint32]$kv[1]; $sure = [uint16]$kv[2]
  $yeni = [BitConverter]::GetBytes($n) + [BitConverter]::GetBytes($sure) + [BitConverter]::GetBytes([uint16]1)
  for ($i = 0; $i -lt 8; $i++) { $b[$k * 8 + $i] = $yeni[$i] } }
$u = $c.CreateCommand(); $u.CommandText = "UPDATE USERDATA SET strItem = @b WHERE strUserID='$Karakter'"
$pp = $u.Parameters.Add('@b', [System.Data.SqlDbType]::VarBinary, 600); $pp.Value = $b; [void]$u.ExecuteNonQuery(); $c.Close()
