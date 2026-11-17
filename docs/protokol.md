# Ağ protokolü (Aşama 4) — Myko sunucu kaynağından çıkarıldı

Kaynak: `LILITH_Game-Server` (Myko_Source.rar; `shared/`, `LogInServer/`, `GameServer/`). Karşılaştırma için GPLv3 açık kaynak 1299 sunucusuna da bakıldı
(`Knight-Online-Project-master`, yalnızca "okuyup öğrenme" amacıyla; koddan kopyalama yok).
**Client (KnightOnline.exe) kaynağı yok**: aşağıdakiler *sunucunun* kodudur. Client'ın gerçekte ne gönderdiği henüz bir bağlantı yakalamasıyla doğrulanmadı (bkz. "Doğrulanacaklar").

## 1. Genel yapı
Oyun **iki ayrı sunucuya** bağlanır; ikisi de TCP üzerinde aynı çerçeve biçimini kullanır:

| Sunucu | Port | Görevi |
|---|---|---|
| Login server | **15100** | sürüm sorma, giriş (hesap/şifre), sunucu listesi, haber |
| Oyun sunucusu (Ebenezer) | **15001** (`GameServer.ini` `PORT`) | karakter seçimi ve oyunun kendisi |

(AI sunucusu ve Aujard sadece sunucular arası konuşur; client'ın işi değil.) Tarayıcı TCP açamaz; `kopru/` WebSocket ↔ TCP köprüsü her iki porta da bağlanacak.

## 2. Çerçeve (her iki sunucuda aynı)
```
AA 55 | uzunluk (uint16) | veri (uzunluk bayt) | 55 AA
```
- Sayılar **little-endian**. `veri` = 1 bayt **opcode** + gövde. Uzunluk opcode'u da sayar.
- Üst sınırlar (alma tamponu): login server **256 bayt**, oyun sunucusu **64 KB**. Daha büyük paket gelirse ya da bir paket 4'ten fazla TCP parçasına bölünürse sunucu bağlantıyı keser; bu yüzden köprü her paketi **tek parça** göndermeli.
- Opcode 1 bayttır; tanımlar `shared/packets.h` (`WIZ_*`, oyun sunucusu) ve `LoginSession.h` (`LS_*`, login server).

## 3. Veri tipleri (`ByteBuffer`)
`uint8/16/32/64`, `int8/16/32/64`, `float` (4 bayt) düz little-endian. **Yazı**: önce uzunluk, sonra baytlar (sonlandırıcı yok):
**2 bayt uzunluk (varsayılan, "DByte")**; bazı paketlerde kaynak açıkça `SByte()` çağırır ve uzunluk 1 bayt olur (ör. `WIZ_GAMESTART` isteği, `WIZ_MYINFO` içindeki ad). Bir paketin hangisini kullandığı kaynaktaki `SByte()`/`DByte()` çağrılarından anlaşılır; yanlış seçilirse sunucu bağlantıyı keser. Kodlama ANSI (Windows-1252). `bool` = 1 bayt.

## 4. Şifreleme (`JvCryption`) — yalnızca login server'da
- Sabit "özel anahtar": Myko kaynağında ve açık kaynak sunucuda `0x1207500120128966`; **resmî 1298 sunucu `.exe`'sinde klasik `0x1234567890123456`** (gerçek sunucuyla doğrulandı, bkz. §11). Sunucu rastgele 64 bit **açık anahtar** üretir; `tkey = açık ^ özel`. Kütüphanede `JvSifre(açık, özel)` ve `PaketKanali.sifrelemeyiAc(açık, özel)` ikinci parametre alır.
- Şifre akışı (her iki yönde aynı işlem): `rkey=2157; lkey=(len*157)&0xFF; her i için: çıkış[i] = ((giriş[i] ^ ((rkey>>8)&0xFF)) ^ tkey_bayt[i%8]) ^ lkey; rkey *= 2171` (`rkey` int, taşma serbest).
- Şifreli paketin içi: `[sıra no uint32][opcode][gövde][CRC32 uint32]`; CRC32 başlangıç değeri `-1`, sıra no her paketle +1 (ilk beklenen 1). Sunucu→client yönünde ilk 5 bayt sabit başlık (`FC 1E`, sıra, 0).
- Etkinleşme: login server'a client `LS_CRYPTION (0xF2)` gönderir → sunucu 8 bayt açık anahtarı düz metin olarak yollar ve **bundan sonra** şifreli konuşur.
- **Oyun sunucusu (Myko) hiç şifrelemiyor**: `EnableCrypto()` oyun sunucusunda hiç çağrılmıyor; `WIZ_VERSION_CHECK` cevabındaki iki `uint64` sıfır. Açık kaynak sunucu ise
  sürüm cevabında anahtar verip şifrelemeyi açıyor. Yani **oyun sunucusu paketleri Myko'da düz metin**; client'ımız anahtar `0` ise şifrelemeden, değilse şifreli konuşacak şekilde yazılmalı.
- Büyük paketler (≥500 bayt) isteğe bağlı sıkıştırılır: `WIZ_COMPRESS_PACKET (0x42)` gövdesi = `sıkıştırılmış uzunluk (u32), açık uzunluk (u32), CRC32 (u32), LZF verisi`; içi `[opcode][gövde]`.

## 5. Login server akışı (port 15100)
1. `LS_VERSION_REQ (0x01)` → cevap: `int16 en son sürüm` (DB `VERSION` tablosu; bizde 1299).
2. `LS_DOWNLOADINFO_REQ (0x02)` (`uint16 istemci sürümü`) → cevap: `ftp adresi, ftp yolu (yazı), uint16 indirilecek yama sayısı, yama adları…`. Tarayıcı client'ında yama yok → sayı 0 gelmeli (ya da hiç sorulmaz).
3. `LS_CRYPTION (0xF2)` → cevap: `uint64 açık anahtar` (düz metin), sonrası şifreli.
4. `LS_LOGIN_REQ (0xF3)`: gönderilen `hesap (yazı), şifre (yazı)` → cevap: `uint16 0, uint8 sonuç[, int16 premium (saat; -1 yok), hesap adı (yazı)]` (başarılıysa köşeli kısım gelir).
   Sonuç kodları: 1 başarılı, 2 hesap yok, 3 şifre yanlış, 4 yasaklı, 5 oyunda (cevap ek olarak IP, `uint16 15001`, hesap adı), 6 hata, 0x0F sözleşme, 0x10 OTP, 0xFF başarısız.
5. `LS_SERVERLIST (0xF5)` (`uint16 yankı`) → cevap: `yankı, uint8 sunucu sayısı`, her sunucu için: `lan ip, sunucu ip, sunucu adı (yazılar), int16 oyuncu sayısı (üst sınırı aşarsa -1), int16 sunucu no, int16 grup no, int16 oyuncu üst sınırı, int16 ücretsiz üst sınır, uint8 0, uint8 ekran tipi, Karus kral adı, Karus duyurusu, El Morad kral adı, El Morad duyurusu` (son dört yazı).
6. `LS_NEWS (0xF6)` → cevap: `"Login Notice", uint16 boyut, içerik` ya da `"Login Notice", "<empty>"`.
7. Diğerleri: `LS_KOREAKOLAUNCHER_PING (0x03)` (boş cevap), `LS_OTP (0xFA)`, `LS_OTP_SYNC (0xFD)`, `0xF7` (cevap `uint16 0`) — tek oyunculu/küçük sürümde gerekmeyebilir.

## 6. Oyun sunucusu akışı (port 15001)
Hesap giriş yapmadan yalnızca şunlar kabul edilir (aksi hâlde bağlantı kesilir): `WIZ_VERSION_CHECK`, `WIZ_LOGIN`, `WIZ_KICKOUT`, `XSafe (0xE9)`.
1. **`WIZ_VERSION_CHECK (0x2B)`** → cevap: `uint8 0, uint16 sürüm, uint8 0, uint64 0, uint64 0, uint8 0`.
2. **`WIZ_LOGIN (0x01)`**: `hesap (yazı), şifre (yazı)` → cevap: `int8 ulus[, uint32 0]` — **0 = ulus seçilmemiş, 1 = Karus, 2 = El Morad; −1 başarısız** (Myko'da gerçek çalıştırmada doğrulandı: hesap ulusu 2 → cevap `02 00 00 00 00`).
3. **`WIZ_SEL_NATION (0x05)`** (yeni hesap, ulus seç): `uint8 ulus` (1 = Karus, 2 = El Morad) → cevap `uint8 ulus` (0 = geçersiz).
4. **`WIZ_ALLCHAR_INFO_REQ (0x0C)`**: `uint8 1` → cevap: `uint8 1, uint8 1`, ardından 4 karakter yuvasının her biri için:
   `ad (yazı), uint8 ırk, uint16 sınıf, uint8 seviye, uint8 yüz, uint32 saç, uint8 bölge`, ardından 8 slot için `uint32 eşya no, uint16 dayanıklılık`
   (sıra: baş, göğüs, omuz, bacak, eldiven, ayak, sağ el, sol el). Boş yuva: ad boş, hepsi 0.
5. **`WIZ_NEW_CHAR (0x02)`**: `uint8 yuva(0–3), ad, uint8 ırk, uint16 sınıf, uint8 yüz, uint32 saç, uint8 STR, STA, DEX, INT, CHA` (toplam tam 300, her biri ≥ 50)
   → cevap `uint8 kod` (0 başarılı; diğer kodlar `NEWCHAR_*`).
6. **`WIZ_DEL_CHAR (0x03)`**: `uint8 yuva, ad, kimlik no (yazı)` → cevap `int8 sonuç, uint8 yuva`. *(Myko'da bu paket yoruma alınmış; çalışmıyor.)*
7. **`WIZ_SEL_CHAR (0x04)`**: `hesap (yazı), karakter adı (yazı), uint8 bInit (ilk girişte 1)` → cevap (başarılı):
   `uint8 1, uint8 bInit, uint8 bölge no, uint16 x, uint16 z, uint16 y, uint8 ulus`. Hata kodları: 2 hesap engelli, 3 ad çakışması, 5 bakım, 0 seçilemedi.
8. **`WIZ_GAMESTART (0x0D)`** iki aşamalı; istek gövdesi `uint8 aşama (1 ya da 2), karakter adı (yazı, tek bayt uzunluk)`. `1` gönderilince sunucu sırayla `WIZ_MYINFO (0x0E)` (karakterin tüm verisi), çevredeki oyuncular/NPC'ler
   (`WIZ_USER_INOUT 0x07`, `WIZ_NPC_INOUT 0x0A`), saat (`WIZ_TIME 0x13`), hava (`WIZ_WEATHER 0x14`), görev verisi, duyurular ve en sonda `WIZ_GAMESTART` yollar;
   client haritayı yükleyip `uint8 2` gönderince oyuncu dünyaya girer (`WIZ_USER_INOUT` ile belirir).
9. **`WIZ_MYINFO (0x0E)`** gövdesi (sırayla): `uint16 soket no, ad (yazı, tek bayt uzunluk), uint16 x, uint16 z, uint16 y (×10 ölçekli konum), uint8 ulus, uint8 ırk, uint16 sınıf, uint8 yüz, uint32 saç, uint8 rütbe, uint8 unvan, 0, 0, uint8 seviye, uint16 boş puan, uint64 azami deneyim, uint64 deneyim, uint32 NP, uint32 aylık NP, uint16 klan no, uint8 fame`,
   klan bloğu (klan yoksa `uint64 0, uint16 -1, uint32 0`), `4 bayt (2,3,4,5)`, `HP/azami HP, MP/azami MP, taşıma/azami, STR/STA/DEX/INT/CHA (her biri: değer + eşya bonusu), toplam vuruş, AC, 6 direnç, uint32 altın, uint8 yetki, 2 sıra bayt, 9 bayt skill puanları`,
   sonra tüm envanter yuvaları (`uint32 eşya no, uint16 dayanıklılık, uint16 adet, uint8 bayrak, uint16 kiralık süre`) ve devamı (kaynakta `UserInfoSystem.cpp` `SendMyInfo`). *(Envanter sonrası kuyruk henüz okunmadı.)*

## 7. Oyun içi paketler (Aşama 5'te çıkarılacak)
Tam opcode listesi: `shared/packets.h` (0x01–0x84, `WIZ_MOVE 0x06`, `WIZ_CHAT 0x10`, `WIZ_ATTACK 0x08`, `WIZ_MAGIC_PROCESS 0x31`, `WIZ_ITEM_MOVE 0x1F`, `WIZ_NPC_EVENT 0x20`, `WIZ_MERCHANT 0x68`, …).
Her biri için işleyici `GameServer/*Handler.cpp` içinde; ihtiyaç oldukça çıkarılıp bu belgeye eklenecek.

## 8. Myko'ya özgü: `XSafe` (0xE9) ve ACS
Myko'nun oyun sunucusu, kendi client'ındaki hile koruma bileşeniyle (`lilith.acs`, `LilithACS`) konuşan ek bir paket ailesi taşır (`XSafe`, alt opcode `0xA2…`; kalp atışı `0xA6`, bilgi `0xA3`, tablo özeti `22`…). Önemli bulgular:
- **Client bu paketleri göndermezse atılmayız**: kalp atışı zaman aşımı kodu yoruma alınmış (`User.cpp`: "XSafe_LASTCHECK alive timeout" kapalı; `XSafe_Main` boş).
- Sunucu giriş sonrası bazı **bilgi paketlerini kendiliğinden** `XSafe` olarak yollar (üst-sol bağlantılar, anti-AFK listesi, etkinlik listesi, hesap kaydı vb.); tarayıcı client'ı bunları yok sayabilir.
- Gönderilirse **kontrol edilir**: kalp atışında `md5("1X5" + "10001" + saat + bayrak + HESAPADI)` tutmazsa; `XSafe_General (22)`'de tablo özetleri ya da sabit sürüm yazısı tutmazsa **bağlantı kesilir**. Tarayıcı client'ı bunları hiç göndermeyerek sorundan kaçınır.
- Sonuç: tarayıcı client'ı `XSafe`'i uygulamak zorunda değil; yalnızca gelen `0xE9` paketlerini atlamalı.

## 9. Doğrulanacaklar (client kaynağı olmadığı için)
1. Client'ın login server'a **gerçekte hangi sırayla** ne gönderdiği (özellikle `LS_CRYPTION` kullanılıyor mu, `LS_VERSION_REQ` ilk paket mi). Yöntem: orijinal sunucu `.exe`'leri (`Knight All in one\Untouched Server Files v1298`) + veritabanı yedeği ile yerel bir sunucu kurup bir köprü üzerinden trafik kaydı almak.
2. Oyun sunucusunda anahtar `0` iken client'ın şifreleme açıp açmadığı (kaynaktaki "0 = şifresiz" notu bunu destekliyor ama doğrulanmadı).
3. `LS_SERVERLIST` alanlarının tam tipleri ve `WIZ_MYINFO` envanter sonrası kuyruğu (kaynaktan tam okunup test edilecek).
4. Hangi sunucuyu kullanacağız: Myko sunucu kaynağı (derlemek gerekir, Visual Studio yok) mı, yoksa elimizdeki çalışır `.exe`'ler mi (kaynak yok, ama hazır)? Protokol ikisinde de büyük ölçüde aynı; fark: oyun sunucusu sürüm cevabında anahtar verip vermemesi.

## 10. Uygulama durumu (`kopru/`)
- ✅ `kopru/protokol/` (tarayıcıda ve Node'da çalışır, Node'a özgü şey kullanmaz): `crc32.ts`, `jvSifre.ts` (elle hesaplanmış vektörlerle test edildi), `ikili.ts` (okuyucu/yazıcı), `kanal.ts` (çerçeve + şifreli/düz kanal), `opcode.ts`.
- ✅ `kopru/src/kopru.ts`: WebSocket ↔ TCP köprüsü; baytları anlamadan taşır. Güvenlik: hedefler yalnızca ayardaki yollara (`/giris` → 15100, `/oyun` → 15001) bağlı; yalnızca `127.0.0.1`'de dinler; `Origin` yalnızca yerel adreslerden kabul. Çalıştırma: `cd kopru && npm run baslat`.
- ✅ Testler (`npm test`, 16 adet): protokol birimleri + köprü + köprü üzerinden sahte login server ile uçtan uca. Sahte sunucu C++ koduna göre ayrıca yazıldı (kanal.ts'i kullanmıyor).
- ✅ Gerçek (resmî 1298) sunucularla deneme yapıldı: giriş, sunucu listesi, haber, oyun sunucusu sürüm/şifreleme/giriş çalıştı (§11). ⚠ Defender Ebenezer.exe'yi Trojan olarak işaretledi; o programlar artık çalıştırılmıyor.
- ⬜ Sonra: oyun sunucusu akışı (sürüm → giriş → karakter listesi → karakter seç → `GAMESTART`), `WIZ_MYINFO` ayrıştırıcı, mevcut tek oyunculu oyuna bağlama.

## 11. Gerçek sunucu doğrulaması (resmî 1298 `.exe` sunucuları, 2026-11-16)
Sunucular `Knight All in one\Untouched Server Files v1298` içindeki programlardır (kopyası `oyun-dosyalari\sunucu-1298`, SQL Express'te `KN_online` + kullanıcıya özel ODBC kaydı ile).
Köprü üzerinden **kendi protokol kütüphanemizle** (`kopru/src/deneme-giris.ts`) denendi. **Bu sunucu Myko'dan farklıdır; bulgular aşağıda, Myko için §5–6 geçerlidir.**

**Login server (15100) — bu sürümde:**
- **Şifreleme yok**: `0xF2` (`LS_CRYPTION`) ve `0x03` tanınmaz, sunucu bağlantıyı kapatır. Bütün paketler düz gider.
- **Yazılar 2 baytlık uzunlukla** (`05 00 "admin"`). 1 baytlık uzunlukla gönderilen giriş paketi bağlantıyı kapattırır.
- `0x01` sürüm → `i16 1299`. `0x02` indirme bilgisi (`u16 sürüm`) → `yazı ftp adresi, yazı yol, u16 yama sayısı`.
- `0xF3` giriş (`yazı hesap, yazı şifre`) → yalnızca **`u8 sonuç`**: 1 başarılı, 2 hesap yok, 3 şifre yanlış (Myko'daki gibi baştaki `u16 0` ve hesap adı yok).
- `0xF5` sunucu listesi (`u16 yankı`) → `u8 sayı`, her sunucu için `yazı ip, yazı ad, i16 oyuncu` (Myko'nunki çok daha uzun, §5).
- `0xF6` haber → `yazı başlık, yazı metin`.

**Oyun sunucusu (15001):**
- `0x2B` sürüm kontrol (boş gövde) → cevap **LZF ile sıkıştırılmış `0x42` paketi** içinde gelir: `u16 sıkıştırılmış uzunluk, u16 açık uzunluk, u32 CRC (0), LZF verisi`; açılınca `[0x2B] u16 sürüm (1298), u64 açık anahtar, u8 sayaç`. Gerçek yakalama `protokol.test.ts` içinde test verisi olarak duruyor.
- Şifreleme: yukarıdaki açık anahtar + **klasik özel anahtar `0x1234567890123456`** ile açılır; client→sunucu biçimi `[sıra u32][opcode][gövde][CRC32]` (sıra no 0 ya da 1 kabul edildi), aynen §4. Yanlış anahtar/biçimde sunucu **sessiz kalır**.
- Yazılar burada da **2 baytlık uzunluk**: `0x01` giriş (`yazı hesap, yazı şifre`) → `i8 sonuç` (0 başarılı; 1 baytlık uzunlukla gönderilince `0xFF` = başarısız). Aujard kaydında `ACCOUNT_LOGIN('admin','admin')` göründü, yani istek veritabanına kadar ulaştı.
- `0x0C` tüm karakter bilgisi → hep **172 bayt**: `01` + 171 sıfır (istek gövdesi ne olursa olsun; hesapta `Can_SnoxD` karakteri olmasına rağmen). **Çözülmedi** — Aujard'ın `LOAD_CHAR_INFO` çağrısı bu veritabanında (parametre `@nRet`) farklı olabilir ya da 1298 liste biçimi ayrı. Sonraki adım.
- `0x05` ulus seç (`u8 1`) → `u8 0`.

**Güvenlik notu:** Çalıştırma sırasında Windows Defender `Ebenezer.exe` kopyasını **Trojan:Win32/Bitrep.B** (itibar tabanlı tespit, ciddiyet yüksek) olarak işaretledi; ilk çalıştırmalarda (yaklaşık 10 dakika) engellemedi, sonradan engelledi. Doğrulayamadığımız için bu programlar bir daha çalıştırılmayacak (`kopru/sunucu-baslat.ps1` varsayılan olarak reddeder). Protokol bulgularının geri kalanı için Myko sunucu **kaynağı** derlenip kullanılmalı.
**Sunucuyu başlatma sırası** (bilgi olarak): billing → AI → **Ebenezer** → Aujard → login. Aujard, Ebenezer'den önce açılırsa "Main Shared Memory Initialize Fail" verip kapanır.

## 12. Myko sunucusuyla gerçek doğrulama (kaynaktan DERLENEN sunucu, 2026-11-16)
Myko sunucusu (`LILITH_Game-Server`) Visual Studio 2022 Build Tools ile **kaynaktan derlendi ve yerelde çalıştırıldı**; köprü üzerinden `kopru/src/deneme-myko.ts` ile denendi. Derleme/çalıştırma adımları: `docs/sunucu-derleme.md`. Defender derlenen dosyalarda bir şey bulmadı.

**Login server (15100, Myko):** `0x01` → `i16 1098`; `0xF2` → `u64 açık anahtar` (sonrası şifreli, **Myko özel anahtarı `0x1207500120128966`**, bizim `JvSifre` varsayılanı); `0xF3` (`yazı hesap, yazı şifre`, DByte) → `u16 0, u8 1, i16 premium(-1), yazı hesap`;
`0xF5` (`u16 yankı`) → `u16 yankı, u8 sayı`, sunucu: `yazı lanIp, yazı ip, yazı ad, i16 oyuncu, i16 no, i16 grup, i16 üst sınır, i16 ücretsiz sınır, u8 0, u8 ekran, yazı Karus kral, Karus duyuru, El Morad kral, El Morad duyuru` (§5 ile birebir). `0xF6` haber: `yazı başlık, u16 boyut, içerik…`.

**Oyun sunucusu (15001, Myko) — tam akış çalıştı, şifreleme YOK (anahtarlar 0):**
1. `0x2B` (boş) → `u8 0, u16 2369 (oyun sürümü), u8 0, u64 0, u64 0, u8 0`.
2. `0x01` giriş (`yazı hesap, yazı şifre`) → `i8 ulus, u32 0`; ardından sunucu kendiliğinden `0xC0 (01 02 01)` yollar.
3. `0x0C` (`u8 1`) → `u8 1, u8 1`, her yuva: `yazı ad (**u16 uzunluklu**), u8 ırk, u16 sınıf, u8 seviye, u8 yüz, u32 saç, u8 bölge`, 8 × `u32 eşya no, u16 dayanıklılık`, … (boş yuva: ad uzunluğu 0 ve sıfırlar). Gerçek: `Lilith`, ırk 13, sınıf 206, seviye 65, yüz 6, bölge 21 — veritabanıyla birebir.
4. `0x04` karakter seç (`yazı hesap, yazı karakter, u8 bInit=1`, **DByte**) → önce `0x54 (4 bayt)`, sonra `0x04`: `u8 1 (başarılı), u8 bölge 21, u16 x, u16 z, u16 y (konum/10), u8 ulus`; ardından `0x6A`.
5. `0x0D` aşama 1 (`u8 1, yazı karakter` **SByte**) → sunucu sırayla: `0x0E` (`WIZ_MYINFO`, 1596 bayt), `0x5E`, çeşitli `0xE9` (XSafe, **yok sayılmalı**), `0x16`, `0x69`, `0x1D` (NPC/oyuncu bölge listeleri), `0x81`, `0x2E` (duyurular), `0x13` (saat: `u16 yıl, ay, gün, saat, dk…`), `0x14` (hava), `0x64`, `0x2E` (GM listesi), `0x0D` (boş — "oyun başladı"), `0xC4` (karşılama mesajı).
6. `0x0D` aşama 2 (`u8 2, yazı karakter`) → `0x1F`, `0xE9`'lar, `0x5F`… ; oyuncu dünyaya girer.
`WIZ_MYINFO` gövdesinin başı gerçek veriyle doğrulandı: `u8 1, u8 0, yazı ad (SByte: 06 "Lilith"), u16 x, z, y, u8 ulus (2), u8 ırk (13), u16 sınıf (206), u8 yüz, u32 saç, …` (alan alan çözümü sonraki iş).

**Düzeltme (önceki sürümlerdeki hata):** yazıların varsayılan uzunluğu 2 bayttır (§3). Kütüphane varsayılanı buna göre düzeltildi.

## 13. Tarayıcı client'ına bağlanma (2026-11-16)
- `client/src/ag/sunucu.ts`: köprü üzerinden tam akış (giriş sunucusu → oyun sunucusu → karakter → oyuna giriş), `kopru/protokol/` kütüphanesini doğrudan kullanır (Vite `fs.allow`, `allowImportingTsExtensions`).
- `client/src/oyun/sunucuVerisi.ts`: `WIZ_MYINFO` verisini `Oyuncu` nesnesine uygular (seviye, deneyim, statlar, can/mana, altın, giyili/çanta eşyaları, ad, Moradon'da konum).
- Kullanım: köprü (`kopru: npm run baslat`) + Myko sunucusu (`kopru/myko-baslat.ps1`) + `client: npm run dev` çalışırken oyun sayfasında konsoldan `await ke.sunucuyaBaglan('<hesap>', '<şifre>')`. Otomatik deneme: `client/scripts/sunucuTesti.mjs`.
- Gerçek tarayıcıda doğrulandı: sunucudaki `Lilith` (seviye 65, 2.087.207 altın, 5 giyili parça) oyuncuya yansıdı, ekranda ad/seviye/can/mana/deneyim doğru.
- Henüz yok: giriş/karakter seçim ekranı, canlı bağlantı (çevre oyuncuları/NPC, hareket, sohbet), tüm eşyaların listesi.

## 14. Canlı dünya (Aşama 5, 2026-11-16) — gerçek Myko sunucusuyla doğrulandı
Kaynak: `GameServer/CharacterMovementHandler.cpp`, `Npc.cpp`, `UserInfoSystem.cpp`, `RegionHandler.cpp`, `FundamentalMethods.cpp`. Kütüphane: `kopru/protokol/paketler.ts`, `hareket.ts`; testler gerçek yakalamalarla (`ornekler/myko-oyun-ici.json`, `myko-iki-oyuncu.json`).
- **Kalp atışı gerekmez:** oyunda hiçbir şey göndermeden 20+ sn bağlı kalındı; sunucu atmadı.
- **Bölgeler:** harita 48 m'lik bölgelere ayrılır; oyuncu kendi bölgesi + çevresindeki 8 bölgeyi (3×3) görür. Bölge değişince sunucu yeni listeleri yollar.
- **Canavar/NPC (sunucu → client):** `0x1D` liste (`u16 adet`, her biri `u16 id` + kayıt), `0x0A` giriş/çıkış (`u8 tür: 1 giriş, 2 çıkış, 3 yeniden doğuş; u16 id; kayıt`), `0x0B` hareket (`u8 1, u16 id, x/z/y ×10, u16 hız ×10`; konum = **varılacak yer**, istemci o hızla yürür). Kayıt: `u16 protoNo (K_NPC sSid), u8 tür (1 canavar, 2 NPC), u16 resimNo (model), u32 satışGrubu, u8 tip, u32 0, u16 boyut, u32 silah1, u32 silah2, u8 ulus, u8 seviye, x/z/y ×10 (u16), u32 kapıAçık, u8 nesneTürü, u16, u16, i16 yön (derece)`. Tip 15 (kışla/kale) farklıdır, desteklenmiyor.
- **Başka oyuncular (sunucu → client):** `0x16` liste (`u16 adet`, her biri `u8 0, u16 id` + kayıt), `0x07` giriş/çıkış (`u16 tür, u16 id`, çıkış değilse kayıt), `0x06` hareket (`u16 id, x/z/y ×10, i16 hız ×10, u8 yankı`). Oyuncu kaydı (yazılar 1 baytlık uzunluk): `ad, u8 ulus, 0, 0, u16 klanNo, u8 fame`, klan bloğu (klansız 14 bayt sıfır/−1; klanlı: `u16 ittifak, ad, u8 derece, u8 sıra, u16 işaret sürümü, u16 pelerin, 3 bayt renk, 0, u8 bayrak`), `u8 seviye, u8 ırk, u16 sınıf, x/z/y, u8 yüz, u32 saç, u8 canDurumu, u32 anormalDurum, … u8 yetki …, i16 yön, … 15 görünür eşya (u32 no, u16 dayanıklılık, u8 bayrak: gövde, bacak, kask, eldiven, ayak, omuz, sağ el, sol el, kanat, kostüm×4, peri, dövme), u8 bölge, …`. 201 baytlık gerçek kayıt tam çözüldü.
- **Kendi hareketimiz (client → sunucu, `0x06`):** `u16 varış x,z,y ×10, i16 hız ×10, u8 yankı (1 başladı, 3 sürüyor, 0 durdu), u16 şimdiki x,z,y ×10`. Kurallar (aksi hâlde bağlantı kesilir/şehre gönderilir): yankı yalnızca 0/1/3; yankı≠0 iken hız 0 olamaz; art arda iki "durdu" yasak; hız sınırı 45 (savaşçı/büyücü/rahip 67, haydut 90). Sunucu **konumu istemciden alır** (varışa taşır); sunucu hareketi bölgedekilere, **kendimize de**, yayınlar (kendi kimliğimizi yok sayarız). `HareketGonderici` bu kurallara göre yazıldı ve gerçek sunucuda doğrulandı: başla (1) → saniyede bir sürüyor (3) → dur (0), atılmadık; izleyen oyuncu aynı diziyi 4,5 m/sn hızla aldı.
- **GM'ler görünmez:** yetki 0 olan karakter (Lilith) başkalarına yayınlanmaz (kendi hareketi ve girişi bölgedekilere gitmez; o başkalarını görür). İki oyunculu testte bu yüzden yürüyen taraf normal oyuncu (`KoTest`), izleyen Lilith'tir.
- **Yeni karakter** otomatik "Human" klanına (15001) katılır; karakter oluşturma: `0x02` (`u8 yuva, ad, u8 ırk, u16 sınıf, u8 yüz, u32 saç, u8×5 stat (toplam 300, her biri ≥ 50)`) → `u8 kod` (0 başarılı). Geçerli çiftler: ırk 12/13 + sınıf 201–204 (El Morad), ırk 11 + 201, vb. (`NewCharValid`).
- **Test hesabı (yalnızca yerel veritabanı):** giriş için `TB_USER` + `CHECK_ACCOUNT` + `ACCOUNT_PREMIUM_DATA` satırları gerekir (`LoadPremiumServiceUser` yoksa karakter seçimi sessizce başarısız olur). `kotest1` hesabı bu şekilde eklendi; betikler `kopru/src/iki-oyuncu-testi.ts`, `yuruyen-oyuncu.ts`.
- **Sunucu kaydındaki "Lisans Bitti":** Myko kaynağı tarih kilidi (01.06.2025) yazdırır ama sonucu kullanılmaz; yalnızca gürültü.

## 15. Savaş (Aşama 5, 2026-11-17) — gerçek Myko sunucusuyla doğrulandı
Kaynak: `GameServer/AttackHandler.cpp` (`CUser::Attack`, `Regene`), `User.cpp` (`SendTargetHP`), `UserLevelExperienceSystem.cpp`. Kütüphane: `kopru/protokol/savas.ts`; testler gerçek yakalamalarla (`ornekler/myko-savas.json` — Lilith tek vuruşta öldürür; `myko-savas-kotest.json` — seviye 1 KoTest karşılıklı savaşır, seviye atlar).
**İlke: isabeti, hasarı, ölümü ve ödülü SUNUCU belirler.** İstemci yalnızca saldırı ister ve sonuçları gösterir.
- **Saldırı isteği (client → sunucu, `0x08`):** `u8 tür (1), u8 sonuç (0), i16 hedef kimliği, i16 gecikme, i16 mesafe, u8 0`. Sunucu şunlara bakar ve uymazsa **sessizce yok sayar**: gecikme ≥ silahın `Delay`'i (eşya tablosu; kılıç 114; elde silah yoksa ≥ 100), mesafe ≤ silahın `Range`'i (10; Raptor 20), iki saldırı arası ≥ 0,9 sn, gerçek uzaklık menzilde. İstemci `silah.gecikme + 10` ve `10` yollar.
- **Hedef bilgisi:** istek `0x22` (`u16 id, u8 yankı=1`); cevap `0x22`: `u16 id, u8 yankı, i32 azami can, i32 can, i16 hasar (EKSİ işaretli: −7 = 7 hasar), u16 vuran kimliği, u8 tür (1 canavar, 2 NPC, 3 bot, 4 oyuncu)`. Her vuruştan sonra sunucu bunu bize yollar (hasar ≠ 0).
- **Saldırı sonucu (sunucu → bölge, `0x08`):** `u8 tür, u8 sonuç (0 ıska, 1 isabet, 2 hedef öldü), u16 saldıran, u16 hedef` (oyuncu saldırısında sonda ek `u8`). Canavar bize saldırınca `saldıran` = canavar kimliği, `hedef` = bizim soket numaramız.
- **Kendi canımız (`0x17`):** `i16 azami, i16 can, u16 vuran (0xFFFF = kimse)`; hasar = önceki − yeni.
- **Ölüm (`0x11`):** `u16 id` (canavar ya da oyuncu). **Deneyim (`0x1A`):** `u8 1, u64 yeni toplam`. **Seviye (`0x1B`, bölgeye):** `u16 id, u8 seviye, i16 boş puan, u8 boş skill puanı, u64 azami deneyim, u64 deneyim, i16 azami/can, i16 azami/mana, u32 azami/ağırlık`. **Ağırlık (`0x54`):** `u32`. **Silah/zırh dayanıklılığı (`0x38`):** `u8 yuva, u16 değer`.
- **Ganimet:** ölünce `0x23` (`u16 canavar, u32 torba no, u8 12`) gelir; torba `0x24` ile açılır, `0x26` ile alınır (sonraki adım).
- **Yeniden doğma:** istek `0x12` (`u8 1`); sunucu canı doldurur (`0x17`) ve `0x12` ile yeni konumu yollar (`u16 x, z, y ×10`; Moradon başlangıç ≈ 265, 304).
- **Canavar sunucuda yeniden doğunca** aynı kimlikle `0x0A` (giriş) yollanır; istemci ölü canavarı canlandırır.
- **İstemci (`client/src/oyun/sunucuDunyasi.ts`, `main.ts`):** sunucu canavarına vuruşta yerel hasar hesaplanmaz, `0x08` yollanır; sonuçlar sunucudan gelir. Tarayıcıda doğrulandı: vuruş, ıska, canavarın karşı vuruşu, canavarın ölümü, seviye atlama (2→3), oyuncunun ölümü ve sunucudan yeniden doğma. Skill'ler ve ganimet toplama henüz bağlı değil.

## Skill (WIZ_MAGIC_PROCESS, 0x31) ve MP (WIZ_MSP_CHANGE, 0x18)

İstek ve yanıt aynı yapıdadır: `u8 komut, u32 skillNo, u16 kullanan, u16 hedef, 7 × i16 veri`.
Komutlar: 1 hazırlama, 2 uçuş, 3 etki (client'ın gönderdiği ve başarıda sunucunun yaydığı), 4 başarısız, 5 buff türü, 6 iptal.
- Canavara skill (Type 1): `komut=3, kullanan=kendi soket no, hedef=canavar no`. Sunucu MP'yi düşer (0x18), hasarı 0x22 ile bildirir, çevreye 0x31 komut 3 yayar.
- Buff (Type 4, Sprint/Defense): `hedef=kendimiz`. Kabulde 0x18 ile MP düşer, 0x31 komut 3 gelir; client buff'ı o zaman başlatır.
- Hata: komut 4, `veri[3]` = −100…−104 (bkz. `BECERI_HATALARI` in `kopru/protokol/beceri.ts`).
- 0x18: `i16 enCokMana, i16 mana`.
Canlı test (kotest): Stroke (201001) MP 19→17, 10 hasar; Sprint (201002) MP 24→19, buff aktif. Test betiği: `client/scripts/beceriSunucuTesti.mjs`.

## Ganimet (0x23 düşme, 0x24 kutu açma, 0x26 alma)

- Canavar ölünce sunucu `0x23` yollar: `u16 canavar kimliği, u32 torba no, u8 12`. Client kutuyu canavarın yerine koyar ve hemen `0x24` ile içeriği ister.
- `0x24` (client→sunucu): `u32 torba`. Cevap: `u32 torba, u8 dolu, 8 × (u32 eşya no, u16 adet)`. Noah, eşya numarası `900000000` olarak gelir (adet = miktar).
- `0x26` (client→sunucu): `u32 torba, u32 eşya no, u16 kutudaki yuva`. Cevap (kod 1): `u8 kod, u32 torba, i8 çanta yuvası (Noah'ta −1), u32 eşya, u16 adet, u32 toplam Noah, u16 kutu yuvası`; ardından `0x54` ağırlık. Kod 0 hata, 6 ağırlık yok, 2 parti Noah (adet yok), 3/4 parti bildirimleri.
- Çanta yuvası 0–27 = envanter dizisi (14. yuvadan sonrası; sunucudaki `bDstPos − 14`). Yığınlı eşyada (ok, iksir) gelen adet toplam adettir.
- Eşya tablosu: sunucu her eşyayı düşürebildiği için `npm run tum-esyalar` tüm Item_Org_us.tbl'yi (5.332 eşya, 1.943 simge) `esya/tum.json` yapar; tabloda olmayan numara "Item <no>" yer tutucusuyla çantada yuva tutar.
Canlı test (kotest): Noah, "Low Quality Gem" ve "Arrow x20" alındı; envanter ve Noah sunucuyla uyumlu. Betik: `client/scripts/ganimetSunucuTesti.mjs`.

## Eşya taşıma (0x1F)

- İstek: `u8 1, u8 yön, u32 eşya (yuvadaki eşyanın TAM numarası), u8 kaynak yuva, u8 hedef yuva`. Yön: 1 çanta→giyili, 2 giyili→çanta, 3 çanta→çanta, 4 giyili→giyili. Çanta yuvası 0–27, giyili yuva 0–13.
- Cevap: başarısız `01 00`; başarılı `01 01` + karakter özeti (hasar, savunma, azami ağırlık/can/mana, stat ekleri…); ardından `0x54` ağırlık.
- Client iyimser davranır: hamleyi hemen uygular, `01 00` gelirse önceki hale döner (ör. Warrior'a uymayan eşya giyilemez). Sıralama (type 2) isteği çantayı yeniden dizdiği için kullanılmaz.
- Eşya numarasının son 3 hanesi yükseltme koduyla gelir; istekte yuvadaki tam numara (`sunucuNo`) gönderilmelidir.

## Sohbet (0x10) ve özel alıcı (0x35)

- İstek: `u8 tür, u16+mesaj` (tür: 1 genel, 3 parti, 5 bağırma, 6 klan; en çok 128 karakter). Genel sohbet yalnız yakındaki oyunculara gider; gönderen de kendi mesajını geri alır.
- Gelen: `u8 tür, u8 ulus, i16 gönderen, u8+ad, u16+mesaj, i8 rütbe, u8 sistem`.
- Özel mesaj: önce `0x35: u8 1, u16+ad` (cevap `u8 1, i16 sonuç`; 0 = çevrimdışı), sonra tür 2 ile `0x10`. Sunucu yalnız alıcıya yollar, gönderen yankı almaz (client "[To ad]" satırını kendisi yazar).
Canlı test: tarayıcı (kotest) ↔ ikinci oyuncu (kotest1) genel ve özel mesaj. Betik: `client/scripts/sohbetSunucuTesti.mjs`.

## NPC mağazası (0x21)

- Satın alma: `u8 1, i32 satış grubu, u16 NPC kimliği, u8 adet, her eşya: i32 eşya, u8 çanta yuvası, u16 adet, u8 sayfa, u8 sayfadaki sıra (0–23)`. Satış: `u8 2, i32 grup, u16 NPC, u8 adet, her eşya: i32 eşya, u8 çanta yuvası, u16 adet` (yığının tamamı; fiyat = alış fiyatı / 6, 0 olabilir).
- Cevap: başarıda `u8 1, u32 toplam Noah, u32 işlem tutarı, u8 grup`; hatada `u8 0, u8 kod` (1 genel, 2 geçersiz, 3 Noah yetmiyor, 4 ağırlık). Ardından `0x54` ağırlık.
- Sunucu NPC'nin tipini, satış grubunu ve ≤ 11 m menzili doğrular; NPC kimliği sunucunun NPC listesinden (0x1D, tür ≠ 1) gelir. Client yerel NPC'yi sunucudakiyle K_NPC numarası + en yakın konum (≤ 5 m) ile eşler.
Canlı test (kotest): Arrow alım/satım, Noah ve envanter sunucuyla uyumlu. Betik: `client/scripts/magazaSunucuTesti.mjs`.

## Stat puanı (0x28) ve otur/kalk (0x29)

- Stat harca: `u8 stat (1 STR, 2 STA, 3 DEX, 4 INT, 5 CHA)`. Cevap: `u8 stat, u16 yeni değer, u16 azami can, u16 azami mana, u16 vuruş, u32 azami ağırlık, u16 can, u16 mana`. Puan yoksa/stat azamideyse sunucu cevap vermez.
- Otur/kalk: `u8 1, u32 durum` (1 ayakta, 2 oturuyor); bölgeye `u16 oyuncu, u8 tür, u32 durum` olarak yayılır. Sunucu oturma sırasında yenilenmeyi hızlandırır.
Betik: `client/scripts/statSunucuTesti.mjs`.

## Banka / depo (0x45)

- Sunucu, bankayı hedeflenen (0x22 ile seçilen) banka NPC'sine göre açar; NPC ≤ 11 m olmalı. Client önce `0x22` (NPC kimliği), sonra `0x45: u8 1` yollar.
- Açılış cevabı: `u8 1, u8 1, u32 bankadaki Noah` + 192 yuva (8 sayfa × 24) × 17 bayt (`u32 eşya, u16 dayanıklılık, u16 adet, u8 bayrak, u32 benzersiz no, u32 bitiş`).
- Yatır (2) / çek (3): `u8 işlem, u16 NPC, u32 eşya (Noah = 900000000), u8 sayfa, u8 kaynak yuva, u8 hedef yuva, u32 adet`. Cevap `u8 işlem, u8 sonuç` (1 başarılı). Client değişikliği ancak onaydan sonra uygular.
Canlı test (kotest): Noah ve eşya yatır/çek. Betik: `client/scripts/bankaSunucuTesti.mjs`.

## Karakter oluşturma (0x02) ve ulus seçimi (0x05)

- İstek: `u8 yuva (0–3), u16+ad, u8 ırk, u16 sınıf, u8 yüz, u32 saç, 5 × u8 (STR STA DEX INT CHA)`. Cevap: tek bayt (0 başarılı; 1 yer yok, 2 geçersiz, 3 ad alınmış, 4 DB hatası, 5/6 ad yasak, 7–9 ırk/sınıf, 10 puan kalmış, 11 stat < 50).
- Kurallar (sunucu doğrular): stat toplamı tam 300 ve her stat ≥ 50; ırk 1 → yalnız Warrior; 2 → Rogue/Priest; 3 → Mage; 4 → Mage/Priest; 11 → Warrior; 12 ve 13 → dört sınıf. Sınıf kodu = ulus × 100 + meslek (1 Warrior, 2 Rogue, 3 Mage, 4 Priest). Karus ırkları 1–4, El Morad 11–13.
- Başlangıç statları sınıfa göre sabit (Warrior 65/65/60/50/50, Rogue 60/60/70/50/50, Mage 50/50/70/70/50, Priest 50/60/60/70/50) ve 10 bonus puan dağıtılır.
- Yeni hesapta (ulus 0) ilk karakterden önce `0x05: u8 ulus` yollanır; ulus bir daha değişmez, hesap yalnız o ulusun ırklarını açabilir.
Client: `client/src/arayuz/karakterOlustur.ts` (oyunun `re_ka_charactercreate` / `re_el_charactercreate` pencereleri). Test: `client/scripts/olusturTesti.mjs`.

## Süreli büyüler (0x31): hazırlama → uçuş → etki

CastTime > 0 olan skill'lerde (Mage Flash/Shiver/Flame…, Priest Tiny healing…) client sırayla yollar: `komut 1` (hazırlama, sunucu hemen yankılar), CastTime × 100 ms sonra `komut 2` (uçuş), kısa süre sonra `komut 3` (etki: MP düşer 0x18, hasar/iyileştirme/ölüm paketleri gelir). Doğrudan `komut 3` yollanırsa cevap gelmez. Hazırlanırken yürümek `komut 6` (iptal) ile bozar. Hedef türü (MORAL): 1 kendi, 2 dost (kendin dahil), 7 düşman.
Canlı test (kotest2): Mage Flash seviye-1 solucanı öldürdü (EXP, ganimet, seviye atladı); Priest Tiny healing kendine yollandı (MP düştü). Betik: `client/scripts/buyuTesti.mjs`.

## Okçuluk (Archery, skill 202003 / tip 2)
- Gerekenler: elde yay (sol ya da sağ el, tür 70/71), çantada ok (391010000), seviye ≥ 3. Menzil yayın menzili.
- Akış: `0x31` komut 1 (hazırlama) → 312–1250 ms içinde komut 2 (uçuş; veri `[x, 0, z, sıra]`) → komut 3 (etki). Ok uçuş anında harcanır.
- Ok adedi değişimi `0x3D` ile gelir (`esyaAdediDegisti`: yuva, eşya, yeni adet).
- Client: ~1050 ms'de uçuş, ok efekti hedefe varınca etki gönderilir. Test: `client/scripts/buyuTesti.mjs <klasör> 0 202003 dusman` (kotest2/RogTest1).

## Başkasını iyileştirme (Priest, tip 3 / moral 2)
- Seçili oyuncunun soket no'su `hedef` olarak gider; akış kendi büyülerimizle aynı (1 → 2 → 3). Hedef oyuncu da aynı `0x31` komut 1/2/3 paketlerini ve `0x17` (can değişimi: en çok, şimdiki) alır.
- Test: `client/scripts/iyilestirTesti.mjs <skill> <png öneki>` (PriTest1 + robot KoTest). Sonuç: hedef 1-2-3'ü aldı, sunucu reddetmedi. Hedefteki iyileşme efekti (heal_cast.fxb) çözülemediği için görünmüyor.

## Mage büyüleri (203xxx)
- Sunucu veritabanında yalnız şunlar tanımlı: Stroke 203001, Flash 203002 (lv1), Shiver 203003 (lv3), Flame 203005 (lv5), Cold wave 203007 (lv7), Spark 203009 (lv9), Whipping 203011 (buff). `Magic blade` (203010) tabloda var ama sunucuda yok.
- Hepsi süreli büyü: hazırlama (1) → CastTime×100 ms → uçuş (2) → etki (3); hedefteki efektler (101 ateş/şimşek patlaması, 201 buz bulutu, 301 şimşek) etki anında oynar. Test: `client/scripts/seriBuyu.mjs <klasör> 1 <skill> dusman` (hedef çevresinde kare montajı üretir).

## Bölge listeleri (0x1C NPC, 0x15 oyuncu) — canavarların görünmemesinin nedeni
- Oyuncu yeni bir bölgeye girince sunucu yalnızca **kimlik listesi** yollar: `0x1C` (`u16 adet`, `u16 id`ler) NPC/canavar, `0x15` alt komut 1 (`u8 1, u16 adet, u16 id`ler) oyuncu. Ayrıntı client'tan istenir: `0x1D` / `0x16` (`u16 adet`, `u16 id`ler; en çok 1000). Yanıt aynı opcode'la kayıtlarla gelir.
- Client bunu yapmadığı için yalnızca oyuna girilen yerin canavarları görünüyordu (başka slotlarda 0-2 canavar). Düzeltme: `sunucuDunyasi.ts npcBolgesi/oyuncuBolgesi`; listede olmayan (ölü olmayan) canavar/oyuncular kaldırılır.
- Doğrulama: `kopru/src/slot-tarayici.ts` (robot oyuncu slotları gezip sayar). Düzeltmeden önce 29 slot eksik, sonra 0.

## Dayanıklılık ve tamir
- `0x38` (sunucu→client): `u8 yuva` (0–13 giyili, 14+ çanta), `u16 dayanıklılık`. Envanter listesindeki her eşya da dayanıklılık taşır.
- Tamir (`0x3B`): client→sunucu `u8 yer (1 giyili, 2 çanta), u8 yuva, u16 NPC kimliği, u32 eşya no`; cevap `u8 sonuç, u32 kalan Noah`. Ücret = ((fiyat−10)/10000 + fiyat^0,75) × eksik/azami. Yalnız tamirci NPC (tür 22: Armor/Weapon/Sundries) tamir eder.
- Client: tamirci mağazasında `Repair` düğmesi tamir modunu açar; eşyaya gelince "Repair Cost", tıklayınca tamir. Mağaza ve envanter sağ kenarda üst üste tek pencere gibi açılır.

## NPC diyalogu ve görevler (WIZ_NPC_EVENT 0x20, WIZ_SELECT_MSG 0x55, WIZ_QUEST 0x64)
Gerçek Myko sunucusuyla doğrulandı (Grand Merchant Kaishan, sid 18004). Kod: `kopru/protokol/diyalog.ts`, `gorev.ts`, `sinif.ts`; client: `client/src/arayuz/diyalogPenceresi.ts` (orijinal `re_Quest_Npc_Menu` penceresi), `client/src/oyun/diyalogVeri.ts`.
- **Akış:** NPC'ye sağ tık → client `0x20` (`u8 1, u16 NPC kimliği, i32 -1`) → sunucu Lua betiği (`Quests/<sid>_*.lua`, olay 100) çalışır.
- Myko betikleri çoğunlukla `NpcMsg(UID, metinNo, NPC)` çağırır → sunucu `0x64` alt 7 (`u32 metin no, u16 NPC sid`) yollar. Client konuşmayı gösterir ve düğme olarak NPC'nin **uygun görev satırlarını** listeler (sunucu `QuestV2SearchEligibleQuest` kuralları: seviye, ulus, sınıf, görev durumu = satır durumu, tamamlanmamış). Satır `Quest_Helper_us`'tan (`araclar/oyun/diyalog.ts`), görev durumları `0x64` alt 1 (liste: `u16 adet, adet × (u16 görev, u8 durum)`) ve alt 2 (`u16 görev, u8 durum`) ile gelir.
- Düğmeye basınca client `0x64` alt 3 (`u8 3, u32 satır no`) yollar; sunucu satırın tetik olayını Lua'da çalıştırır.
- Lua `SelectMsg(...)` → `0x55`: `i16 NPC sid, u8 bayrak, i32 görev, i32 konuşma no, 12 × i32 düğme metin no, string(1 bayt uzunluk) lua dosyası`. Seçim: client `0x55` ile `u8 düğme sırası, string(1 bayt) lua dosyası, i8 ödül (-1)` yollar.
- Metinler: konuşma `Quest_Talk_us`, düğme `Quest_Menu_us` (`npm run diyalog` → `donusturulmus/web/oyun/diyalog.json`). `|` satır sonu, `<selfname>` oyuncu adı, `^` kaldırılır.
- **Terfi (ilk meslek değişimi, seviye ≥ 10, 3000 Noah):** Kaishan → `PromoteUserNovice` → `0x34` alt 6 (`u16 yeni sınıf, u16 kimlik`; ör. 205 = El Morad novice savaşçı) + `0x4A` Noah değişimi (`u8 tür, u32 değişim, u32 yeni toplam`).
