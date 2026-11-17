# KEAdmin karakterine (admin226 hesabı) High class Chitin Shell seti +8 ve Giantic Axe +8 (iki elli) giydirir. Karakter oyunda değilken çalıştırılmalı (oyundayken çıkışta ezilir).
$c = New-Object System.Data.SqlClient.SqlConnection 'Server=.\SQLEXPRESS;Database=LILITH_MYKO;Integrated Security=True'; $c.Open()
$q = $c.CreateCommand(); $q.CommandText = "SELECT strItem FROM USERDATA WHERE strUserID='KEAdmin'"
[byte[]]$b = $q.ExecuteScalar()
"uzunluk: $($b.Length)"
$set = @{ 6 = 135750278; 1 = 206003008; 4 = 206001008; 10 = 206002008; 12 = 206004008; 13 = 206005008 }
foreach ($k in $set.Keys) {
  $sure = if ($k -eq 6) { 15000 } else { 22625 }
  $yeni = [BitConverter]::GetBytes([uint32]$set[$k]) + [BitConverter]::GetBytes([uint16]$sure) + [BitConverter]::GetBytes([uint16]1)
  for ($i = 0; $i -lt 8; $i++) { $b[$k * 8 + $i] = $yeni[$i] }
}
$u = $c.CreateCommand(); $u.CommandText = "UPDATE USERDATA SET strItem = @b WHERE strUserID='KEAdmin'"
$p = $u.Parameters.Add('@b', [System.Data.SqlDbType]::VarBinary, 600); $p.Value = $b
"guncellendi: $($u.ExecuteNonQuery())"
$c.Close()
