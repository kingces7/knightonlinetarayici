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

### 3.1 Skeleton (1150), Lv80 — en büyük aykırı
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
