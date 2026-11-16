# Yerel deneme sunucusunu (resmî 1298 sunucu .exe'leri) doğru sırayla başlatır. Yalnızca bu bilgisayarda (127.0.0.1) çalışır.
# Gereksinimler (bir kez kurulur, bkz. docs/protokol.md §11):
#   - SQL Server Express'te "KN_online" veritabanı (Knight All in one\Knight Online Gerekli Db\JPKO_0.1a.bak geri yüklenmiş)
#   - Kullanıcıya özel ODBC kaydı "KN_online" (HKCU\Software\ODBC\ODBC.INI\KN_online, Trusted_Connection=Yes)
#   - Sunucu dosyaları oyun-dosyalari\sunucu-1298 içine kopyalanmış (git'e girmez)
# Kullanım:  powershell -ExecutionPolicy Bypass -File kopru\sunucu-baslat.ps1 -Eminim
#
# ⚠ GÜVENLİK UYARISI (2026-11-16): Windows Defender, bu paketteki Ebenezer.exe'yi "Trojan:Win32/Bitrep.B" (ciddiyet: yüksek)
# olarak işaretledi. Bu ad itibara (reputation) dayalı bir tespittir ve eski imzasız sunucu programlarında yanlış alarm olabilir,
# ama doğrulayamıyoruz. Bu yüzden betik varsayılan olarak ÇALIŞMAZ; yalnızca -Eminim verilirse çalışır. Defender'a istisna EKLENMEZ.
# Güvenli yol: Myko sunucu KAYNAĞINI derleyip onu çalıştırmak (kaynak okunabilir).
param([switch]$Eminim)
if (-not $Eminim) { Write-Host 'Durduruldu: bu sunucu programlarını Defender "Trojan:Win32/Bitrep.B" olarak işaretledi. Okumak için dosya başındaki nota bak; yine de çalıştırmak için -Eminim ekle.'; exit 1 }
$ErrorActionPreference = 'Stop'
$H = Join-Path (Split-Path $PSScriptRoot -Parent) 'oyun-dosyalari\sunucu-1298'
if (-not (Test-Path $H)) { throw "Sunucu klasörü yok: $H" }
if (-not (Get-ItemProperty 'HKCU:\Software\ODBC\ODBC.INI\KN_online' -ErrorAction SilentlyContinue)) { throw 'ODBC kaydı KN_online yok (kopru\sunucu-baslat.ps1 başındaki gereksinimlere bak)' }

# Not: Start-Process (kabuk) internetten inen dosyalarda güvenlik uyarısı çıkarabilir; doğrudan süreç oluşturuyoruz.
function Baslat([string]$ad, [string]$exe, [string]$klasor, [int]$bekle) {
  if (Get-Process -Name $ad -ErrorAction SilentlyContinue) { "zaten çalışıyor: $ad"; return }
  $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $H $exe)
  $psi.WorkingDirectory = Join-Path $H $klasor; $psi.UseShellExecute = $false
  $p = [Diagnostics.Process]::Start($psi)
  Start-Sleep $bekle
  if ($p.HasExited) { throw "$ad hemen kapandı (kayıt dosyalarına bak: $klasor)" }
  "başladı: $ad (id $($p.Id))"
}
# SIRA ÖNEMLİ: Aujard, Ebenezer'in açtığı paylaşılan belleğe bağlanır; bu yüzden Ebenezer ondan ÖNCE başlamalıdır.
Baslat 'billing-server' 'Billing server\billing-server.exe' 'Billing server' 3
Baslat 'AI Server'      'AIServer\AI Server.exe'            'AIServer'        6
Baslat 'Ebenezer'       'Ebenezer\Ebenezer.exe'             'Ebenezer'        10
Baslat 'Aujard'         'Aujard\Aujard.exe'                 'Aujard'          6
Baslat 'login-server'   'Login server\login-server.exe'     'Login server'    5
$dinleyen = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { 15100, 15001, 15200, 10020 -contains $_.LocalPort } | Sort-Object LocalPort | ForEach-Object { $_.LocalPort }
"dinlenen portlar: $($dinleyen -join ', ')  (beklenen: 10020, 15001, 15100, 15200)"
