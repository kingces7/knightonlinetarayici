# canavarlar-orijinal.csv analizi (Görev 2)

Girdi: `canavarlar-orijinal.csv` (354 satır), `canavarlar.csv` (Myko, 62 canavar), `mob-listesi.csv` (1.mob'daki 175 numara).
Seviye/can/tür bilgisi: `Masaustu DB incele/cozulen.json` ve `cozulen2018.json` içindeki `K_MONSTER` / `K_NPC` tabloları (salt okunur; iki dökümde de bu sid'ler aynı değerde). Koordinatlara dokunulmadı, hiçbir şey sunucuya yazılmadı.

## 0. Genel tablo

| durum | canavar | npc | toplam |
|---|---|---|---|
| aynı | 224 | 11 | 235 |
| koordinat farklı | 22 | 20 | 42 |
| Myko'da yok | 28 | 49 | 77 |

- Myko'da olup orijinalde **olmayan** canavar sid'i yok. Fark tek yönlü: orijinalde fazla olanlar var.
- "Myko'da yok" 77 satırın **49'u NPC** (27 sid'in 19'u). Yani gerçek eksik canavar yalnız **28 satır / 8 sid**.

## 1. "Myko'da yok" — 77 satır, 27 sid

Seviye ve can orijinal DB'den (`K_MONSTER`, NPC'lerde `K_NPC`). `mob` = sid `mob-listesi.csv`'de (1.mob'da) var mı.

### 1a. Canavarlar (8 sid, 28 satır)

| sid | ad | seviye | can | yer | adet | mob | konum aralığı (x / z) |
|---|---|---|---|---|---|---|---|
| 552 | Safety Zone Gate2 (bkz. not A) | 27 (K_MONSTER: Loup-garou) | 879 | 3 | 15 | hayır | 578–666 / 1473–1660 |
| 554 | Dark eyes | 31 | 1193 | 2 | 10 | hayır | 685–718 / 1627–1687 |
| 955 | Stinger | 34 | 1286 | 5 | 25 | hayır | 712–794 / 1497–1557 |
| 1689 | Orc hunter | 40 | 617 | 2 | 2 | hayır | 1196–1404 / 371–999 |
| 1055 | Hyde | 45 | 17790 | 5 | 5 | evet | 626–1782 / 331–1394 |
| 956 | Antares | 50 | 23010 | 5 | 5 | evet | 259–1541 / 1192–1873 |
| 1450 | attila (byType 3) | 85 | 89650 | 5 | 5 | hayır | 824–1592 / 557–1449 |
| 3151 | scouting soldier | 30 | 3000 | 1 | 5 | evet | 811 / 1806 |

Seviye aralığı: 27–85. 552/554/955 orijinalde Luferson başlangıç bölgesinin (x 578–794, z 1473–1687) hemen yanında; 1055/956/1450 haritaya dağılmış tek tek duran güçlü canavarlar (yer başına 1 adet).

**Not A (sid çakışması):** 551 ve 552 hem `K_NPC`'de ("Safety Zone Gate1/2", Lv60, 70000 can) hem `K_MONSTER`'da (551 = Lycan Lv25, 552 = Loup-garou Lv27) var. `canavarlar.csv` 551'i Lycan olarak veriyor ve 3 yer / 15 adet orijinalle aynı; `canavarlar-orijinal.csv`'deki "Safety Zone Gate" adı büyük ihtimalle yanlış tabloyla eşleşmiş. Bu **bir tahmin**, doğrulanmadı: sunucunun 551/552'yi hangi tablodan yüklediğine master bakmalı. Doğruysa 552 = Loup-garou (Lv27), `canavarlar.csv`'de de yok.

### 1b. NPC'ler (19 sid, 49 satır)

| sid | ad | seviye | yer | adet | mob |
|---|---|---|---|---|---|
| 21021 | Guard | 60 | 10 | 14 | evet |
| 26051 | Sentinel of the Key | 80 | 4 | 4 | evet |
| 26052 | Watcher of the Key | 80 | 4 | 4 | evet |
| 26053 | Protector of the Key | 80 | 4 | 4 | evet |
| 26054 | Ranger of the Key | 80 | 4 | 4 | evet |
| 26055 | Patroller of the Key | 80 | 4 | 4 | evet |
| 26056 | Recon of the Key | 80 | 4 | 4 | evet |
| 26057 | Keeper of the Key | 80 | 4 | 4 | evet |
| 21051 | Recon | 60 | 1 | 1 | evet |
| 21510 | Captain Fargo | 90 | 1 | 1 | evet |
| 24406 | Royal Guard | 60 | 1 | 1 | evet |
| 24407 | Advisor | 60 | 1 | 1 | evet |
| 24410 | Royal Chef | 60 | 1 | 1 | evet |
| 24411 | Lunar Gate Guard | 60 | 1 | 1 | evet |
| 24412 | Eslant Woman | 60 | 1 | 1 | evet |
| 24413 | Farmer | 60 | 1 | 1 | evet |
| 24414 | Nameless Warrior | 60 | 1 | 1 | hayır |
| 14403 | Soren[Beginner Item Rental] | 70 | 1 | 1 | evet |
| 26041 | Adirian[Beginner Helper] | 60 | 1 | 1 | hayır |

Kale içindekiler (Royal Guard, Advisor, Royal Chef, Captain Fargo) x 342–411 / z 1698–1739 civarında. Beginner Item Rental ve Beginner Helper başlangıç bölgesinde (455–459 / 1633–1637). "of the Key" NPC'leri haritaya dağılmış; `byType` 111–117 ayrı ayrı, yani her biri farklı işlev taşıyor olabilir (içeriği doğrulanmadı).

## 2. "Koordinat farklı" — 42 satır

Yöntem: orijinal satırın (x:z) noktasına en yakın Myko noktası (canavarlarda `canavarlar.csv` slotu, NPC'lerde `npc-listesi.csv`). "içinde" = Myko noktası orijinal dikdörtgenin (x,z → x2,z2) içinde mi.

### 2a. Canavarlar (22 satır)

| sid | ad | orijinal | en yakın Myko | fark | içinde |
|---|---|---|---|---|---|
| 353 | spoiler | 493:1571 | 517:1575 | 24 | hayır |
| 353 | spoiler | 533:1604 | 545:1583 | 24 | hayır |
| 452 | Stegodon | 1173:1902 | 1131:1638 | **267** | hayır |
| 551 | (Lycan?) | 491:1547 | 532:1502 | 61 | hayır |
| 551 | (Lycan?) | 542:1594 | 578:1602 | 37 | hayır |
| 551 | (Lycan?) | 605:1587 | 600:1561 | 26 | hayır |
| 555 | Dire wolf | 744:1698 | 669:1616 | **111** | hayır |
| 1254 | Cardinal | 640:881 | 687:864 | 50 | evet |
| 1350 | Kongau | 1376:1815 | 1400:1784 | 39 | evet |
| 1353 | Haunga | 1329:1507 | 1294:1504 | 35 | hayır |
| 1353 | Haunga | 1395:1471 | 1405:1447 | 26 | evet |
| 1693 | Uruk Blade | 1699:625 | 1707:641 | 18 | hayır |
| 1694 | Uruk Tron | 1563:386 | 1425:198 | **233** | hayır |
| 2451 | Stone golem | 1774:557 | 1797:549 | 24 | evet |
| 2451 | Stone golem | 1899:851 | 1907:835 | 18 | evet |
| 2451 | Stone golem | 1930:633 | 1954:608 | 35 | hayır |
| 2452 | Giant golem | 1904:816 | 1929:807 | 27 | evet |
| 3851 | Flame Rock | 1906:852 | 1860:652 | **205** | hayır |
| 4251 | Ape | 172:1341 | 189:1350 | 19 | hayır |
| 4251 | Ape | 221:1362 | 243:1356 | 23 | hayır |
| 4251 | Ape | 277:1368 | 279:1340 | 28 | hayır |
| 4351 | Tyon | 386:1143 | 381:1223 | 80 | hayır |

- 22 satırın 15'i 40 birim veya daha yakın (Myko noktası büyük ihtimalle aynı yerin hafif kaymış hali); 3'ü 41–100; 4'ü 100'ün üstünde.
- **100'ün üstündeki 4 fark gerçek taşıma değil, fazladan yer olabilir:** Stegodon orijinalde 4 yer / Myko'da 3 slot, Uruk Tron 3 / 2, Flame Rock 2 / 1. Bu üçünde en yakın Myko noktası zaten başka bir orijinal satırla "aynı" eşleşmiş; yani o orijinal yerin Myko'da karşılığı yok. Dire wolf tersi: orijinalde 1 yer / 5 adet, Myko'da 2 slot / 10 adet.
- Adet farkları (orijinal → Myko): spoiler 14 → 19, Dire wolf 5 → 10, Haunga 16 → 20, Uruk Blade 13 → 18, Uruk Tron 13 → 8, Stone golem 18 → 25, Giant golem 11 → 15, Flame Rock 10 → 5, Stegodon 8 → 6. Diğerleri eşit.

### 2b. NPC'ler (20 satır)

Hepsi 21 birim veya daha yakın; 17'si ≤ 5. En büyük fark: Beron/Veron [Sundries] 426:651 → 433:671 (21), Warrior Master 383:1741 → 391:1738 (9), Habice[Mantle] 393:1736 → 401:1737 (8). Ad farkları yalnız yazım (Beron/Veron, Skaky/Skaki). Pratik etki yok.

## 3. mob-listesi.csv (1.mob) karşılaştırması

- Orijinalin 354 satırından 301'i `mob-listesinde = evet`, 53'ü hayır.
- **Client'ın yüklemediği ("hayır") ve orijinalde olup Myko'da eksik olanlar:** 552, 554, 955, 1450, 1689 (canavar) ve 24414, 26041 (NPC). Bunları sunucuya eklesek bile client'ta model/kayıt olmayabilir; görünmez ya da hatalı olabilir. (Bu client'ta henüz denenmedi, tahmin.)
- Diğer 20 eksik sid'in hepsi 1.mob'da var, client tarafında hazır.

## 4. Master'ın eklemesi önerilen kısa liste

Not: bu değerler orijinal DB'den. Myko `K_MONSTER`/`K_NPC` tablosunda bu sid satırı yoksa spawn tek başına yetmez, satırın da eklenmesi gerekir. Myko'daki exp/can ölçeği orijinalle aynı olmayabilir; ben karşılaştırmadım.

| öncelik | sid | ad | satır | neden | risk / etki |
|---|---|---|---|---|---|
| 1 | 956 | Antares (Lv50) | 5 | 1.mob'da var, tek tek duran güçlü canavar | Can 23010, hasar 650. Aynı seviyedeki Myko canavarından (Kongau Lv50, can 4602) kat kat güçlü; oyuncuya "mini boss" gibi görünür |
| 1 | 1055 | Hyde (Lv45) | 5 | 1.mob'da var, aynı tür | Can 17790. Aynı not |
| 2 | 554 | Dark eyes (Lv31) | 2 yer / 10 adet | Luferson başlangıç bölgesinin yanı, düşük seviye | 1.mob'da yok: önce client'ta model var mı bakılmalı |
| 2 | 955 | Stinger (Lv34) | 5 yer / 25 adet | aynı bölge, en kalabalık eksik grup | 1.mob'da yok: aynı not |
| 2 | 1689 | Orc hunter (Lv40) | 2 yer / 2 adet | küçük ekleme | 1.mob'da yok |
| 3 | 1450 | attila (Lv85, byType 3) | 5 | üst seviye boss | Can 89650, hasar 2129; ayrıca 1.mob'da yok. Dengeyi ces onaylamalı |
| bekle | 551 / 552 | Lycan / Loup-garou? | 3 + 3 | Not A'daki sid çakışması | Yanlış tablodan yüklenirse kapı NPC'si (Lv60, 70000 can) doğabilir. Doğrulanmadan ekleme |
| bekle | 3151 | scouting soldier | 1 / 5 adet | `byActType` 7, yani saldırgan canavar mı muhafız mı belli değil | Anlamı doğrulanmadı |
| ces kararı | 21021 ve kale NPC'leri | Guard, Royal Guard, Advisor, Royal Chef, Captain Fargo, Lunar Gate Guard, Eslant Woman, Farmer | 17 satır | kale atmosferi | Çoğunun işlevi (görev/script) bilinmiyor; işlevsiz dekor olabilir. Önce Myko `K_NPC`'de satırları var mı |
| ces kararı | 26051–26057 | "of the Key" NPC'leri | 28 satır | orijinalde haritaya dağılmış | `byType` 111–117, olay/görev bağlantısı olabilir; tek başına işlevsiz kalabilir |
| ces kararı | 14403, 26041 | Beginner Item Rental, Beginner Helper | 2 | başlangıç yardımcıları | Script gerektirir; 26041 1.mob'da yok |

Öneri sırası: önce 1. öncelik (956, 1055: client hazır, satır sayısı az), sonra client kontrolüyle 2. öncelik grubu. 551/552 çakışması çözülmeden hiçbir "Safety Zone" satırı eklenmemeli.

## 5. Doğrulanmayanlar (master'dan istenen karar/iş)

1. 551/552 sid'inin sunucuda `K_MONSTER` mi `K_NPC` mi olarak yüklendiği.
2. Eksik sid'lerin Myko `K_MONSTER`/`K_NPC` tablosunda satırı var mı.
3. `byActType` 7 (scouting soldier, Guard vb.) ve NPC `byType` değerlerinin anlamı.
4. 1.mob'da olmayan sid'ler (552, 554, 955, 1450, 1689, 24414, 26041) client'ta görünür mü.
