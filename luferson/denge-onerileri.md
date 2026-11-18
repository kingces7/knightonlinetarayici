# Canavar dengesi — öneriler (Görev 1 / denge)

Yalnız öneri. `canavarlar.csv`'de hiçbir değer değiştirilmedi.

## Yöntem ve sınırlar

- Girdi: `canavarlar.csv` (62 canavar, Lv24–110). Karşılaştırma: komşu seviyeler (±6) ve seviye bantlarının medyanı, ayrıca log-doğrusal eğri (hp, savunma, hasar, exp, altın ~ seviye).
- "Orijinal" = `Masaustu DB incele/cozulen.json` içindeki `K_MONSTER` satırı (aynı sid). Böylece bir uçuk değerin orijinalden mi geldiği, Myko'da mı değiştirildiği ayrılabiliyor.
- **Sınır:** oyuncu gücü (can, hasar, ekipman) için elimde model yok. "Çok zor / çok kolay" demiyorum; yalnız canavarın komşularına göre aykırı olup olmadığını söylüyorum. Sayısal hedefler komşu medyanlarından çıkarıldı, kesin değil.

## 1. Genel eğri

Seviye başına büyüme (eğri eğimi): hp ×1,046, savunma ×1,016, hasar ×1,051, exp ×1,035, altın ×1,015. Altın en düzgün metrik (sapma küçük). Hp ve hasar en dağınık.

| seviye bandı | n | hp medyan | exp medyan | hasar medyan | savunma medyan | altın medyan |
|---|---|---|---|---|---|---|
| 24–33 | 10 | 788 | 1356 | 72 | 224 | 120 |
| 34–41 | 10 | 1680 | 3394 | 197 | 252 | 150 |
| 42–50 | 11 | 3002 | 4812 | 289 | 324 | 180 |
| 51–57 | 9 | 4773 | 5250 | 445 | 405 | 220 |
| 58–65 | 6 | 6004 | 8094 | 818 | 432 | 218 |
| 66–75 | 6 | 14862 | 9231 | 1280 | 491 | 237 |
| 76–90 | 7 | 12551 | 12496 | 1867 | 576 | 281 |
| 91–110 | 3 | 21497 | 17587 | 2287 | 720 | 349 |

Not: 66–75 bandında hp medyanı, 76–90 bandından yüksek (Troll/Apostle/Harpy Lv70 hp ~21 bin). Eğri tek yönlü artmıyor; bu aşağıdaki aykırılardan biri.

## 2. Orijinalden Myko'ya ne değişmiş (kaynaklı gerçekler)

- **exp:** 62 canavarın 62'sinde exp orijinalden düşük. Myko/orijinal oranı **0,075 – 0,727**, medyan **0,176** (çeyrekler 0,13–0,23). Yani exp genel olarak ~%18'e çekilmiş, ama **oran tutarsız**. Aynı orijinal exp'e sahip canavarlar Myko'da çok farklı: KOBOLD ve Orc Watcher (ikisi 4374 → 1356 ve 328), POOKA ve Dusk Orc (ikisi 8910 → 1557 ve 6478), Haunga Warrior ve Uruk Hai (ikisi 25731 → 8750 ve 4812), Troll Warrior ve Raven Harpy (ikisi 135654 → 21962 ve 13750).
- **hasar ×1,6:** Bugbear (93→148), Lard Orc (500→800), burning skeleton (638→1020), Haunga Warrior (1000→1600), Uruk Hai (1045→1672), Uruk Blade (1574→2518). Hepsi tam 1,6 kat; başka canavarların hasarı ya aynı kalmış ya düşürülmüş.
- **hp artışı / hasar düşüşü (üst seviye):** Deruvish hp 10890→18890 ve hasar 1045→800; Stone Golem hp 11000→21497, hasar 3119→1119; Giant golem hp 14000→29392, hasar 4335→2335; Harpy hp 16167→21167; Raven Harpy hp 27496→31496. Centaur savunması 1134→378. Bu grupta "daha dayanıklı, daha az vuran" tutarlı bir ayar görünüyor.
- **Skeleton (sid 1150) tamamen değişmiş:** orijinal Lv31 / hp 1193 / savunma 210 / hasar 89 / exp 9468. Myko: **Lv80** / hp 1000 / savunma 500 / hasar 300 / exp 2625 / altın 110. Aşağıda 1 numaralı bulgu.
- Spoiler (Lv22→30, hp 428→831) ve Kongau (Lv49→50) de seviyesi ayarlanmış.

## 3. Aykırılar (önem sırasıyla)

### 3.1 Skeleton (1150), Lv80 — en büyük aykırı (GÜNCELLEME: master orijinal Lv31 değerlerine döndürdü, bkz. bölüm 6.0)
- Lv80 olmasına rağmen hp 1000 (Lv76–90 medyanı 12551; komşuya oranı **×0,08**), hasar 300 (×0,16), exp 2625 (×0,19), altın 110 (komşular 250–330).
- Log eğrisine göre hp için z = −3,5, exp için z = −2,6: eğrideki en uç nokta.
- Konumu (918:1203, 872:1083, 875:1128) Lv33–45 iskelet bölgesinin (Skeleton knight 982:1143, Death knight 1006:1109) yakınında (en yakın Skeleton knight yuvasına yaklaşık 90–125 birim). Seviyesi 80'e çekilirken diğer değerler çekilmemiş görünüyor.
- **Öneri (iki yol, karar ces/master):**
  - A) Orijinale dön: Lv31, hp 1193, savunma 210, hasar 89, exp yaklaşık 1700 (orijinal exp'in medyan oranı 0,176 ile). Konuma uyar.
  - B) Lv80 kalacaksa: hp ≈ 12500, savunma ≈ 576, hasar ≈ 1870, exp ≈ 12500, altın ≈ 280 (Lv76–90 bandı medyanları). Konumu da değişmeli (bölgedeki canavarlar Lv33–45).

### 3.2 exp tutarsızlığı (bölüm 2'deki oran dağınıklığı)
Komşu medyanından en çok sapanlar:

| canavar | seviye | exp | sapma | not |
|---|---|---|---|---|
| Orc Watcher | 30 | 328 | komşuya ×0,23; eğri z = −3,3 | orijinali 4374; en düşük oran (0,075) |
| Spoiler | 30 | 500 | ×0,35; z = −2,5 | |
| Lycan | 25 | 568 | z = −2,0 | Zombie Lv24: 1356, Scorpion Lv26: 1312 |
| Rotten Eyes | 30 | 3475 | ×2,56 | hp de 970→1375 yükseltilmiş, exp kısmen gerekçeli |
| Dusk Orc | 40 | 6478 | exp/hp = **10,5** (medyan 1,33) | hp 617. En kolay exp |
| Lard Orc | 50 | 4375 | exp/hp = 4,1 | hp 1058 |
| Uruk Hai | 60 | 4812 | exp/hp = 2,9 | |

Aynı ±3 seviye içinde en düşük ile en yüksek exp arasında ≥ 4 kat olan çiftler: Orc Watcher (Lv30, 328) ile undying (Lv33, 3750): ×11; Orc Watcher ile Skeleton knight (Lv35, 3981): ×12; Bugbear (Lv35, 1443) ile Dusk Orc (Lv40, 6478): ×4,5; POOKA (Lv40, 1557) ile Dusk Orc: ×4,2.
- **Öneri:** Orc Watcher, Spoiler, Lycan exp'ini bandın alt ucuna çek (yaklaşık 1000–1400). Dusk Orc'u 6478'den bandın medyanına (yaklaşık 3000–3500) indir. Genel çözüm olarak orijinal exp × ortak bir katsayı (ör. 0,18) da kullanılabilir; ama bu tüm 62 canavarı değiştirir, ces kararı.

### 3.3 Düşük hp'li ama yüksek hasarlı orc grubu
Dusk Orc (Lv40, hp 617), Lard Orc (Lv50, 1058), Uruk Hai (Lv60, 1669), Uruk Blade (Lv70, 2478), Uruk Tron (Lv80, 3513). Komşu medyanından ×0,17–0,34 (Dusk Orc ×0,25, Lard Orc ×0,24, Uruk Hai ×0,34, Uruk Blade ×0,17, Uruk Tron ×0,28). Bu hp değerleri **orijinal**. Uruk Hai/Uruk Blade/Lard Orc'ta hasar ayrıca ×1,6 yükseltilmiş; sonuç hasar/hp oranı 0,76–1,02, tablodaki en yüksek (62 canavarın medyanı 0,098, üst çeyrek 0,21, en yüksek 1,02). Yani hızlı ölen ama çok vuran bir grup.
- Lv40 Dusk Orc (hp 617), Lv30–33 canavarlardan (Rotten Eyes 1375, undying 1878) daha az dayanıklı.
- **Öneri:** hp'ye dokunma (orijinal tasarım); ama hasar ×1,6 artışını gözden geçir. Oyuncu hasar kapasitesi bilinmediği için kesin değer vermiyorum.

### 3.4 Aşırı dayanıklı mini-boss benzeri canavarlar
| canavar | seviye | hp | not |
|---|---|---|---|
| Deruvish | 60 | 18890 | komşuya ×4,0; z = +2,0; hasar 800 (hasar/hp 0,04). Myko'da hp yükseltilip hasar düşürülmüş |
| Troll Warrior | 80 | 38190 | ×5,0; z = +1,7. hp orijinal |
| Raven Harpy | 80 | 31496 | ×4,1. hp orijinalden +4000 |
| Troll / Apostle / Harpy | 70 | 21556 / 21556 / 21167 | ×2,7–2,8 (orijinal hp; Harpy +5000) |
| Hell hound | 52 | 10000 | hasar 380 (hasar/hp 0,04); orijinal hp, 45 sn doğuş |
- **Öneri:** Deruvish'i orijinale dön (hp 10890, hasar 1045) ya da bilerek tank olarak bırak. Troll Warrior ve Raven Harpy orijinal değerlere yakın; dokunma. Üst seviye golemler (Stone Golem 21497, Giant golem 29392) kendi bandlarında tutarlı.

### 3.5 Diğerleri (düşük öncelik)
- **Megarodon (Lv42): hasar 1013**, komşu medyanın ×4,2'si. Değer orijinal; tek yer, toplam 2 adet olduğu için mini-boss gibi duruyor. Kasıtlıysa bırak.
- **Centaur (Lv90): savunma 378** (orijinal 1134), Lv51 bandının (405) bile altında. Bu bir hata ya da bilinçli zayıflatma olabilir. Önerilen: bandın medyanı ≈ 576.
- **Tersine sıralama:** Lv30–55 canavarlarının birçoğu Lv60–80 orc canavarlarından (Uruk Hai, Uruk Blade, Uruk Tron, Lard Orc, Skeleton) daha dayanıklı. Sebebi 3.1 ve 3.3.
- **Altın** düzgün (sapma küçük). Tek istisna Skeleton (110, Lv80 için düşük).
- Saldırı gecikmesi (1200/1500/1800/2000/2500 ms) ve doğuş süresi (25/30/45/60 sn) küçük, tutarlı sabit kümelerde. Sorun yok.

## 4. Önerilen değişiklik listesi (uygulamayı master/ces yapar)

| öncelik | sid | canavar | alan | şimdi | öneri |
|---|---|---|---|---|---|
| 1 | 1150 | Skeleton | seviye ve tüm statlar | Lv80 / hp 1000 | A) orijinal Lv31 değerleri **ya da** B) Lv80 bandı medyanları (bölüm 3.1) |
| 2 | 1671 | Orc Watcher | exp | 328 | ≈ 1000–1400 |
| 2 | 353 | Spoiler | exp | 500 | ≈ 1000–1400 |
| 2 | 551 | Lycan | exp | 568 | ≈ 1300 |
| 2 | 1672 | Dusk Orc | exp | 6478 | ≈ 3000–3500 |
| 3 | 2151 | Deruvish | hp ve hasar | 18890 / 800 | orijinal 10890 / 1045 ya da bilerek bırak |
| 3 | 2652 | Centaur | savunma | 378 | ≈ 576 |
| 3 | 1693, 1692, 1673, 1362, 3651, 2952 | Uruk Blade, Uruk Hai, Lard Orc, Haunga Warrior, burning skeleton, Bugbear | hasar | orijinal ×1,6 | ×1,6 kararını gözden geçir (oyuncu gücüne bağlı) |
| 4 | tümü | 62 canavar | exp | orijinal × 0,075–0,727 | tek katsayıya (ör. 0,18) çekmek isteniyorsa ces kararı |

## 5. Dokunulmaması önerilen / emin olmadığım

- Orc grubunun düşük hp'si (orijinal tasarım), Hell hound, Troll Warrior hp'si (orijinal).
- Golemler, Raven Harpy, Harpy: Myko'nun bilinçli ayarı gibi tutarlı.
- Megarodon hasarı: orijinal; mini-boss niyeti olabilir.
- Oyuncu gücü bilinmiyor; bu yüzden Uruk grubunun hasar/hp oranının gerçekten sorun olup olmadığı test oyuncusuyla görülmeli.

## 6. Güncelleme (Görev C): eklenen canavarlar ve exp katsayısı

Yöntem ve kaynak: Myko veritabanındaki `K_MONSTER` ve `LEVEL_UP` tabloları **yalnız okuma (`SELECT`)** ile okundu, hiçbir şey yazılmadı; orijinal değerler `cozulen.json`'dan. `canavarlar.csv`'deki 62 canavarın değerleri o dosyadaki anlık görüntüden (DB'den yeniden okunmadı; Skeleton'u master'ın bildirdiği orijinal değerlere göre aldım). Hiçbir değer değiştirilmedi.

### 6.0 Skeleton (1150)
Master orijinale döndürdü (Lv31 / hp 1193 / savunma 210 / hasar 89 / exp 9468). Bölüm 3.1 ve bölüm 4'teki 1. öncelik satırı artık geçerli değil.

### 6.1 Eklenen (ve ekleneceklerin) Myko `K_MONSTER` değerleri, orijinaliyle

| sid | ad | seviye | hp (Myko / orij.) | savunma | hasar | exp Myko | exp orijinal | exp oranı | durum |
|---|---|---|---|---|---|---|---|---|---|
| 554 | Dark eyes | 31 | 1193 / 1193 | 210 / 210 | 89 / 89 | 1382 | 9468 | 0,146 | tutarlı |
| 955 | Stinger | 34 | 1286 / 1286 | 346 / 346 | 111 / 111 | 2187 | 11862 | 0,184 | tutarlı |
| 1689 | Orc hunter | 40 | 617 / 617 | 288 / 288 | 190 / 190 | 2124 | 8910 | 0,238 | tutarlı (hp düşük: orijinal) |
| 1055 | Hyde | 45 | 17790 / 17790 | 648 / 648 | **500 / 579** | **84942** | 24093 | **3,53** | **exp uyumsuz**, hasar −%14 |
| 956 | Antares | 50 | 23010 / 23010 | 720 / 720 | 650 / 650 | **84124** | 31707 | **2,65** | **exp uyumsuz** |
| 552 | Loup-garou | 27 | 879 / 879 | 155 / 155 | 51 / 51 | 1312 | 6813 | 0,193 | tutarlı |
| 1450 | attila | 85 | 89650 / 89650 | 1224 / 1224 | **2357 / 2129** | 82491 | 129231 | 0,638 | hasar +%10,7; Lv85'e LEVEL_UP satırı yok |
| 3151 | scouting soldier | 30 | 3000 / 3000 | 500 / 500 | 100 / 100 | **10208** | **0** | – | **exp uyumsuz**; `byActType` 1 (orijinal 7) |

- Skeleton'daki türden bir uyumsuzluk (seviye ile statların birbirini tutmaması) bu sekizinde **yok**: hp, savunma, hasar orijinalle aynı veya yakın. Uyumsuzluk **yalnız exp'te**: 956, 1055 (ve 3151).
- Myko'da `byActType` bütün canavarlarda 1 (orijinalde 5 veya 7).
- El Morad eşleri de Myko `K_MONSTER`'da var (502, 504, 905, 906, 1005, 1400, 3101; aynı statlar), yani El Morad'a eklemek için yeni satır gerekmiyor. Ama aynı canavarın exp'i farklı: **906 Antares 13 125, 1005 Hyde 13 125** (Luferson'daki 956 ve 1055'in yaklaşık 6,4 katı az); 1400 attila hp 79650 / savunma 1285 / hasar 2074 / exp 61250 (Luferson'daki 1450'den farklı).

### 6.2 Bir öldürme seviyenin yüzde kaçını verir? (Myko `LEVEL_UP`'a göre)

| canavar | seviye | Myko exp | bir öldürme | karşılaştırma |
|---|---|---|---|---|
| Hyde (1055) | 45 | 84942 | **%11,6** | Lv36–45 medyanı %0,90; **yaklaşık 13 kat** |
| Antares (956) | 50 | 84124 | **%3,93** | Lv46–50 medyanı %0,27; **yaklaşık 14 kat** |
| scouting soldier (3151) | 30 | 10208 | **%19,7** (yaklaşık 5 öldürme) | Lv24–35 medyanı %3,3 (yaklaşık 30 öldürme); hp 3000, hasar 100, `byActType` 1 |
| Antares El Morad (906) | 50 | 13125 | %0,61 | medyanın yaklaşık 2,2 katı |
| Hyde El Morad (1005) | 45 | 13125 | %1,80 | medyanın yaklaşık 2 katı |

Yani El Morad'daki değerler "orta güçte mini-boss ödülü" gibi görünüyor; Luferson'dakiler çok yüksek. 3151 eklenirse **Lv30'da bir exp çiftliği** olur (5 canavar, 300 sn doğuş).

### 6.3 Myko `LEVEL_UP` tablosu (exp katsayısının dayanağı)
- **Lv 11–50: Myko = orijinal × 0,141 (40 seviyede tam, ±0,0006).** Lv1–10: 0,120 → 0,140 kademeli. Bu, exp için tek ve doğru katsayının 0,141 olduğunu gösteriyor (sunucu zaten bu oranla ayarlı).
- **Lv 51 sonrası düzensiz:** Lv51–53 ≈ 0,18–0,20 (Lv53 Lv52'den **düşük**: 3 598 558 < 3 714 597); Lv54–72 orijinalin 0,76–3,34 katı (Lv61 en düşük, çoğu 1–3,3); **Lv73–83'ün hepsi 180 742 047** (Lv72: 1 305 247 349; yani Lv72'den 73'e geçmek 7 kat az exp ister). Orijinal tablo Lv80'de bitiyor, Myko'da Lv83'e kadar.
- Etkisi: Lv54–72 canavarlarında "seviye için gereken öldürme" medyan **13 430** (orijinalde 2 579); ör. Uruk Blade Lv70 için yaklaşık 177 000 öldürme. Lv85'te `LEVEL_UP` satırı yok.
- Bölge bantlarına göre medyan öldürme sayısı (Myko / orijinal): Lv24–35 30 / 43, Lv36–45 111 / 155, Lv46–50 368 / 506, Lv54–72 13 430 / 2 579.

### 6.4 Katsayı önerisi

| seçenek | katsayı | ne sağlar | not |
|---|---|---|---|
| **A: orijinal ilerleme** | **0,141** (exp = orijinal exp × 0,141, Lv ≤ 50) | "seviye başına öldürme" orijinalle aynı; sunucunun kendi LEVEL_UP oranıyla tutarlı | Lv ≤ 50'deki 38 canavar (eklenen 6 dahil) bugün önerilenin **medyan 1,41 katını** veriyor; A uygulanırsa çoğu canavar yaklaşık %30 az exp verir, yani seviye atlamak yavaşlar. 29/38 canavarda fark ±%20–25'ten büyük (0,53 – 25 kat) |
| B: mevcut hızı koru | 0,20 | dağınıklığı giderir, hızı değiştirmez (Lv ≤ 50 canavarlarının mevcut oranı medyanı 0,141 × 1,41 ≈ 0,199) | Boss/ayrık değerler yine bu katsayıya çekilir |

- **Lv 50 üstü için tek katsayı vermiyorum:** `LEVEL_UP` düzensiz olduğundan (bölüm 6.3) bir oran seçmek anlamsız. Önce `LEVEL_UP`'ın düzeltilmesi gerekir (ces/master kararı); sonra canavar exp'i = orijinal exp × (Myko `LEVEL_UP[seviye]` / orijinal `LEVEL_UP[seviye]`) formülüyle bulunur.
- **Boss'lar için** (A'ya göre): 956 Antares ≈ 4471, 1055 Hyde ≈ 3397 (bugün 84124 / 84942); 1450 attila için Lv85 `LEVEL_UP` olmadığından orijinal exp × 0,141 ≈ 18 222 yalnız fikir verir. Alternatif olarak El Morad değerlerine (13 125) çekmek de tutarlı bir "mini-boss" ödülü olur.
- **3151 için:** exp 10208 orijinal değerden (0) sapıyor; eklemeden önce exp'in 0 ya da A'ya göre düşük bir değere çekilmesi gerekir.
- Tam liste: **`exp-katsayi-onerisi.csv`** (69 satır = 62 canavar + eklenen 7; sütunlar: orijinal exp, mevcut exp, mevcut oran, iki seviye yüzdesi, A'ya göre önerilen exp ve mevcut/önerilen oranı; önerilen sütunu yalnız Lv ≤ 50'de dolu).

### 6.5 Master'dan istenen karar/iş
1. 956 ve 1055'in exp'i (84 124 / 84 942) kasıtlı bir boss ödülü mü? El Morad eşleri 13 125.
2. 3151 / 3101 (exp 10 208 ve `byActType` 1) eklenmeden önce exp'in düşürülmesi.
3. Katsayı seçimi (A 0,141 mi, B 0,20 mi) ve `LEVEL_UP` Lv51+ düzensizliğinin kasıtlı olup olmadığı (özellikle Lv73–83'ün aynı değeri ve Lv53 < Lv52).
