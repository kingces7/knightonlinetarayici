# Bugger notları — beyaz/mor eşya kuralları ve Korece taraması (2026-11-19)

Müdürün duyurusundaki 4 maddeye karşılık. **Hiçbir şey değiştirilmedi** (yalnız SELECT, dosya okuma, `mor-esya-giyilebilir.ts --dene`).

Terimler: **Beyaz** = yükseltmesiz, unique olmayan giyilebilir eşya (`Num % 10 = 0`, adında `(+N)` yok). **Mor** = `(+N)` "Upgrade Item". **Mojibake** = Korece (CP949) baytlarının yanlış kodla okunup `ÀÏÀÌ»ï»ç` gibi anlamsız Latin harflere dönmesi.

## 1. Özet

| Madde | Sonuç |
|---|---|
| 1. NPC 29990 adı | Veritabanında `[Item Master] GM Market`; `K_NPC` ve `K_NPCPOS1098`'de "Aurora" geçen satır 0. `harita/*/npc-listesi.csv` ve `magaza-listesi.csv`'de de 0. Yalnız eski raporda ve iki eski SQL betiğinde (`esya-19-geri-ekle.sql`, `esya-sil-43.sql`) geçiyor (geçmiş kayıt, sorun değil). |
| 2. Beyaz eşya yolları | **Aykırı yol yok.** |
| 3. Korece görünmemeli | **Oyuncuya görünen 5 yer buldum** (aşağıda K-1…K-5). Doğrudan Hangul (한글) yok; Korece `?` olarak kaybolmuş ya da mojibake. |
| 4. Mor eşya şartı | `mor-esya-giyilebilir.ts --dene`: **88.180 mor giyilebilir eşya, 0 tanesinin şartı client ipucundan yüksek.** |

---

## 2. Beyaz eşya yolları (madde 2) — temiz

**Yöntem:** Beyaz kümeyi betiğinizle aynı tanımla çıkardım (`Kind` listesi, `Num%10=0`, `ItemType<>4`, `(+N)` yok): **690 eşya.** Sonra `LILITH_MYKO` içindeki **tüm** sayısal sütunlarda (yedek, log ve kullanıcı tabloları hariç) bu numaraların geçtiği yeri aradım. Yalnız belirli tablolara bakmadım; kural dışı yeni bir yol varsa yakalansın diye genel tarama.

| Tablo | Sonuç | Yorum |
|---|---|---|
| `ITEM_SELLTABLE` | 650 slot, **hepsi grup 999000 (GM Market)**; başka dükkanda 0 | Kurala uygun |
| `K_MONSTER_ITEM`, `MAKE_ITEM_GROUP` (9001/9002 dâhil, tüm gruplar), `K_NPC_ITEM`, `CINDWAR_ITEMS*`, `NEW_UPGRADE.nNewNumber`, `ITEM_EXCHANGE` çıktı sütunları | **0** | Kurala uygun |
| `NEW_UPGRADE.nOriginNumber` (144) | giriş | Beklenen: yükseltme girdisi |
| `ITEM_EXCHANGE.nOriginItemNum1` (7) | giriş | Beklenen: takas girdisi |
| `K_MONSTER.iWeapon*`, `K_NPC.iWeapon*` (339, 221) | görsel (eldeki silah modeli) | Beklenen: eşya alınamaz |
| `MAGIC` (95 satır, `BeforeAction` vb.) | tesadüf (beceri eylem numarası, eşya alanı değil) | Yanlış alarm |
| `TRASH_ITEMLIST` | 1 kayıt: karakter `kingces`, eşya 159539000 (çöp kutusu kaydı) | Kullanıcı karakteri, **dokunmadım**; GM Market'ten alınmış olabilir, kural dışı yol sayılmaz |

Beyaz eşya ayrıca oyuncu envanterinde/depoda olabilir (ikili alan; bakmadım, aşağıda "Bakılmayanlar").

## 3. "+6'dan yüksek eşya düşmez" kuralı — temiz

`(+7)` ve üstü eşya: **36.794** (ITEM). Canavar ganimetinde:
- `K_MONSTER_ITEM` doğrudan yuvalar: **0**.
- `K_MONSTER_ITEM` → `MAKE_ITEM_GROUP` (canavarın kullandığı gruplar): **0**.
- `MAKE_ITEM_GROUP` içinde +7 ve üstü hâlâ duruyor: 10 grupta (141, 160, 180, 999, 1919, 4847, 100000, 777777, 888888, 999999) **179 slot**; bu grup numaralarını `K_MONSTER_ITEM`, `K_NPC_ITEM`, `ITEM_RANDOM`, `MAKE_ITEM_GROUP_RANDOM`, `MINING_FISHING_ITEM` ve olay/ödül tablolarında aradım; hiçbir ganimet kaynağı kullanmıyor (kalan eşleşmeler "adet" sütunu tesadüfü). Yani kuralı bozmuyor ama bu gruplar başka bir yoldan (görev ödülü, elle) kullanılıyorsa bu rapor görmez; **doğrulanmadı**.

## 4. Mor eşya gereksinimi (madde 4) — temiz

`node sunucu/mor-esya-giyilebilir.ts --dene` → `88180 mor giyilebilir eşya, 0 tanesinin şartı client ipucundan yüksek (client tablosunda olmayan: 0)`. `--dene` yalnız sayar (kodda `return` yazmadan önce), çalıştırması güvenliydi.

---

## 5. Korece görünmemeli (madde 3)

**Yöntem:** (a) Veritabanında 312 metin sütunu / 821.524 satır: Hangul aralığı ve ardışık yüksek Latin (mojibake) arandı. (b) Web client'ın yüklediği **1044 JSON** ayrıştırıldı (yalnız metin alanları; `font` alanı hariç, çünkü `±¼¸²` = 굴림 yazı tipi adı ve ekranda görünmüyor). (c) Client kaynak kodu (`client/src`): Hangul içeren dosya **0**. (d) Sunucu Lua görev betikleri. Her bulguyu "oyuncuya görünüyor mu" diye ayırdım.

**Veritabanında Hangul harfi yok** (sütunlar Latin; Korece zaten `?` ya da mojibake olarak bozulmuş). Yani asıl iş: **bozuk metnin oyuncuya görünen yerlerini bulmak.**

### K-1 [ORTA] 108 oyuncu becerisinin adı bozuk — oyunda görünüyor
- **Kanıt:** `donusturulmus/web/oyun/oyuncu.json` `beceri` bölümü: 1304 beceriden **108**'inin adı mojibake (örn. 105758 `çÌßù`, 106580 `?çºËIèíÌÑ`, 106680 `ÙøèíÊ÷ Içõ·`). Kaynak: `MAGIC.EnName`; aynı satırlarda `MAGIC.KrName` **temiz İngilizce** (108/108): 105758 Echo, 106580 Hell blade, 106680 Iron body, 106815 Exceed Break, 106820 Shock Stun, 107552 Counter Strike, 107656 Throwing Knife, 108575 Blow Arrow, 108580 Blinding Strafe, 108585 Power Shot… (sütun adları ters). Bu becerilerin hepsi sınıf becerisi (kimlik aralığı 105-115k ve 205-300k).
- **Oyuna etkisi:** Client bu adı mesajlarda kullanıyor (`oyunArayuzu.ts:904-911`: "`${b.ad}` is a passive skill…", seviye şartı uyarısı). Oyuncu bozuk karakterler görür.
- **Çözüm önerisi:** `araclar/sunucu/oyuncu-disa-aktar.ps1` (satır 26-28): `ad`'ı `EnName` yerine `EnName` bozuksa `KrName` olarak al (yalnız ASCII ise). Veritabanını değiştirmeye gerek yok. Sonra `oyuncu.json` yeniden üretilir. **Risk:** çok düşük (yalnız bozuk adlar değişir; kalan 1196 aynı).
- **Karar:** Hayır (müdür uygular).

### K-2 [ORTA] NPC konuşma ve menü metinlerinde kaybolmuş Korece — sınırlı görünüyor
- **Kanıt:** `oyun/diyalog.json` (client'ın NPC konuşma verisi): `talk` 12.617 metinden **633** tanesi çoğunlukla `?` (≥%30; Korece kaybı), `menu` 3.709'dan **502** (ör. `1001 = "1?"`), `gorev` (görev adları) 2.766'dan **45** (örn. `[???]??`). Hangul ya da mojibake yok, yalnız `???`.
- **Görünürlük (sunucu Lua betikleriyle çaprazladım):** 501 Lua dosyasının yalnız **10 tanesi** bu bozuk satırlara başvuruyor; bunlardan yalnız **2 NPC** açık bölgede duruyor:
  - **29999 `[Peddler]Hemes`** (Moradon, bölge 21): konuşma `45034` = `??? ?????.` (`29999_Pontus.lua`, `29999_PontusWARDCPRELI.lua`).
  - **32585 `[White Shadow] Scout Chief`** (Krowaz Domion, bölge 75): konuşma `44479` = Korece cümle (`32585_Valencia.lua`).
  - Diğer 7 betik, hiçbir yere yerleşmemiş ya da yalnız kapalı bölgedeki NPC'lere ait.
- **Çözüm önerisi:** 45034 ve 44479 için İngilizce metin yazılsın (ya da satır boş bırakılsın); diğer 631 `talk` satırının erişilemez olduğu için dokunulmaması yeterli. Hangi metin yazılacağı oyun içeriği kararı. Görev adları (`gorev`) için hangilerinin oyuncunun görev listesine düştüğü **doğrulanmadı**.
- **Karar:** Evet — 2 NPC için metin (İngilizce karşılık) kim yazacak.

### K-3 [ORTA/DÜŞÜK] Sunucunun gönderdiği mesajlarda Korece sembol kalıntıları
- **Kanıt:** `TEXT_PACKETS` (3.496 satır): **85** satırda ardışık 2+ yüksek Latin karakter, **53**'ünde 3+ (örn. `��@�@��%s has avenged %s.��@�@��`, `Compressing movie��� %d%%`, `Altar Spawning ��`, `Spirit of Genie��` tırnakları). Bunlar Korece kelime değil; Korece sembol/tırnak baytlarının bozulması (★, ※, “ ” gibi), ama oyuncuya anlamsız karakter olarak görünür.
- **Hangilerinin gerçekten gönderildiği** ve client'ın bu karakterleri nasıl çizdiği **doğrulanmadı**.
- **Çözüm önerisi:** Bu satırlardaki bozuk bayt dizilerini temizle (`UPDATE`, yedekli, önce 85 satırın tek tek listesi). **Risk:** düşük; ama metin biçimi (`%s`, `%d`) bozulmamalı.
- **Karar:** Hayır; müdür onayıyla.

### K-4 [DÜŞÜK] `QUEST_TALK_US` içinde 2 bozuk satır
Premium buff NPC'sinin metni: "`ުcquired contribution points ---- +4`" (ilk harf bozulmuş: `Acquired`). 2 satır, `strTalk`. Düzeltme: harfi geri koy (2 satır UPDATE, yedekli).

### K-5 [DÜŞÜK, ross'a] Arayüz pencerelerinde 4 dosyada Korece metin
Client'ın kodunda adı geçen 40 pencere JSON'undan **4'ü** Korece (mojibake) metin içeriyor:
- `re_target_framebar`: `Å¾½Â` (= "탑승", "binmek"), 1 metin;
- `re_seed_helper`: 16 metin (görev yardımcısı yer tutucusu, "퀘스트 내용 설명 공간 입니다…");
- `co_show_icon`: 2; `re_el_dailyoverallrank`: 3 (`¤·¤·¤·`, "ㅇㅇㅇ" yer tutucu).
Bu metinlerin ekranda görünüp görünmediği **doğrulanmadı**; kullanıcı arayüzü ross'un alanı. Kalan 255 `arayuz/*.json` dosyasında da var ama client kodu o pencereleri açmıyor; `GenelPencereler` herhangi bir `re_*` pencereyi açabildiği için ileride açılırsa görünür.

---

## 6. Kapsam dışı bırakılanlar (oyuncuya görünmüyor, hata saymadım)
- `MAGIC.EnName` (879 satırdan 108'i K-1'de; kalanı oyuncu becerisi olmayan kayıtlar), `MAGIC.KrName` (21), `MAGIC.Description` (10; client kendi tablosundan okuyor), `ITEM_GROUP.name` (1), `MAGIC_TYPE7.strName` (1): sunucu içi, oyuncuya gitmediği için **doğrulanmadı** olarak bıraktım.
- `K_MONSTER.strName`: 13 bozuk ad, **hepsi hiçbir yere yerleşmemiş** (`placed=0`); `K_NPC`/`K_NPCPOS1098` bozuk adı: yerleştirilmiş olan 0.
- `esya/tum.json`: adında `???` olan 7 eşya (Nakjji yayı, `Sword of ?????`, `??? ??`…); sunucuda yalnız **810368000** bir yerde satılıyor (GM Market), geri kalan 6'sı hiçbir dükkanda/ganimette/üretimde yok. GM Market yalnız GM'ye göründüğü için oyuncuya görünmüyor.
- `harita/*/sunucu.json` `adKorece` ve `duyuruKorece` (20 alan, Hangul): özgün Korece kapı metni; **client bunları hiç kullanmıyor** (`client/src` içinde bu alanlara başvuru yok). Oyuncuya görünen `ad`/`duyuru` İngilizce.
- Sunucu Lua betikleri (501 dosyadan 497'sinde "Ä°" gibi baytlar): bunlar **UTF-8 Türkçe yorum satırları** ("RİMA GUARD…"), Korece değil; yanlış alarm.

## 7. Bakılmayanlar
- Arayüz dokularının (`ui_*.png` atlas'ları) **içinde çizili Korece yazı** olup olmadığı: piksellere bakmadım.
- Sunucu `.cpp` kaynağındaki sabit metinler ve `.ini`/`.txt` dosyalarının (`ClanPremiumNotice.txt` vb.) içeriği.
- Oyuncu envanteri/deposu (ikili alan) içindeki beyaz eşya; kullanıcı karakterlerine dokunulmadı.
- Lua betiklerinde dize olarak yazılmış (SelectMsg dışı) metinler.
- Client'ın kendi `.tbl` tablolarının kullanılmayan sütunları (`_tk`/`_tr` hariç tutuldu; CLAUDE.md gereği `_us` kullanılıyor).

## 8. Önerilen sonraki adım
1. **K-1:** `oyuncu-disa-aktar.ps1`'de bozuk `EnName` yerine `KrName` kullan, `oyuncu.json`'u yeniden üret (oyuncuya doğrudan görünen en büyük kalem).
2. **K-2 ve K-4:** Hemes (45034) ve Scout Chief (44479) için İngilizce metin, `QUEST_TALK_US` 2 satır.
3. **K-3:** `TEXT_PACKETS` 85 satırın listesi çıkarılıp temizlenmesi (onayla); K-5 ross'a iletilsin.
