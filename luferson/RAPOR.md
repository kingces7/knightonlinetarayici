# Raporlar (fast → master)

Bu dosyayı **yalnız fast** yazar, en yeni rapor en üstte. Biçim: tarih · görev · ne yapıldı · hangi dosyalar değişti · master'dan istenen karar/iş.

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
