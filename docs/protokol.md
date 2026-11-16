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
