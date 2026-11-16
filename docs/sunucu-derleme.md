# Myko sunucusunu derleme ve yerelde çalıştırma (2026-11-16)

Amaç: Aşama 4'ü (ağ bağlantısı) denemek için kaynak kodu elimizde olan Myko sunucusunu kendimiz derleyip yerelde çalıştırmak. Tüm çıktılar `oyun-dosyalari/derleme/` altındadır (git'e girmez).
Çıkarılmış orijinal kaynağa (`oyun-dosyalari/kaynak/LILITH_Game-Server`) dokunulmaz; derleme **kopyası** `oyun-dosyalari/derleme/LILITH_Game-Server` içinde değiştirilir.

## 1. Gerekenler
- **Visual Studio 2022 Build Tools** (C++ iş yükü + Windows 11 SDK 22621): `winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--passive --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.Windows11SDK.22621 --includeRecommended"` (UAC onayı ister). Çözümün araç takımı `v143`.
- SQL Server Express (`.\SQLEXPRESS`) üzerinde `LILITH_MYKO` ve `LILITH_LOG` veritabanları (`Myko Database\*.bak` geri yüklenir).
- Kullanıcıya özel ODBC kayıtları (yönetici gerekmez, `HKCU\Software\ODBC\ODBC.INI`): `KO_MAIN` ve `KO_GAME` → `LILITH_MYKO`, `KO_LOG` → `LILITH_LOG`; hepsi `Driver=C:\Windows\system32\SQLSRV32.dll`, `Server=.\SQLEXPRESS`, `Trusted_Connection=Yes` (SQL Express yalnızca Windows kimlik doğrulaması kabul ettiği için ini'deki `UID/PWD` yok sayılır).

## 2. Derleme kopyasında yapılan 3 değişiklik (orijinal kaynakta yok)
1. **BugTrap kaldırıldı:** `shared/Explosion.cpp` içinde `ExplosionHandle::SetupExceptionHandler()` boş bırakıldı ve `shared.vcxproj`'dan `BugTrapx64.lib` satırı silindi (kütüphane pakette yok; çökme raporu gönderen koddu, yerelde gereksiz).
2. **`libcurl-x64.lib` üretildi:** `Source Files\libcurl.rar` yalnızca `libcurl.dll` içeriyor; `dumpbin /exports` + `lib /def` ile import kütüphanesi çıkarıldı (`libcurl/libcurl-x64.lib`), başlıklar `GameServer/curl/` içinde zaten var.
3. **`zlib-x64.lib` bağlantıdan çıkarıldı:** `proj-GameServer.vcxproj` içinde; kodda doğrudan zlib çağrısı yok.

## 3. Derleme
```
MSBuild.exe LILITH_Game-Server.sln /p:Configuration=Release /p:Platform=x64 /m /v:minimal
```
Çıktı `x64/Release/`: `GameServer.exe` (oyun sunucusu, veritabanı işi de içinde), `LogInServer.exe`, `libcurl.dll`. Yalnızca derleyici uyarıları vardır (hata yok). Defender derlenen dosyalarda bir şey bulmadı; **istisna eklenmedi**.

## 4. Çalıştırma klasörü: `oyun-dosyalari/derleme/calistir/`
`Depo\*` (ini, `Map\`, `Quests\`…) + iki `.exe` + `libcurl.dll` kopyalanır. `GameServer.ini` içinde `LOGIN_IP` ve `SERVER_IP_00` **`127.0.0.1`** yapılır (varsayılanlar başka bir sunucunun adresiydi).
Başlatma/durdurma: `kopru/myko-baslat.ps1`, `kopru/myko-durdur.ps1` (önce LogInServer, sonra GameServer; konsol girdisi için programlara hiç veri yazmayan bir boru bağlanır, çıktılar `login.log` / `game.log`).
Portlar: login 15100 (+ 15101–15109 açık), oyun 15001, login↔oyun iç bağlantısı 13001. GameServer açılışta ~11 bin NPC'yi oluşturur (~20 sn).

## 5. Deneme hesabı
Veritabanında (`TB_USER`) tek hesap ve onun tek karakteri var: karakter `Lilith` (El Morad, ırk 13, sınıf 206, seviye 65, bölge 21 Moradon). Hesap adı/şifresi depoya yazılmaz; `TB_USER` tablosundan okunup `node src/deneme-myko.ts <hesap> <şifre>` (ya da `KO_HESAP` / `KO_SIFRE`) ile verilir.

## 6. Eski deneme (atıldı)
Önce `Knight All in one` içindeki hazır 1298 `.exe` sunucuları denendi (docs/protokol.md §11); Defender `Ebenezer.exe`'yi Trojan olarak işaretlediği için bırakıldı.
