# Yerel deneme sunucusunu durdurur (başlatmanın tersi sırayla). Kullanım: powershell -ExecutionPolicy Bypass -File kopru\sunucu-durdur.ps1
foreach ($ad in 'login-server', 'Aujard', 'Ebenezer', 'AI Server', 'billing-server') {
  $p = Get-Process -Name $ad -ErrorAction SilentlyContinue
  if ($p) { $p | Stop-Process -Force; "durduruldu: $ad" } else { "çalışmıyor: $ad" }
}
