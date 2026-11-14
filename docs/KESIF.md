# Aşama 0 — Keşif Raporu

Tarih: 2026-11-14

## 1. Dosyalar nerede?

Oyun dosyaları depo içindeki `oyun-dosyalari/` klasöründe **değil**, depo ile aynı seviyede
(`E:\Knight Online Browser Project\`) duruyor:

| Klasör / dosya | Boyut | İçerik |
|---|---|---|
| `SpecialKO/` | 2,9 GB | Çalışır durumda **client** (KnightOnline.exe + tüm veri dosyaları) |
| `Source Files/HomekoSource.rar` | 2,4 GB | **Server kaynak kodu** (C++), Launcher, anti-cheat, client kopyası |
| `Source Files/Myko_Source.rar` | 1,8 GB | Aynı kaynak kodun "Myko" sürümü + `DiabloKO` client kopyası |
| `Source Files/DXSDK-summ2004.rar`, `libcurl.rar` | 240 MB | Derleme bağımlılıkları (DirectX SDK, curl) |
| `Homeko Databaase/`, `Myko Database/` | 2 × 183 MB | **MS SQL Server veritabanı yedekleri** (`LILITH_HOMEKO.bak`, `LILITH_MYKO.bak`, `LILITH_LOG.bak`) |
| `Noah-System/` | 216 MB | Topluluk araçları: Nero All In One, Pentagram TBL editor, UIE (UI editörü), StudPE |
| `knight online ham proje.rar` | 8,3 GB | Yukarıdakilerin hepsinin tek arşivi + forum yedeği ve görseller (proje için gerekmiyor) |
| `servermykosonpanel.rar` | 20 MB | Web paneli (proje için gerekmiyor) |

> Not: `.rar` arşivleri açılmadı, sadece içerikleri listelendi. İncelenen birkaç kaynak dosyası
> geçici klasöre çıkarıldı. Orijinal dosyalara dokunulmadı.

## 2. Client (`SpecialKO/`)

- Client sürümü: **2369** (`version.h` → `__VERSION 2369`). Server ayarı `Server.ini`: `127.0.0.1:15107`.
- Toplam ~6.000 dosya. Dosya türleri:

| Tür | Adet | Ne olduğu (N3 motoru) |
|---|---|---|
| `.dxt` | 836 | Doku (DXT1/3/5 sıkıştırmalı resim, kendi başlığı var: `"…NTF"` + `DXT1`) |
| `.gtt` | 1096 | Arazi doku parçaları (terrain tile texture) |
| `.n3chr`, `.n3cpart`, `.n3cskins`, `.n3cplug` | ~700 | Karakter, karakter parçası (zırh/kafa), giyilebilir eşya |
| `.n3joint`, `.n3anim` | ~950 | İskelet ve animasyon |
| `.n3pmesh`, `.n3shape` | ~120 | Statik model (progressive mesh) ve nesneler |
| `.n3scene`, `.n3camera`, `.n3light`, `.n3sky` | ~170 | Sahne, kamera, ışık, gökyüzü |
| `.n3fxplug` + `fx/` | ~250 | Efektler (büyü, ateş vb.) |
| `.gtd`, `.gmd`, `.tct`, `.tlt`, `.glo`, `.gev`, `.gfo` | ~60'ar | Harita (zone) verisi: yükseklik, renk haritası, çim, ışık, olay vb. |
| `.opd`, `.opdext`, `.opdsub` | ~170 | Harita üzerindeki nesnelerin (ağaç, bina) listesi |
| `.tbl` | 246 | Oyun tabloları (item, skill, NPC…) — **şifreli** |
| `.ogg` | 506 | Ses/müzik (tarayıcı doğrudan çalabilir) |
| `.lilith` | 202 | Bu sunucuya özel (LilithACS anti-cheat/arayüz) dosyalar |
| `.uif` (UI/) | – | Arayüz pencere tanımları (şifreli; Myko arşivinde `UIF Decryptor.exe` var) |
| `Item/`, `Object/` | – | `.hdr` + `.src` paket dosyaları (çok sayıda modeli tek dosyada tutuyor) |

- **`.tbl` şifrelemesi:** Tüm tabloların ilk 16 baytı aynı (`4C 26 43 7F 80 F1 57 98 …`).
  Elimizdeki `N3TableBase.h` eski, basit XOR şifresini gösteriyor (`0x0816 / 0x6081 / 0x1608` anahtarları),
  ama 2369 sürümü bunun üstüne ek bir katman kullanıyor gibi görünüyor. `Pentagram TBL editor`
  içinde `Encryption` klasörü var; Aşama 1'de oradan ve hex incelemeden çözülecek.

## 3. Kaynak kod

### Var olanlar ✅
- **Server (tamamı, C++):** `LILITH_Game-Server/`
  - `GameServer/` — ~170 dosya: oyun mantığı (hareket, savaş, skill, chat, envanter, NPC, olaylar…)
  - `LogInServer/` — giriş sunucusu
  - `shared/` — ağ katmanı ve protokol: `KOSocket.cpp`, `Packet.h`, `packets.h` (opcode listesi),
    `JvCryption.cpp` (paket şifreleme), `lzf.cpp` (sıkıştırma), `crc32.h`, `SMDFile.cpp` (server harita dosyası)
  - `scripting/` — ~1000 Lua dosyası (görev / NPC script'leri)
  - `x64/Debug/` — **derlenmiş** `GameServer.exe`, `LogInServer.exe` ve `.ini` ayarları
- **Launcher kaynak kodu** ve **anti-cheat kaynak kodu** (`LILITH_Anticheat/Pearl Guard`).
- **Kısmi client motoru (N3BASE):** Anti-cheat içinde ~48 dosya: `N3Base`, `N3Texture`,
  `N3TableBase`, `N3Transform`, `N3UI*`, `GameDef.h`. Doku ve tablo formatı için çok değerli.

### Eksik olanlar ❌
- **Client'ın tam kaynak kodu yok.** (`KnightOnline.rar` içinde sadece `KnightOnline.exe` var.)
  Yani model, harita ve animasyon formatlarının (`.n3chr`, `.n3pmesh`, `.gtd`, `.opd`…) okuma kodu elimizde değil.
  → Çözüm: hex inceleme + açık kaynak topluluk projelerindeki (ör. OpenKO / KnightOnline client kaynakları)
  bilinen format bilgileri. Bunu kullanmak için ayrıca izin isteyeceğim.

## 4. Protokol (koddan doğrulanan ilk bulgular)

`shared/KOSocket.cpp` incelendi:
- Her paket `0xAA55` (ağda `AA 55`) ile başlar, `0x55AA` (ağda `55 AA`) ile biter. Arada 2 bayt uzunluk ve veri var.
- Şifreleme: `CJvCryption` — 64 bit anahtar, bağlantı başında anahtar değişimi
  (`m_usingCrypto` açılınca), gelen paketlerde CRC32 kontrolü + sıra numarası.
- Büyük paketler **LZF** ile sıkıştırılır (`SendCompressed`: CRC32 + sıkıştırılmış veri).
- Ayrıntılar Aşama 4'te `docs/protokol.md` dosyasına yazılacak.

## 5. Server türü ve veritabanı

- Server türü: **OpenKO / KO açık kaynak server tabanlı**, "LILITH" adıyla özelleştirilmiş,
  1098/2369 sürüm hedefli bir **Myko** (eski tarz) server. İki varyant var: **Homeko** ve **Myko**.
  Kaynak kodlar büyük ölçüde aynı.
- **Myko veritabanı sürümü** (`LILITH_MYKO.bak` ham baytlarından okundu):
  - Yedek **SQL Server 2022** (`MSSQL16`) ile alınmış. Geri yüklemek için SQL Server 2022 veya daha yenisi gerekli.
  - `VERSION` (yama) tablosunda 1097–1114 arası yama kayıtları görünüyor (ayrıca 2401, 2450 izleri var;
    bunlar silinmiş eski kayıtlar olabilir, SQL Server'a yüklenince kesinleşecek).
  - Myko server kaynak kodu da client protokol sürümü olarak **2369** kullanıyor; `LogInServer.ini` başlığı "v1098 Myko Server".
- Veritabanı: **Microsoft SQL Server** (`.bak` yedekleri). Bu bilgisayarda SQL Server **kurulu değil**.
  Server'ı çalıştırmak için SQL Server (ücretsiz Express/Developer sürümü) kurup yedeği geri yüklemek gerekecek.

## 6. Bu bilgisayardaki araçlar

| Araç | Durum |
|---|---|
| WinRAR (UnRAR) | ✅ var |
| Python | ✅ var (Windows Store kısayolu; gerçekten kurulu mu ilk kullanımda kontrol edilecek) |
| Node.js | ❌ yok — client ve köprü için kurulmalı |
| SQL Server | ❌ yok — server'ı çalıştırmak için gerekli |
| 7-Zip | ❌ yok (gerekli değil) |

## 7. Özet: elimizde ne var, ne eksik?

| | Durum |
|---|---|
| Client veri dosyaları (model, doku, harita, ses, tablo) | ✅ Tam |
| Server kaynak kodu + derlenmiş exe | ✅ Tam |
| Paket protokolü, şifreleme, sıkıştırma kodu | ✅ Var (server tarafı) |
| Veritabanı yedeği | ✅ Var (SQL Server gerekli) |
| Tablo okuma kodu | 🟡 Eski sürümü var; 2369 şifrelemesi çözülecek |
| Doku (`.dxt`) okuma kodu | 🟡 `N3Texture.cpp` var |
| Model / animasyon / harita okuma kodu | ❌ Yok — hex inceleme gerekli |
| Client kaynak kodu (oyun mantığı, UI) | ❌ Yok — paketlerin client tarafı server kodundan çıkarılacak |

## 8. Açık sorular / önerilen sonraki adımlar

1. **Klasör düzeni:** CLAUDE.md dosyaların `oyun-dosyalari/` içinde olmasını bekliyor. Seçenekler:
   (a) dosyaları oraya taşımak, (b) `oyun-dosyalari/` içinde mevcut klasörlere Windows bağlantısı (junction) açmak
   — taşımadan, yer kaplamadan. (b) önerilir.
2. **Hangi varyant?** Homeko mu Myko mu kullanılacak? (Client olarak `SpecialKO` = Homeko görünüyor.)
3. Server kaynak kodunun sadece okunması gereken kısımları (`shared/`, `GameServer/`, `LogInServer/`)
   `oyun-dosyalari/kaynak/` altına açılmalı ki protokol incelemesi kolay olsun.
4. Node.js kurulumu (Aşama 3–4 için).
