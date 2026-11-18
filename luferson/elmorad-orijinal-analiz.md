# elmorad-canavarlar-orijinal.csv analizi (Görev A / 1)

Girdi: `elmorad-canavarlar-orijinal.csv` (355 yerleşim, resmî 1298 veritabanı K_NPCPOS bölge 2). Myko tarafı: `donusturulmus/web/harita/elmo2004/canavar.json` (249 yerleşim) ve `npc.json` (37 NPC), ikisi de `K_NPCPOS1098 bölge 2`. Seviye/can/tür: `Masaustu DB incele/cozulen.json` içindeki `K_MONSTER` / `K_NPC` (salt okunur). Koordinatlara dokunulmadı, hiçbir şey sunucuya yazılmadı.

## 0. Genel tablo

| durum | canavar | npc | toplam |
|---|---|---|---|
| aynı | 206 | 11 | 217 |
| koordinat farklı | 40 | 21 | 61 |
| Myko'da yok | 28 | 49 | 77 |

- "Myko'da yok" 77 satırın **49'u NPC** (19 sid). Canavar tarafı 9 sid / 28 satır görünüyor, ama bunlardan **biri gerçekte eksik değil** (aşağıda 1a, Spoiler). Gerçek eksik canavar **8 sid / 26 satır**.
- Luferson'daki tablonun aynısı: 28 canavar + 49 NPC "Myko'da yok".
- `mob_listesinde` sütunu El Morad için "bilinmiyor". Master'ın notuna göre client artık modeli sunucudan gelen sid'e göre yüklüyor (Moradon + Luferson + El Morad, 147 tür), bu yüzden bu sütun için ayrıca endişelenmedim.

## 1. "Myko'da yok" — 77 satır, 28 sid

### 1a. Canavarlar (9 sid, 28 satır)

Not (adlar): CSV'deki bazı adlar `K_NPC` tablosundan gelmiş (aynı numara iki tabloda var, bkz. Luferson'daki 551/552). Master'ın kuralıyla (`ActType` < 100 → canavar) bu sid'ler `tur = canavar` olduğu için `K_MONSTER` satırı geçerli. Aşağıda gerçek adı veriyorum, CSV'deki adı parantezde.

| sid | ad (CSV adı) | seviye | can | yer | adet | konum aralığı (x / z) | doğuş sn | Luferson karşılığı |
|---|---|---|---|---|---|---|---|---|
| 502 | Loup-garou (Garind[Inn]) | 27 | 879 | 3 | 15 | 1338–1424 / 440–616 | 30 | 552 |
| 504 | Dark eyes (verofewen[Arms]) | 31 | 1193 | 2 | 10 | 1248–1336 / 430–441 | 30 | 554 (eklendi) |
| 905 | Stinger | 34 | 1286 | 3 | 15 | 1142–1192 / 666–701 | 30 | 955 (eklendi) |
| 1689 | Orc hunter | 40 | 617 | 2 | 2 | 383–386 / 1432–1498 | 60 | 1689 (eklendi) |
| 1005 | Hyde | 45 | 17790 | 5 | 5 | 839–1795 / 276–1767 | 14400 | 1055 (eklendi) |
| 906 | Antares | 50 | 23010 | 5 | 5 | 481–1155 / 310–1601 | 14400 | 956 (eklendi) |
| 1400 | attila | 85 | 89650 | 5 | 5 | 328–1706 / 725–1658 | 14400 | 1450 |
| 3101 | scouting soldier (barricade) | 30 | 3000 | 1 | 5 | 1480 / 964 | 300 | 3151 |
| 303 | spoiler | 22 | 428 | 2 | 14 | 1522–1554 / 471–498 | 30 | bkz. aşağı |

Seviye aralığı: 22–85. Önemli: **303 Spoiler eksik değil.** Myko, El Morad'da aynı iki yerde (1522:471, 1554:498, ayrıca 1541:474) Luferson'un **353 Spoiler**'ini doğuruyor. Orijinalde sid 303, Lv22 / hp 428 (353 ile değerleri aynı; Myko 353'ü Lv30 / hp 831'e çekmiş). Yani bu bir sid değişimi, `canavarlar-orijinal.csv`'de "Myko'da olup orijinalde olmayan" tek canavar sid'i 353 (3 yerleşim, orijinalde 2 yer + Myko'da fazladan bir nokta 1541:474, adet 5).

Gerçek eksik 8 sid: 502, 504, 905, 906, 1005, 1400, 1689, 3101. Bunların Luferson karşılıklarının dördü (554/955/956/1055 → El Morad 504/905/906/1005) ve 1689 master tarafından Luferson'a eklendi. 1689 aynı sid, yani Luferson'a eklenen sid El Morad'da da hazır `K_MONSTER` satırına sahip.

### 1b. NPC'ler (19 sid, 49 satır)

| sid | ad | seviye | yer | adet | Luferson karşılığı |
|---|---|---|---|---|---|
| 11021 | Guard | 60 | 10 | 15 | 21021 |
| 16051–16057 | Sentinel / Watcher / Protector / Ranger / Patroller / Recon / Keeper of the Key | 80 | her biri 4 | 4 | 26051–26057 |
| 11051 | Recon | 60 | 1 | 1 | 21051 |
| 11510 | Captain Falkwine | 90 | 1 | 1 | 21510 (Fargo) |
| 14406 | Royal Guard | 60 | 1 | 1 | 24406 |
| 14407 | Advisor | 60 | 1 | 1 | 24407 |
| 14410 | Royal Chef | 60 | 1 | 1 | 24410 |
| 14411 | Lunar Gate Guard | 60 | 1 | 1 | 24411 |
| 14412 | Eslant Woman | 60 | 1 | 1 | 24412 |
| 14413 | Farmer | 60 | 1 | 1 | 24413 |
| 14414 | Nameless Warrior | 60 | 1 | 1 | 24414 |
| 14402 | Sodun[Beginner Item Rental] | 70 | 1 | 1 | 14403 (Soren) |
| 16080 | Adine[Beginner helper] | 60 | 1 | 1 | 26041 (Adirian) |

Kale NPC'leri: Falkwine 1645:333, Royal Guard 1673:315, Advisor 1703:315, Royal Chef 1702:356, Sodun 1601:423, Adine 1596:427. Luferson'daki grubun aynası; "of the Key" NPC'leri yine haritaya dağılmış (x 306–1884, z 190–1810).

## 2. "Koordinat farklı" — 61 satır

Yöntem Luferson'la aynı: orijinal satırın (x:z) noktasına en yakın Myko noktası; "içinde" = Myko noktası orijinal dikdörtgenin içinde mi.

### 2a. Canavarlar (40 satır)

- 15 satır ≤ 40 birim, 8 satır 41–100, **17 satır 100'ün üstü**. 5 satırda Myko noktası orijinal dikdörtgenin içinde.
- 100'ün üstündeki farklar neredeyse tamamen **"Myko'da o yer hiç yok"** durumu, taşıma değil. En yakın Myko noktası başka bir orijinal yerin karşılığı:

| sid | ad (gerçek) | orijinal yer / adet | Myko yer / adet | en büyük fark |
|---|---|---|---|---|
| 1673 | Lard Orc | 7 / 29 | 1 / 5 | 1517 |
| 1672 | Dusk Orc | 5 / 19 | 2 / 10 | 1418 |
| 1692 | Uruk Hai | 3 / 13 | 3 / 15 | 445 |
| 402 | Stegodon | 4 / 8 | 4 / 8 | 260 |
| 2402 | Giant golem | 3 / 10 | 1 / 5 | 213 |
| 505 | Dire wolf (Nand[Sundries]) | 2 / 10 | 1 / 5 | 208 |
| 1671 | Orc Watcher | 4 / 16 | 3 / 15 | 205 |
| 2202 | Raven Harpy (Lever) | 4 / 17 | 4 / 20 | 116 |
| 3801 | Flame Rock | 2 / 10 | 1 / 5 | 93 |
| 1694 | Uruk Tron | 3 / 13 | 3 / 15 | 83 |
| 4301 | Tyon | 9 / 45 | 10 / 48 | 57 |
| 1104 | Death knight | 5 / 25 | 5 / 25 | 52 |
| 4401 | HORNET | 5 / 25 | 5 / 25 | 47 |
| 4201 | Ape | 5 / 25 | 5 / 25 | 44 |

- Lard Orc ve Dusk Orc'ta Myko neredeyse bütün orijinal yerleri bırakmış (Lard Orc: 7 yerin 6'sı, 24 adet; Dusk Orc: 5 yerin 3'ü).
- Tersi de var (Myko'da fazla): Uruk Blade orijinal 3 yer / 11 adet, Myko 6 / 30; Stone golem 4 / 18, Myko 6 / 30; Lever(2102 Apostle) 3 / 13, Myko 4 / 20.
- Stegodon, Death knight, HORNET, Ape: yer ve adet aynı, konumlar kaymış (Stegodon'un bir yeri 260 birim, Death knight / HORNET / Ape'in yerleri 41–52 birim).

### 2b. NPC'ler (21 satır)

Hepsi ≤ 40 birim, çoğu birkaç birim. Pratik etkisi yok.

## 3. mob_listesinde

El Morad için `mob_listesinde` "bilinmiyor". İleride gerekirse `2.mob` (El Morad bölgesinin .mob dosyası) ayrıştırılarak doldurulabilir; şu an 1.mob (Luferson) ile karşılaştırma yapılmadı. Master'ın notuna göre client modeli sunucudan gelen sid'e göre yüklüyor, bu yüzden eksik canavarlar sunucuya eklenince görünür olmalı.

## 4. Master'ın eklemesi önerilen kısa sıra

Not: tablo değerleri orijinal DB'den. **Myko `K_MONSTER`'da bu 8 sid'in hepsinin satırı var** (salt okunur `SELECT` ile okundu: 502, 504, 905, 906, 1005, 1400, 1689, 3101); yeni satır eklemek gerekmiyor. Myko'daki exp değerleri: 502 → 1312, 504 → 1382, 905 → 2187, **906 → 13125, 1005 → 13125**, 1400 → 61250, 1689 → 2124, **3101 → 10208** (orijinal 0). Ayrıntı `denge-onerileri.md` bölüm 6.

| öncelik | sid | ad | satır | neden | risk / etki |
|---|---|---|---|---|---|
| 1 | 906, 1005 | Antares, Hyde | 5 + 5 | Luferson'da eklenenlerin El Morad eşi; haritaya dağılmış tek tek güçlü canavarlar | Can 23010 / 17790. Doğuş 14400 sn (4 saat). Luferson'da aynı canavarlar 32000 sn (yaklaşık 8,9 saat) ile doğuyor; iki bölgenin farkı orijinal veriden. Myko exp'i 13125 (bir öldürme seviyenin yaklaşık %0,6 / %1,8'i); Luferson'daki 956/1055'in (84 124 / 84 942) yaklaşık 6,4'te biri |
| 2 | 905 | Stinger (Lv34) | 3 yer / 15 adet | Luferson'da eklenen 955'in eşi | Düşük risk |
| 2 | 504 | Dark eyes (Lv31) | 2 yer / 10 adet | 554'ün eşi | Düşük risk |
| 2 | 1689 | Orc hunter (Lv40) | 2 yer / 2 adet | Luferson'da zaten eklendi, aynı sid | Düşük risk; yalnız El Morad yerleşimi gerekir |
| 3 | 502 | Loup-garou (Lv27) | 3 yer / 15 adet | 552'nin eşi; sid 502'nin sunucuda K_NPC (Garind[Inn]) ile çakışması | 502 hangi tablodan yüklenir? Luferson 551/552 için `ActType` kuralı kullanıldı, aynısı burada doğrulanmalı |
| 4 | 1400 | attila (Lv85) | 5 yer / 1'er | üst seviye mini-boss | Can 89650, hasar 2129, doğuş 4 saat. Dengeyi ces onaylamalı |
| ayrı not | 3101 | scouting soldier (Lv30, adı CSV'de "barricade") | 1 yer / 5 adet | Orijinal `byActType` 7, exp 0; Myko'da `byActType` 1 ve **exp 10208** | Eklenirse Lv30'da exp çiftliği (bir öldürme seviyenin yaklaşık %19,7'si). Önce exp düşürülmeli; Recon NPC'siyle (11051, 11 birim yanında) birlikte karar. Luferson 3151 ile aynı konu. K_NPC "barricade" ile çakışıyor |
| gerekmez | 303 | Spoiler | 2 | Myko 353'ü zaten bu yerlere koymuş | Eklemeye gerek yok. Tek nokta: fazladan 1541:474 yerleşimi (adet 5) |
| ces kararı | 11021 ve kale NPC'leri, "of the Key" NPC'leri, Sodun, Adine | 19 + 28 + 2 satır | kale atmosferi, başlangıç yardımcıları | Luferson'daki NPC öneriyle aynı: çoğunun işlevi (görev/script) bilinmiyor, işlevsiz dekor olabilir |

## 5. Doğrulanmayanlar (master'dan istenen karar/iş)

1. ~~El Morad canavar sid'lerinin Myko `K_MONSTER` satırı var mı?~~ **Çözüldü:** hepsinin satırı var (bkz. bölüm 4 notu).
2. ~~502 ve 3101 `K_NPC` ile çakışıyor (Garind[Inn], barricade); El Morad satırlarında `ActType` < 100 mü?~~ **Çözüldü:** orijinal `K_NPCPOS` (bölge 2) satırlarında 502, 504, 905, 906, 1005, 1400, 1689, 3101 ve 303'ün hepsinde `ActType` = 1 (canavar). Luferson tarafında 551, 552, 554, 955, 956, 1055, 1450, 1689, 3151 için de aynı (hepsi 1). Çakışma kuralı iki bölgede de aynı sonucu veriyor; Myko `K_NPCPOS1098` satırlarına ayrıca bakmadım.
3. Myko'nun El Morad'daki Lard Orc / Dusk Orc yerleşimini bilerek mi azalttığı (Lard Orc 7 → 1 yer, Dusk Orc 5 → 2 yer).
4. `byActType` 7 (scouting soldier) ve NPC `byType` değerlerinin anlamı.
