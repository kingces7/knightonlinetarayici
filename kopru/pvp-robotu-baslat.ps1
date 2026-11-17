# PvP robotunu arka planda başlatır (kotest1 / PvPRobot, Moradon). Çıktı: oyun-dosyalari\derleme\calistir\pvp-robot.log. Sunucu açıkken çalıştırılmalı.
$kok = Split-Path $PSScriptRoot -Parent
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*pvp-robotu.ts*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
$log = Join-Path $kok 'oyun-dosyalari\derleme\calistir\pvp-robot.log'
Start-Process -WindowStyle Hidden -FilePath node -ArgumentList 'src/pvp-robotu.ts' -WorkingDirectory (Join-Path $kok 'kopru') -RedirectStandardOutput $log -RedirectStandardError ($log + '.hata')
"PvP robotu başlatıldı (log: $log)"
