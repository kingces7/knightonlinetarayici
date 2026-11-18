# Raporlar (fast → master)

Bu dosyayı **yalnız fast** yazar, en yeni rapor en üstte. Biçim: tarih · görev · ne yapıldı · hangi dosyalar değişti · master'dan istenen karar/iş.

## 2026-11-18 · Görev 5 (D): yarım kalanlar (tamamlandı)

**Yapılan**:
- `npc-listesi.csv`: 4 NPC eklendi (konumlar sunucu `npc.json`'dan): 13001 [Accessory Merchant]Hera 421,1644; 22301 [Scrolls]Charon 428,1651; 23400 Lilith [Scrolls] 435,1644; 29990 [Item Master] Aurora 447,1630. Satır sırası sid'e göre korundu. `npc.json` ile otomatik karşılaştırma: artık farksız (tek istisna aşağıdaki 551).
- `npc-magaza-eslesme.csv`: üç "EKSIK" satırı "eklendi" yapıldı (13001 → 203002, 22301 → 254000, 23400 → 281000) ve 29990 Aurora (999000) satırı eklendi. Lilith, Moradon'daki Amon ile aynı sid ve satış grubu.
- **551 canavar olarak etiketlendi** (eski → yeni): `Safety Zone Gate1` → `Lycan [canavar]` (3 satır: 600,1561 / 578,1602 / 532,1502). 552 `npc-listesi.csv`'de zaten yoktu.

**Dokunmadığım**: `canavarlar-orijinal.csv` ve `elmorad-canavarlar-orijinal.csv`'deki `ad` sütunu 551/552'ye ve El Morad'da 502, 504, 505, 1100–1303 ("Gate"), 2101–2202 ("Lever"), 3101 gibi sid'lere hâlâ yanlış tablodan (K_NPC) ad veriyor; bunlar master'ın ürettiği dosyalar. Gerçek adlar analiz dosyalarında yazılı.

**Dosyalar değişen**: `luferson/npc-listesi.csv`, `luferson/npc-magaza-eslesme.csv`, `luferson/RAPOR.md`.

---

## 2026-11-18 · Görev 4 (C): eklenen canavarların denge kontrolü (tamamlandı)

**Yapılan**: `denge-onerileri.md`'ye bölüm 6 eklendi, `exp-katsayi-onerisi.csv` yazıldı (69 canavar). Hiçbir değer değiştirilmedi.

**Bilgi**: Myko değerlerini görmek için Myko veritabanından **yalnız okuma** yaptım: `K_MONSTER` (15 satır: 502, 504, 552, 554, 905, 906, 955, 956, 1005, 1055, 1400, 1450, 1689, 3101, 3151) ve `LEVEL_UP` tabloları, `SELECT` ile (`ApplicationIntent=ReadOnly`; betikler luferson/ dışında, geçici klasörde). Yazma, sunucuya dokunma yok. Bunu istemiyorsanız söyleyin, bir daha yapmam; sonuçlar bölüm 6'da.

**Bulgular**:
1. **Statlar tutarlı, exp değil.** 554, 955, 1689, 552: hp/savunma/hasar orijinalle aynı, exp makul. Skeleton'daki gibi seviye–stat uyumsuzluğu yok. Uyumsuz olanlar **exp'te**: **956 Antares exp 84124** (orijinal 31707, ×2,65; bir öldürme Lv50'de seviyenin %3,9'u) ve **1055 Hyde exp 84942** (orijinal 24093, ×3,53; Lv45'te seviyenin **%11,6'sı**; ayrıca hasar 500, orijinal 579). Sıradan canavarlar bu bantlarda %0,27–0,9 verir (yaklaşık 13–14 kat). El Morad'daki aynı canavarlar (906, 1005) 13125 exp; Luferson'dakiler 6,4 kat fazla.
2. **3151/3101 scouting soldier**: Myko exp **10208** (orijinal 0), `byActType` 1 (orijinal 7). Lv30'da bir öldürme seviyenin **%19,7'si** (5 canavar, 300 sn doğuş = exp çiftliği). Eklenmeden önce exp düşürülmeli.
3. **1450 attila**: hasar 2357 (orijinal 2129), exp 82491 (orijinal 129231); Lv85 için `LEVEL_UP` satırı yok. El Morad'daki 1400 farklı (hp 79650, exp 61250).
4. **Myko `LEVEL_UP` = orijinal × 0,141, Lv 11–50'de tam (40 seviye)**; Lv1–10 0,12→0,14. **Lv51'den sonra düzensiz:** Lv53 < Lv52; Lv54–72 orijinalin 0,76–3,3 katı; **Lv73–83'ün hepsi 180 742 047** (Lv72: 1,3 milyar). Sonuç: Lv54–72 canavarlarında medyan "seviye için öldürme" 13 430 (orijinalde 2 579); Uruk Blade Lv70 için yaklaşık 177 000.
5. **Exp katsayısı önerisi:** A) **0,141** (orijinal ilerleme; LEVEL_UP ile tutarlı; Lv ≤ 50'deki 38 canavar bugün ona göre medyan 1,41× fazla veriyor, uygulanırsa seviye yaklaşık %30 yavaşlar); B) 0,20 (mevcut hızı koruyup dağınıklığı giderir). **Lv 50 üstü için tek katsayı önermiyorum**: önce `LEVEL_UP` düzeltilmeli, sonra exp = orijinal exp × (Myko LEVEL_UP / orijinal LEVEL_UP).

**Master'dan istenen karar/iş**: (a) 956/1055 exp'i kasıtlı mı (El Morad'da 13125); (b) 3151/3101 exp'i eklemeden önce düşürülmeli; (c) katsayı A mı B mi; (d) `LEVEL_UP` Lv51+ düzensizliği (özellikle Lv73–83 aynı değer ve Lv53 < Lv52) kasıtlı mı.

**Düzelttiğim (kendi hatam)**: Önceki analizde 3151 için "exp 0, saldırgan" yazmıştım (orijinal değer); Myko satırı exp 10208 / `byActType` 1. `canavarlar-orijinal-analiz.md` ve `elmorad-orijinal-analiz.md` Myko değerleriyle düzeltildi. Ayrıca El Morad analizindeki iki açık soru çözüldü: (1) 502, 504, 905, 906, 1005, 1400, 1689, 3101'in hepsinin Myko `K_MONSTER` satırı **var**; (2) orijinal `K_NPCPOS` bölge 2 satırlarında hepsinin `ActType` = 1 (canavar); bölge 1 için 551, 552, 554, 955, 956, 1055, 1450, 1689, 3151 de 1.

**Dosyalar değişen**: `luferson/denge-onerileri.md`, `luferson/exp-katsayi-onerisi.csv` (yeni), `luferson/canavarlar-orijinal-analiz.md`, `luferson/elmorad-orijinal-analiz.md`, `luferson/RAPOR.md`.

---

## 2026-11-18 · Görev 3 (B): arazi dokusu kaynak incelemesi (tamamlandı)

**Yapılan**: `OPENKO SRC - V1299/Client/N3Base/N3Terrain.cpp`, `N3TerrainPatch.cpp`, `N3TerrainDef.h` (ve `GameDef.h`, `LightMgr.cpp`, `N3Light.cpp`) okundu; `arazi-doku-notlari.md` yazıldı. Gerçek dosyalarla (karus2004.gtd/.tlt/.glo, Terrain_Base.bmp) çapraz doğrulandı (yalnız okuma).

**Cevaplar (özet)**:
1. **`.gtd` karo verisi**: `MAPDATA` 8 bayt = float yükseklik + bit alanı: bit 0 tam_karo, 1–5 yön1, 6–10 yön2, 11–20 doku1, 21–30 doku2 (1023 = yok). karus2004'te tam_karo **hepsinde 1**; doku1 yalnız 1025 kenar köşede yok; doku2 yaklaşık %28'de var; yön yalnız 0–5 (6 ve 7 toplam 4 köşede).
2. **`.tlt` = ışık haritası (siyah, yarı saydam gölge katmanı)**, renk haritası değil: sürüm + 64×64 yama adres tablosu (x hızlı); karus2004'te 4096 yamanın 1527'sinde var; ilk doku 32×32 A4R4G4B4, alfa 0–85. Oyuncu etrafındaki 3×3 yama için yüklenir, yakın karoların üstüne alfa karışımıyla çizilir. **`.tct` = renk haritası** (16×16 parça, 128×128'lik). **`.glo` zemin dokusuyla ilgisiz**: bölge ışık nesneleri (`CN3Light`, 168 bayt/kayıt); karus2004.glo 9 ışık, karus_start.glo 15 (old_karus.glo ile bayt bayt aynı); Zones.csv bölge 10 `karus_start.glo` gösteriyor.
3. **Birleştirme**: yakın yamalar (yaklaşık 100 m içi, seviye 1) karo başına: iki doku geçerliyse doku1 + doku2 (**D3DTOP_ADD**) × diffuse; yalnız doku1 ise doku1 × diffuse; doku1 geçersiz (≥ NumTileTex) **veya tam_karo = 0** ise renk haritası × **Terrain_Base.bmp** × diffuse. Uzak yamalar (seviye 2–3) yalnız renk haritası × diffuse (Terrain_Base yok). Karus2004'te yakında hiçbir karo renk haritası yoluna düşmüyor.
4. **Yön UV tablosu** kaynaktan çıkarıldı (8 yön × 4 köşe, köşe eşlemesi A=[2], B=[0], C=[1], D=[3]) ve client shader'ındaki `YU/YV` ile **birebir aynı** doğrulandı.

**Client'ta kaynakta olup görmediklerim**: `.tlt` gölge katmanı (yok); mesafeye göre karo/renk haritası ayrımı (shader her yerde karo dokusu örnekliyor); Terrain_Base çarpımı (yalnız renk haritası); köşegen yönünün satranç alternatifliği (bakmadım).

**Master'dan istenen karar/iş**: `.tlt` gölge katmanı için dönüştürücü yazılsın mı (yaklaşık 1527 yama)? Uzak zeminde renk haritasına geçiş istenir mi?

**Dosyalar değişen**: `luferson/arazi-doku-notlari.md` (yeni), `luferson/doku-denetimi.csv` (`.tlt` ve `.glo` satırlarının notları yeni bilgiyle güncellendi), `luferson/RAPOR.md`.

---

## 2026-11-18 · Görev 2: Luferson analizi güncellendi (tamamlandı)

**Yapılan**: `canavarlar-orijinal-analiz.md` yenilenen CSV'ye göre baştan yazıldı (eski/yeni karşılaştırma tablosu dahil). Koordinatlara dokunulmadı.

**Değişenler**: aynı 235 → **254**, koordinat farklı 42 → 42, Myko'da yok 77 → **58** (9 canavar + 49 NPC). Fark = eklenen 5 canavarın 19 yerleşimi. Kalan gerçek eksik canavar yalnız 3 sid: 552 Loup-garou Lv27, 3151 scouting soldier Lv30, 1450 attila Lv85.

**Öneri sırası**: 1) 552 (düşük risk; 551'le aynı kural çalışıyor). 2) 1450 attila ayrı notla (can 89650 = Luferson'daki en dayanıklının 2,3–3 katı, exp orijinalde 129231, doğuş 32000 sn) ces onayı + Myko K_MONSTER'daki exp ve drop kontrolünden sonra. 3) 3151 scouting soldier: `byActType` 7, açık kaynak 1299 kodunda "saldırgan" dalına düşüyor, exp 0, Recon NPC'sinin 10 birim yanında (El Morad'da 3101 + Recon 11051 aynı çift). Recon eklenmeyecekse eklenmesin. NPC grupları ces kararı.

**Dikkat**: `karus2004/canavar.json` ve `npc.json` dışa aktarması eklenen 5 canavardan önce üretilmiş (mtime eski); yenilenmesi gerekir. Karşılaştırmayı etkilemedi.

**Dosyalar değişen**: `luferson/canavarlar-orijinal-analiz.md`, `luferson/RAPOR.md`.

---

## 2026-11-18 · Görev 1 (A): El Morad analizi (tamamlandı)

**Yapılan**: `elmorad-orijinal-analiz.md` (Luferson analiziyle aynı biçim). Myko tarafı için `elmo2004/canavar.json` ve `npc.json` kullanıldı; seviye/can `cozulen.json`'dan. Koordinatlara dokunulmadı.

**Bulgular**:
- 217 aynı (206 canavar + 11 NPC), 61 koordinat farklı (40 + 21), 77 Myko'da yok (28 canavar + 49 NPC, 19 NPC sid).
- Gerçek eksik canavar **8 sid / 26 satır**: 502 Loup-garou Lv27, 504 Dark eyes Lv31, 905 Stinger Lv34, 1689 Orc hunter Lv40, 1005 Hyde Lv45, 906 Antares Lv50, 1400 attila Lv85, 3101 scouting soldier Lv30.
- **303 Spoiler eksik değil:** Myko aynı yerlere Luferson'un 353 Spoiler'ını koymuş (Myko'da olup orijinalde olmayan tek canavar sid'i).
- **CSV'deki bazı adlar yanlış tablodan** (K_NPC): 502 "Garind[Inn]", 504 "verofewen[Arms]", 505 "Nand[Sundries]", 3101 "barricade", 1100–1303 "Gate", 2101–2202 "Lever", 501 "Serendil". Gerçek adlar K_MONSTER'dan (Loup-garou, Dark eyes, Dire wolf, scouting soldier, Skeleton/Kongau/Haunga, Deruvish/Apostle/Harpy/Raven Harpy, Lycan). Analizde gerçek adı yazdım.
- 100 birimi aşan 17 koordinat farkı taşınma değil, **Myko'da o yerin hiç olmaması** (Lard Orc orijinal 7 yer/29 adet, Myko 1/5; Dusk Orc 5/19 → 2/10; Giant golem 3/10 → 1/5; Flame Rock 2/10 → 1/5; Nand/Dire wolf 2/10 → 1/5). Myko'da fazla olanlar: Uruk Blade 3/11 → 6/30, Stone golem 4/18 → 6/30.
- Antares/Hyde/attila doğuş süresi El Morad'da 14400 sn, Luferson'da 32000 sn (orijinal veriden).

**Master'dan istenen karar/iş**: (1) El Morad sid'lerinin (502, 504, 905, 906, 1005, 1400, 3101) Myko `K_MONSTER` satırı var mı; (2) 502/3101'in El Morad yerleşiminde `ActType` < 100 mü; (3) Lard Orc/Dusk Orc yerlerinin Myko'da bilerek azaltılıp azaltılmadığı.

**Dosyalar değişen**: `luferson/elmorad-orijinal-analiz.md` (yeni), `luferson/RAPOR.md`.

---

## 2026-11-18 · fast hazır, Görev 1'e başlıyorum
Yeni görev listesi (GOREVLER.md "YENİ GÖREV LİSTESİ": A El Morad, B arazi dokusu, C denge, D yarım kalanlar) okundu. Mesajdaki sıra: El Morad analizi → Luferson analizi güncelle → arazi dokusu notları → denge → yarım kalanlar. Aynı işlerin harf (GOREVLER.md) ve numara (mesaj) eşleşmesi: 1=A, 2=Luferson güncelleme, 3=B, 4=C, 5=D.

---

## 2026-11-18 · Görev 1 / denge önerileri (tamamlandı)

**Yapılan**: `canavarlar.csv`'deki 62 canavarın seviye–hp–savunma–hasar–exp–altın eğrisi incelendi, aykırılar `denge-onerileri.md` olarak yazıldı. **`canavarlar.csv`'de hiçbir değer değiştirilmedi.** Orijinal karşılaştırması için `Masaustu DB incele/cozulen.json` `K_MONSTER` salt okunur okundu.

**Öne çıkanlar**:
1. **Skeleton (sid 1150) Lv80 ama hp 1000, hasar 300, exp 2625, altın 110**: eğrideki en uç nokta (hp z = −3,5). Orijinali Lv31 / hp 1193 / hasar 89; konumu Lv33–45 iskelet bölgesinde. Büyük ihtimalle seviyesi yükseltilirken statları yükseltilmemiş. İki seçenek önerdim (orijinale dön ya da Lv80 bandı değerleri).
2. **exp oranı tutarsız**: Myko exp'i orijinalin yaklaşık %18'i (medyan 0,176), ama oran 0,075–0,727 arasında; aynı orijinal exp'e sahip canavarlar Myko'da 4× farklı (KOBOLD 1356 / Orc Watcher 328). En uç: Orc Watcher, Spoiler, Lycan (çok düşük), Dusk Orc (exp/hp 10,5).
3. **Hasar ×1,6** tam altı canavarda (Bugbear, Lard Orc, burning skeleton, Haunga Warrior, Uruk Hai, Uruk Blade) uygulanmış; orc grubu düşük hp (orijinal) ile birleşince hasar/hp oranı tablonun en yükseği (0,76–1,02; medyan 0,098).
4. Deruvish (hp 18890, hasar 800), Troll Warrior (38190), Raven Harpy (31496) komşularına göre 4–5× dayanıklı; Centaur savunması 378 (orijinal 1134).

**Sınır / master'dan istenen karar**: oyuncu gücü modelim yok, "çok zor/kolay" yargısı vermedim; yalnız komşulara göre aykırılığı gösterdim. Skeleton için A/B seçimi (bölüm 3.1), exp'i tek katsayıya çekmek isteyip istemediğin ve hasar ×1,6'nın kasıtlı olup olmadığı senin/ces'in kararı.

**Dosyalar değişen**: `luferson/denge-onerileri.md` (yeni), `luferson/RAPOR.md`.

---

## 2026-11-18 · Görev 4: doku denetimi (tamamlandı)

**Yapılan**: `istemci-dosyalari.csv` (43 satır) ve `Zones.csv` satır 10 (16 dosya) gerçek `KnightEmpire/` dosyalarıyla, ayrıca `donusturulmus/web/harita/karus2004/` çıktısıyla karşılaştırıldı. Sonuç `doku-denetimi.csv` (38 satır: tamam 20, uyarı 5, bilgi 8, yetim 3, ilgisiz 2). Betikler geçici klasörde, yalnız okuma yaptı; luferson/ dışına bir şey yazılmadı.

**Sağlam çıkanlar**:
- 43 dosyanın hepsi var ve boyutları CSV ile birebir aynı. Zones.csv satır 10'daki 16 dosyanın hiçbiri eksik değil.
- Boyutlar birbirini tutuyor: `.gtd` 513×513 köşe = 2048 m; `.tct` = 256 parça × 43704 bayt = `renk.bin` 2048×2048; `arazi.bin` = 513² × 10 bayt; `karolar.bin` = 275 karo × 128² × 4; tüm doku indeksleri 0–274 aralığında (275 karoyu aşan yok); yükseklikte NaN yok.
- `nesneler.glb`: 264 malzeme / 264 doku / 264 gömülü resim, hepsi kullanılıyor, boş resim ve kırık indeks yok (32,4 MB; elmo2004 ile aynı ölçek). `su/` 32 kostik kare + dalga, `anim/` 61 kare, gökyüzünün 10 dokusu KnightEmpire'da var.

**Dikkat edilecekler**:
1. **`karus2004.tlt` doğrulanamadı**: formatı çözülmemiş, dönüşümde kullanılmıyor. Boyutu makul. `.opdext/.opdsub/.evtsub/.flag/.ens/.gev/.NaviMesh` da dönüştürülmüyor (bilgi satırları).
2. **Zones.csv bölge 10 `karus_start.glo` gösteriyor**, `karus2004.glo` hiçbir satırda yok (30/50/60 da aynı). Orijinal ayar olabilir, `.glo` anlamı çözülmedi.
3. **Yetim dosyalar**: `Zones/karus 2004.dxt` (adında boşluk, 53 bayt farklı, Zones.csv'de yok), `karus2004.gfo/.glo/.gmd`, `old_karus.*` (12 dosya). `karus_start.*` ve `eslant_karus_11` başka bölgelere ait, Luferson ile ilgisiz.
4. **`npc-listesi.csv` ile `npc.json` farklı** (npc.json sunucudan, bölge 1): `npc.json`'da `npc-listesi.csv`'de olmayan 4 NPC var: 13001 [Accessory Merchant]Hera (421:1644, satış 203002), 22301 [Scrolls]Charon (428:1651, 254000), 23400 Lilith [Scrolls] (435:1644, 281000), 29990 [Item Master] Aurora (447:1630, 999000). **Bu, Görev 3 notundaki "Luferson'da Accessory Merchant ve Scrolls NPC'si yok" bilgisiyle çelişiyor.** Hangisi güncel master bakmalı: `npc.json` yeni mi üretildi (araclar/sunucu/npc-disa-aktar.ps1 sonrası eklenenler mi), yoksa `npc-listesi.csv` eski mi? (Ben `npc-magaza-eslesme.csv` ve `npc-listesi.csv`'ye dokunmadım.)
5. **sid 551 sunucuda canavar**: `canavar.json`'da 551 için 532:1502, 578:1602, 600:1561 (adet 5) var, `npc.json`'da yok; `npc-listesi.csv` ise bu 3 konumu "Safety Zone Gate1" NPC'si diye yazıyor. Bu, Görev 2'deki sid 551 çakışması tahminini destekliyor (551 = Lycan). `npc-listesi.csv`'deki üç 551 satırı yanlış etiketli görünüyor; düzeltmeyi yapmadım, karar senin.
6. `canavar.json` UTF-8 BOM ile başlıyor (tarayıcıda `fetch().json()` sorun çıkarmaz, Node'da elle `JSON.parse` ederken BOM soyulmalı).

**Luferson dışı iş gerekir mi**: Hayır, zorunlu bir düzeltme çıkmadı. Yalnız 4. ve 5. maddelerde karar/kontrol istiyorum.

**Dosyalar değişen**: `luferson/doku-denetimi.csv` (yeni), `luferson/RAPOR.md`.

---

## 2026-11-18 · Görev 2: orijinal canavar analizi (tamamlandı)

**Yapılan**: `canavarlar-orijinal.csv` (354 satır) incelendi, `canavarlar-orijinal-analiz.md` yazıldı. Koordinatlara ve diğer CSV'lere dokunulmadı; sunucuya/veritabanına yazılmadı. Betikler luferson/ dışında, geçici klasörde çalıştı. Seviye ve can bilgisi için `Masaustu DB incele/cozulen*.json` salt okunur okundu (iki dökümde değerler aynı).

**Bulgular**:
- (a) "Myko'da yok" 77 satır = 27 sid; bunun **49 satırı NPC** (19 sid), gerçek eksik canavar **28 satır / 8 sid** (Lv27–85): 552, 554, 955, 1689, 1055, 956, 1450, 3151.
- (b) "Koordinat farklı" 42 satır: 20'si NPC (hepsi ≤ 21 birim fark), 22'si canavar; 15'i ≤ 40 birim. 100'ün üstündeki 4 fark (Stegodon 267, Uruk Tron 233, Flame Rock 205, Dire wolf 111) taşınma değil, orijinalde fazladan yer olmasından (Dire wolf'ta tersi) kaynaklanıyor görünüyor; slot sayıları analizde.
- (c) Eksik 27 sid'in 7'si `mob-listesi.csv`'de (1.mob) yok: 552, 554, 955, 1450, 1689, 24414, 26041. Client bunları yüklemiyor olabilir (denenmedi).
- (d) Öneri listesi analizde. Özet: önce 956 Antares ve 1055 Hyde (client hazır), sonra 554/955/1689 (client kontrolüyle), 1450 attila için ces onayı, NPC grupları ces kararı.

**Dikkat (master'dan istenen karar/iş)**:
1. **sid 551/552 çakışması:** `K_NPC`'de "Safety Zone Gate1/2" (Lv60, 70000 can), `K_MONSTER`'da 551 = Lycan, 552 = Loup-garou. `canavarlar.csv` 551'i Lycan veriyor. CSV'deki "Safety Zone Gate" adı muhtemelen yanlış tablodan geldi (tahmin). Sunucunun 551/552'yi hangi tablodan yüklediğini kontrol et; `npc-listesi.csv`'deki "Safety Zone Gate1" (551) satırları da aynı karışıklıktan olabilir.
2. Eksik sid'lerin Myko `K_MONSTER`/`K_NPC` tablosunda satırı var mı; yoksa spawn ile birlikte satır da gerekir.
3. `byActType` 7 (scouting soldier, Guard vb.) ve NPC `byType` 111–117 değerlerinin anlamı bende yok.

**Dosyalar değişen**: `luferson/canavarlar-orijinal-analiz.md` (yeni), `luferson/RAPOR.md`.

---

## 2026-11-18 · [ESKİ — geçersiz, Görev 2 raporuyla yer değiştirdi] Görev 2 başlangıç notu

**Talep**: Luferson'a orijinal oyun dosyalarından canavarları ekle (koordinatlar **değiştirme**)

**Çıktı**: `luferson/canavarlar-orijinal.csv`
- Sütunlar: sid, ad, x, z, adet, doğuş_süresi, kaynak_dosya
- Orijinalde olup K_NPCPOS1098'de olmayan canavarları işaretle
- Veritabanına **yazma** (master okuyup sunucuya aktarır)

**Kaynak**: 
- KnightEmpire/Zones/1.mob
- oyun-dosyalari/ sunucu verisi
- Data tabloları

**Bulgu**: 
- Luferson canavar dosyası: `KnightEmpire/Zones/1.mob` (BINARY format - okunması zor)
- oyun-dosyalari/ klasöründe CSV yok (sadece kaynak kod, derleme çıktısı)

**Sorular**:
- Hangi canavarlar Luferson'a eklenecek? (Oyunun özgün canavar listesi mi, yoksa seçili bir liste mi?)
- .mob dosyasını parsing eden bir araç var mı? (araclar/ klasöründe?)
- Yoksa master CSV'yi hazırlayıp versin?

**Status**: Master'ın talimatı bekleniyor

---

## 2026-11-18 · [ESKİ — geçersiz, master haritayı dönüştürdü] Görev 4: Doku Denetimi (SORUN!)

**Talep**: Luferson map'inin texture paketini doğrula

**KRITIK SORUN**:
- **Luferson harita klasörü yok!** donusturulmus/web/harita/ içinde
- Mevcut: 14th_oldmoradon, moradon, moradon_xmas
- Eksik: 10th_luferson_castle (karus2004 haritası)
- İstemci dosyaları liste var (istemci-dosyalari.csv) fakat **gerçek dosyalar yok**

**Zorunlu Luferson dosyaları** (yok):
- Zones/karus2004.gtd (terrain grid)
- Zones/karus2004.opd (object placement)
- Zones/karus2004.tct (texture color)
- Zones/karus2004.tlt (texture light)
- + 11 diğer dosya

**Beklenti**: 
- Master Luferson haritasını donusturulmus/ klasörüne çıkarıp dönüştürmeli
- Veya mevcut Moradon'dan uyarlamalı

**Status**: Master'ın harita dosyaları sağlaması bekleniyor

---

## 2026-11-18 · Görev 3: NPC Mağazaları (tamamlandı)

**Talep**: Luferson NPC'lerin mağaza (satış grubu) içeriğini Moradon'dakiyle birebir aynı yap

**Yapılan**: `luferson/npc-magaza-eslesme.csv` oluşturuldu
- **Eşleştirilen** (5 NPC):
  - [Armor Merchant] Cubense ↔ [Armor Merchant] Hesta (202001)
  - [Weapon] Mori ↔ [Weapon Merchant] Gargameth (201001)
  - [Healing Potions] Shama ↔ [Healing Potion] Karpis (253000)
  - [Sundries] Veron ↔ [Sundries] Zarta (255000)
  - [Great Priest] Murka / [Knight Clerk] Delaga ↔ [Priest] Iris (0 - store yok)
- **Eksik** (Luferson'da yok):
  - [Accessory Merchant] (203002)
  - [Scrolls] Charon (254000)
  - [Scrolls] Amon (281000)

**Dosyalar Değişen**: 
- ✅ `luferson/npc-magaza-eslesme.csv` (yeni)

**Beklenti**: Master bu eşleştirmeye göre server tarafında satış grupları uygulayacak

---

## 2026-11-18 · Görev 1: Yanlışı Geri Al (es'in isteği)
- ✅ `luferson/canavarlar.csv` restore edildi (git checkout)
  - 63 satır (başlık + 62 canavar) ✅ 60'tan fazla kontrol geçti
- ⚠️ `docs/itemlist.csv` ve `docs/luferson-sunucu-entegrasyonu.sql` master tarafından silinecek
  - **Neden oluşturuldu:**
    - `itemlist.csv`: Tüm item'ları toplamak için (2419 item, Item_Ext_*_us.csv + Set_item.csv)
    - `luferson-sunucu-entegrasyonu.sql`: Luferson harita bilgisi + NPC spawn + Portal yapılandırması (SQL template)
  - **Sorun**: SQL scripti `ZONE` ve `SNpc` tablolarına yazıyor; sunucu veritabanında bu tablolar yok (master'ın talimatı)
- ✅ **Bundan sonra**: Yalnız `luferson/` içinde çalış
- **Dosyalar Değişen**: 
  - `luferson/canavarlar.csv` (restore)
  - `luferson/RAPOR.md` (bu rapor)
- **Beklenti**: Silinecek dosyalar master tarafından silinsin
