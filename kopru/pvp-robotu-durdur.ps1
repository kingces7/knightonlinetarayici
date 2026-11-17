# PvP robotunu durdurur.
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*pvp-robotu.ts*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; "durduruldu: $($_.ProcessId)" }
