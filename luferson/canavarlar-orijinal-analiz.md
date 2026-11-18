# canavarlar-orijinal.csv analizi (Görev 2, yenilenen CSV'ye göre güncellendi)

Girdi: `canavarlar-orijinal.csv` (354 satır, yenilendi), `mob-listesi.csv` (1.mob'daki 175 numara). Myko tarafı: `donusturulmus/web/harita/karus2004/canavar.json` (257 yerleşim) ve `npc.json` (37 NPC); not: bu dışa aktarma master'ın eklediği 5 canavardan önce üretilmiş (956, 1055, 554, 955, 1689 henüz içinde yok), ama o satırlar CSV'de zaten "aynı" olduğu için aşağıdaki karşılaştırmayı etkilemiyor. Seviye/can/tür: `Masaustu DB incele/cozulen.json` `K_MONSTER` / `K_NPC` (salt okunur). Koordinatlara dokunulmadı, hiçbir şey sunucuya yazılmadı.

## 0. Önceki sürüme göre ne değişti

| durum | eski | yeni | fark |
|---|---|---|---|
| aynı | 235 | **254** | +19 |
| koordinat farklı | 42 | **42** | 0 |
| Myko'da yok | 77 | **58** | −19 |

- +19 satır, master'ın eklediği 5 canavardır: 956 Antares (5), 1055 Hyde (5), 955 Stinger (5), 554 Dark eyes (2), 1689 Orc hunter (2). Hepsi artık "aynı".
- "Koordinat farklı" 42 satır değişmedi.
- Tür dağılımı: aynı 243 canavar + 11 NPC; farklı 22 canavar + 20 NPC; **yok 9 canavar + 49 NPC**.
- Myko'da olup orijinalde olmayan canavar sid'i yok.

| durum | canavar | npc | toplam |
|---|---|---|---|
| aynı | 243 | 11 | 254 |
| koordinat farklı | 22 | 20 | 42 |
| Myko'da yok | 9 | 49 | 58 |

## 1. "Myko'da yok" — 58 satır, 22 sid

### 1a. Canavarlar — kalan 3 sid, 9 satır

| sid | ad | seviye | can | yer | adet | konum aralığı (x / z) | doğuş sn | 1.mob |
|---|---|---|---|---|---|---|---|---|
| 552 | Loup-garou (CSV'de "Safety Zone Gate2") | 27 | 879 | 3 | 15 | 578–666 / 1473–1660 | 30 | hayır |
| 3151 | scouting soldier | 30 | 3000 | 1 | 5 | 811 / 1806 | 300 | evet |
| 1450 | attila | 85 | 89650 | 5 | 5 | 824–1592 / 557–1449 | 32000 | hayır |

Seviye aralığı 27–85. Master'ın 551/552 kuralı (`ActType` < 100 → canavar) uyarınca 552, K_NPC'deki "Safety Zone Gate2" değil, K_MONSTER'daki Loup-garou. Aynı kural 551 için işliyor: `canavar.json`'da 551 için 3 yerleşim (532:1502, 578:1602, 600:1561) var.

**Tamamlananlar (artık "aynı"):** 956 Antares Lv50, 1055 Hyde Lv45, 955 Stinger Lv34, 554 Dark eyes Lv31, 1689 Orc hunter Lv40. 1.mob'da olmayanlar (554, 955, 1689) için master client'ın artık modeli sunucudan gelen sid'e göre yüklediğini bildirdi.

### 1b. NPC'ler (19 sid, 49 satır) — değişmedi

| sid | ad | seviye | yer | adet | doğuş sn | 1.mob |
|---|---|---|---|---|---|---|
| 21021 | Guard | 60 | 10 | 14 | 3600 | evet |
| 26051 | Sentinel of the Key | 80 | 4 | 4 | 1800 | evet |
| 26052 | Watcher of the Key | 80 | 4 | 4 | 1800 | evet |
| 26053 | Protector of the Key | 80 | 4 | 4 | 1800 | evet |
| 26054 | Ranger of the Key | 80 | 4 | 4 | 1800 | evet |
| 26055 | Patroller of the Key | 80 | 4 | 4 | 1800 | evet |
| 26056 | Recon of the Key | 80 | 4 | 4 | 1800 | evet |
| 26057 | Keeper of the Key | 80 | 4 | 4 | 1800 | evet |
| 21051 | Recon | 60 | 1 | 1 | 1800 | evet |
| 21510 | Captain Fargo | 90 | 1 | 1 | 1800 | evet |
| 24406 | Royal Guard | 60 | 1 | 1 | 1800 | evet |
| 24407 | Advisor | 60 | 1 | 1 | 1800 | evet |
| 24410 | Royal Chef | 60 | 1 | 1 | 1800 | evet |
| 24411 | Lunar Gate Guard | 60 | 1 | 1 | 1800 | evet |
| 24412 | Eslant Woman | 60 | 1 | 1 | 1800 | evet |
| 24413 | Farmer | 60 | 1 | 1 | 1800 | evet |
| 24414 | Nameless Warrior | 60 | 1 | 1 | 1800 | hayır |
| 14403 | Soren[Beginner Item Rental] | 70 | 1 | 1 | 1800 | evet |
| 26041 | Adirian[Beginner Helper] | 60 | 1 | 1 | 1800 | hayır |

Kale içindekiler (Royal Guard, Advisor, Royal Chef, Captain Fargo) x 342–411 / z 1698–1739; Beginner Item Rental ve Beginner Helper başlangıçta (455–459 / 1633–1637); "of the Key" NPC'leri haritaya dağılmış (x 126–1735, z 168–1848). 26041 ve 24414'ün K_NPC satırı var (master doğruladı, canavar değil).

## 2. "Koordinat farklı" — 42 satır (değişmedi)

Yöntem: orijinal satırın (x:z) noktasına en yakın Myko noktası (canavarlarda `canavar.json`, NPC'lerde `npc.json`); "içinde" = Myko noktası orijinal dikdörtgenin içinde mi.

### 2a. Canavarlar (22 satır)

| sid | ad | orijinal | en yakın Myko | fark | içinde |
|---|---|---|---|---|---|
| 353 | spoiler | 493:1571 | 517:1575 | 24 | hayır |
| 353 | spoiler | 533:1604 | 545:1583 | 24 | hayır |
| 452 | Stegodon | 1173:1902 | 1131:1638 | **267** | hayır |
| 551 | Lycan (CSV'de "Safety Zone Gate1") | 491:1547 | 532:1502 | 61 | hayır |
| 551 | Lycan | 542:1594 | 578:1602 | 37 | hayır |
| 551 | Lycan | 605:1587 | 600:1561 | 26 | hayır |
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

- 15 satır ≤ 40 birim, 3'ü 41–100, 4'ü 100'ün üstünde; 6 satırda Myko noktası dikdörtgenin içinde.
- 100'ün üstündeki 4 fark gerçek taşıma değil, **fazladan yer**: Stegodon orijinal 4 yer / 8 adet, Myko 3 / 6; Uruk Tron 3 / 13 → 2 / 8; Flame Rock 2 / 10 → 1 / 5. Dire wolf tersi: orijinal 1 yer / 5 adet, Myko 2 / 10.
- Adet farkları (orijinal → Myko): spoiler 14 → 19, Haunga 16 → 20, Uruk Blade 13 → 18, Stone golem 18 → 25, Giant golem 11 → 15; Cardinal, Kongau, Ape, Tyon, Lycan aynı.

### 2b. NPC'ler (20 satır)

Hepsi ≤ 21 birim, 17'si ≤ 5. En büyüğü Beron/Veron [Sundries] 426:651 → 433:671 (21), sonra Warrior Master 9, Habice 8. Ad farkları yalnız yazım. Pratik etki yok.

## 3. mob-listesi.csv (1.mob) karşılaştırması

- 354 satırdan 301'i `mob_listesinde = evet`, 53'ü hayır (eklenen 554/955/1689'un 9 satırı dahil).
- Kalan eksik 22 sid'in 18'i 1.mob'da var; **1.mob'da olmayanlar: 552, 1450, 24414, 26041.** Master'ın bildirdiğine göre client modeli sunucudan gelen sid'e göre yüklüyor, bu yüzden 1.mob'da olmamak artık engel değil; yine de 1450 ve 552 eklenince ilk doğrulama oyunda yapılmalı.

## 4. Master'ın eklemesi önerilen kısa sıra (kalan eksikler)

Not: tablo değerleri orijinal DB'den. Myko `K_MONSTER` satırları sonradan okundu (salt okunur `SELECT`); 552, 1450 ve 3151'in Myko değerleri aşağıdaki notlarda ve `denge-onerileri.md` bölüm 6'da.

| öncelik | sid | ad | satır | neden | risk / etki |
|---|---|---|---|---|---|
| 1 | 552 | Loup-garou (Lv27) | 3 yer / 15 adet | Kalan tek "sıradan" canavar. 551 Lycan ile aynı bölgede (578–666 / 1473–1660), 551'de aynı kural çalışıyor | Düşük risk. Sid çakışması (K_NPC "Safety Zone Gate2" Lv60, 70000 can) `ActType` kuralıyla çözülüyor; ilk doğuştan sonra kapı değil Loup-garou doğduğu doğrulanmalı |
| 2 | 1450 | attila (Lv85) | 5 yer / 1'er | Üst seviye tek tek duran mini-boss | Ayrı not (aşağıda). Ces onayı şart |
| bekle | 3151 | scouting soldier (Lv30) | 1 yer / 5 adet | Recon NPC'sinin (21051) yanındaki garnizon | Ayrı not (aşağıda). Tek başına eklenmesi önerilmez |
| ces kararı | 21021 ve kale NPC'leri (Royal Guard, Advisor, Royal Chef, Captain Fargo, Lunar Gate Guard, Eslant Woman, Farmer), "of the Key" NPC'leri, 14403 Soren, 26041 Adirian, 24414 | 18 + 28 + 3 satır | Atmosfer / başlangıç yardımcıları | Çoğunun işlevi (görev/script) bilinmiyor; işlevsiz dekor olabilir. 14403 ve 26041 script ister |

### Ayrı not — 1450 attila (Lv85)
- Orijinal değerler: can **89650**, savunma 1224, hasar 2129, exp **129231**, `byType` 3, doğuş **32000 sn (yaklaşık 8,9 saat)**, 5 yer × 1 adet (824:557, 993:1449, 1394:1198, 1478:937, 1592:1175).
- Luferson'daki mevcut en dayanıklı canavarla kıyas: Troll Warrior (Lv80) hp 38190, Giant golem (Lv110) hp 29392; attila 2,3–3 kat. Savunması da en yüksek (Giant golem 1039'a karşı 1224). Hasarı Troll Warrior'dan (3760) düşük.
- **Myko `K_MONSTER` 1450 (okundu):** hp 89650, savunma 1224 (orijinalle aynı), **hasar 2357** (orijinal 2129, +%10,7), **exp 82491** (orijinal 129231, ×0,638), `byActType` 1. Myko'nun diğer en yüksek exp'i Troll Warrior 21962; attila bunun 3,8 katı. Lv85 için `LEVEL_UP` satırı yok (tablo Lv83'te bitiyor).
- **El Morad'daki eşi 1400** başka değerlerle duruyor (hp 79650, savunma 1285, hasar 2074, exp 61250); iki bölgenin attila'sı kendi aralarında da tutarsız.
- Öneri: exp için katsayı seçeneği A (orijinal × 0,141 ≈ 18 222) ya da mevcut hızı koruyan B (≈ 0,20 × 129231 ≈ 25 800); ayrıntı `denge-onerileri.md` bölüm 6.4.
- Seviye 85; Myko'daki Lv80+ canavarlar haritanın doğusunda (x yaklaşık 1100–1950). attila'nın yerleri ise daha düşük seviye bölgelerine denk geliyor: 1394:1198 HORNET (Lv45) yuvalarının, 824:557 Lamia (Lv60) yuvalarının yakınında.
- 8,9 saatlik doğuş ve 5 ayrı yer, onu "haritada rastgele dolaşan nadir boss" yapar. **Öneri:** ancak ces bu mini-boss'u istiyorsa ve exp/drop (K_NPC_ITEM) kontrol edildikten sonra eklensin.

### Ayrı not — 3151 scouting soldier (Lv30)
- Orijinal değerler: can 3000, savunma 500, hasar 100, **exp 0**, `byActType` **7**, `byType` 0.
- **Myko `K_MONSTER` 3151 (okundu):** can/savunma/hasar aynı, ama **exp 10208** (orijinal 0) ve `byActType` **1**. Lv30'da seviye atlamak 51 750 exp ister; bir öldürme seviyenin **%19,7'sini** verir (sıradan Lv30 canavarı yaklaşık %3, 30 öldürme). 3151 5 adet / 300 sn doğuşla eklenirse exp çiftliği olur (3101 de aynı değerde).
- `byActType` 7'nin anlamı: elimdeki açık kaynak 1299 sunucusunda (`AIServer/Npc.cpp`) `byActType` 1 ve 2 pasif (yalnız saldırılınca karşılık verir), 3 ve 4 saldırgan + yardım çağırır, 6 değişmez, **diğer her değer (7 dahil) saldırgan**. Yani bu kodda scouting soldier oyuncuya kendisi saldırır ve exp vermez. **Myko'nun kendi kaynağında aynı olduğunu doğrulamadım.**
- K_MONSTER'da `byActType` 7 yalnız iki satırda var, ikisi de scouting soldier (3101 ve 3151). K_NPC'de 285 satırda 7 var (Blade Master, Rogue, ranger gibi insansı NPC'ler).
- Konumu Recon NPC'siyle (21051 → 821:1802) 10 birim mesafede (811:1806). El Morad'da aynı çift: 3101 (1480:964) ile Recon 11051 (1487:953). Yani bu iki yerleşim bir garnizon/karakol.
- **Öneri:** Myko'daki exp 10208 değeriyle eklenmemeli. Önce exp'in düşürülmesi (0 ya da seviye 30'a uygun yaklaşık 1000–1400) gerekir. Recon NPC'si eklenmeyecekse 3151'in de eklenmesine gerek yok; ikisi birlikte ces kararı. (Orijinaldeki `byActType` 7 açık kaynak kodda "saldırgan" dalına düşüyordu; Myko satırı 1 olduğu için davranış bilinmiyor.)

## 5. Doğrulanmayanlar (master'dan istenen karar/iş)

1. 1450 ve 3151 için `K_NPC_ITEM` (drop) kayıtları (bakılmadı); 1450'nin exp'i (82491) ve 3151'in exp'i (10208) kasıtlı mı.
2. 552 eklendikten sonra kapı NPC'si değil Loup-garou doğduğunun teyidi.
3. `byActType` 1 (Myko) ve 7 (orijinal) davranışının Myko sunucusunda ne yaptığı (açık kaynak kodda 1–2 pasif, 7 saldırgan; Myko kaynağında doğrulanmadı).
4. `canavar.json` / `npc.json` dışa aktarmasını yenilemek (eklenen 5 canavar içinde yok).
