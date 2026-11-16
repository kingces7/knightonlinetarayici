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
tek bayt uzunluk (varsayılan, "SByte") ya da 2 bayt uzunluk ("DByte", bazı paketlerde). Kodlama ANSI (Windows-1252). `bool` = 1 bayt.

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
2. **`WIZ_LOGIN (0x01)`**: `hesap (yazı), şifre (yazı)` → cevap: `int8 sonuç[, uint32 0]` (sonuç 0–2 başarılı; −1 başarısız).
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
