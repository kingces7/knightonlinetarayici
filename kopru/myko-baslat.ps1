# Kaynaktan derlediğimiz Myko sunucusunu (LogInServer + GameServer) yerelde başlatır. Ayrıntı: docs/sunucu-derleme.md
# Kullanım:  powershell -ExecutionPolicy Bypass -File kopru\myko-baslat.ps1
$ErrorActionPreference = 'Stop'
$run = Join-Path (Split-Path $PSScriptRoot -Parent) 'oyun-dosyalari\derleme\calistir'
if (-not (Test-Path "$run\GameServer.exe")) { throw "Derlenmiş sunucu yok: $run (docs/sunucu-derleme.md'ye bak)" }
foreach ($d in 'KO_MAIN', 'KO_GAME', 'KO_LOG') {
  if (-not (Get-ItemProperty "HKCU:\Software\ODBC\ODBC.INI\$d" -ErrorAction SilentlyContinue)) { throw "ODBC kaydı $d yok (docs/sunucu-derleme.md)" }
}
function Baslat([string]$exe, [string]$log) {
  if (Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exe)) -ErrorAction SilentlyContinue) { "zaten çalışıyor: $exe"; return }
  # Konsol girdisi: hiçbir şey yazmayan uzun ömürlü bir boru (EOF gelmesin diye)
  $psi = New-Object Diagnostics.ProcessStartInfo 'cmd.exe'
  $psi.Arguments = "/c powershell -NoProfile -Command Start-Sleep 86400 | `"$run\$exe`" > `"$run\$log`" 2>&1"
  $psi.WorkingDirectory = $run; $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
  [void][Diagnostics.Process]::Start($psi)
}
Baslat 'LogInServer.exe' 'login.log'; Start-Sleep 4
Baslat 'GameServer.exe' 'game.log'
"GameServer açılıyor (NPC'ler yükleniyor, ~20 sn)..."
Start-Sleep 22
$portlar = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { 15100, 15001 -contains $_.LocalPort } | Sort-Object LocalPort | ForEach-Object { $_.LocalPort }
"dinlenen portlar: $($portlar -join ', ')  (beklenen: 15001, 15100)"
