# Yerel Myko sunucusunu durdurur. Kullanım: powershell -ExecutionPolicy Bypass -File kopru\myko-durdur.ps1
foreach ($ad in 'GameServer', 'LogInServer') {
  $p = Get-Process -Name $ad -ErrorAction SilentlyContinue
  if ($p) { $p | Stop-Process -Force; "durduruldu: $ad" } else { "çalışmıyor: $ad" }
}
# Boş girdi borusunu tutan yardımcı süreçleri de kapat
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -match 'Start-Sleep 86400' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
