# Harita dosyaları hata raporu — fast için (2026-11-19)

Hazırlayan: bugger (veri hata tarayıcısı). **Hiçbir dosya, veritabanı kaydı ya da kaynak kod değiştirilmedi.** Yalnız okuma ve bu rapor.

Terimler: **`.smd`** = sunucunun harita dosyası (yükseklik, çarpışma üçgenleri, kapılar). **`.gtd`** = client'ın arazi dosyası (`KnightEmpire\Zones\`). **Çarpışma üçgeni** = sunucunun duvar/zemin için kullandığı 3 köşeli yüzey. **Bölge no** = `ZONE_INFO1098.ZoneNo` (client'ın `Zones` tablosunda anahtar = bölge no × 10; 18, 21-25 ve 63 için tabloda ayrıca ×100 satırları da var).

## 1. Özet

| Kod | Bulgu | Önem | Fast yapabilir mi? |
|---|---|---|---|
| H-1 | `freezone_a` ailesi `.smd` dosyalarında **1586 / 11.319 bozuk çarpışma üçgeni** (NaN ve 1e30 gibi değerler) | ORTA | **Evet** — `smd.ts` filtresi + test |
| H-2 | Sunucu `.smd` dosyalarının çoğu başka haritanın kopyası; **32 bölgenin** `.smd`'si client haritasıyla uyuşmuyor (tabloda 6 clanfight bölgesi, belgelenmiş 29 ve çelişkili 18 dahil) | ORTA / DÜŞÜK | Kısmen — dönüştürücüye eşleşme denetimi; dosyaları düzeltemez |
| H-3 | Client `Zones` tablosunda yolu geçen **4 bölgenin harita dosyaları client klasöründe yok** (65, 67, 88; 109 kısmen) | DÜŞÜK | Hayır (dosya yok) — yalnız işaretleme |
| H-4 | **6 `.gtd` okunamıyor** (yeni başlık biçimi) | DÜŞÜK | **Evet** (format çözme) |
| H-5 | `docs/formatlar/smd.md` "yükseklik x/z yer değiştirmiş" notu **yalnız bazı haritalar için doğru** | DÜŞÜK | **Evet** (belge düzeltmesi) |

Önceki rapora göre değişen: yok (bu, harita dosyalarına ilk bakış). Aracın (`npm run tara`) harita kontrolleri (DOS-01…14) temiz çıkıyordu; aşağıdakiler o araçların **bakmadığı** alanlardır (sunucu `.smd` içi, client `.gtd` eşleşmesi, client `Zones` tablosu). Araca kod eklemedim; betikler geçici klasörde duruyor, istenirse `araclar/tarama/`ya kontrol olarak eklenebilir.

---

## 2. Bulgular

### H-1 — `freezone_a` ailesinde bozuk çarpışma üçgenleri (ORTA)

**Bakılan:** 77 `.smd` dosyasının hepsi hatasız okunuyor ve dosya sonuna tam oturuyor (artık bayt 0). Bunların içinde yalnız şu 5 dosyada çarpışma üçgenleri bozuk: `1098freezone_a.smd` (bölge 72), `freezone.smd` (74), `freezone_a.smd` (115), `freezone_a_event2012.smd` (77), `freezone_b_2012event.smd` (78). Son dört dosya **birebir aynı** (md5); `1098freezone_a` yalnız kapı bölümünde farklı.

**Kanıt (ayrı betikle, her dosya aynı sonuç):**
- Toplam 11.319 üçgenden **1586 bozuk (%14)**: 56'sı NaN/Sonsuz değer içeriyor, 1530'u köşe değeri 1e5'ten büyük (örn. `115479944, 0, -2.1e34, … NaN`; en büyük değer ≈ 3,4e38).
- Bozuk üçgenler rastgele dağılmıyor: dizinin 648–2270 aralığında, 32 ardışık blok halinde. Bunlar bozuk bir bölüm gibi duruyor (dosya bozulması ya da yanlış okunan bir yapı; hangisi **doğrulanmadı**).
- Sağlam 9733 üçgenin 9728'i harita sınırları içinde; yani sağlam kısım tutarlı.
- Bu haritalarda üçgenlere bağlanan 16 m'lik hücre yalnız **2** tane: sunucu bu üçgenleri büyük olasılıkla kullanmıyor (yani sunucu davranışını bozduğu **doğrulanmadı**).
- `araclar/harita/smd.ts` çarpışma üçgenlerini olduğu gibi okuyor (`yuzler`), `cli.ts` hepsini `carpisma.bin`'e yazıyor. `npm run harita -- freezone_a` benzeri bir çalıştırma bozuk değerleri client'a götürür (çarpışma testinde NaN, sonsuz değer).
- Etkilenen bugünkü çıktılar: **yok.** Dönüştürülmüş 4 haritanın (`karus2004`, `elmo2004`, `moradon`, `14th_oldmoradon`) `carpisma.bin` dosyalarında NaN/aşırı değer yok (kontrol edildi).

**Öneri (fast):** `smdOku` içinde köşe değeri sonlu değilse ya da |değer| > 1e5 ise üçgeni atla; atılan sayıyı döndür/`cli.ts`'te "N bozuk üçgen atlandı" yaz. Test: bu 5 dosyadan biri sunucu klasöründe varsa 1586 atlandığını doğrulayan test (dosya yoksa testi atla). Risk: çok düşük (yalnız bozuk üçgenler atılır).
**Benzer ama zararsız (bilgi):** harita sınırı dışına taşan üçgenler: `moradon_0826` 159 (en çok 51 m dışarıda), `old_moradon` 193 (30 m), `elmo2004` 41 (14 m), zindanlar 5-6 (8 m). Sıfır alanlı (çizgi gibi) üçgenler: `elmo2004` 52, `karus2004` 36, `14th_oldmoradon` 6. Bunlar harita kenarındaki nesnelerden geliyor gibi; hata saymadım.

**Karar gerekiyor mu:** Hayır; fast düzeltir.

---

### H-2 — Sunucu `.smd` dosyaları başka haritaların kopyası; client haritasıyla uyuşmuyor (ORTA / DÜŞÜK)

**Yöntem:** (1) `.smd` yükseklik ızgaralarının md5'ini aldım; (2) her bölge için `ZONE_INFO1098.strZoneSmdName` ile client `Zones` tablosundaki `.gtd`'yi eşleştirdim; (3) ızgara boyutlarını (N) ve yükseklik benzerliğini (aynı noktada fark < 1 m olan hücre oranı; iki x/z yönü denenip iyisi alındı) ölçtüm. Sağlıklı eşleşme örnekleri %73-100 çıkıyor (aşağıda "tamam" listesi).

**Birebir kopya olan sunucu dosyaları** (md5 aynı):
- `1098karus2004.smd` = `2003_karus_oldtime.smd` = **`dungeond.smd`** (tüm dosya aynı, 42 Luferson kapısı dahil). Ayrıca `elmo_oldtime_2003.smd`'in yükseklik ızgarası da aynı.
- `14th_oldmoradon.smd` = `2017_flagwar.smd` = `LK_war_a01.smd` = `battlezone_67.smd` = `testwar2012.smd`; `BattleZone_b.smd` ve `dungeon_defense.smd` de aynı yükseklik ızgarası (kapı sayısı farklı).
- `In_Dungeon05.smd` = `In_Dungeon06.smd` = `sky_war_2009.smd` = `bossmode.smd`.
- `dungeon_b1th.smd` = `dungeon_b3th2015.smd`; `battlezone_e.smd` = `battlezone_e_fl.smd`; `dungeon_a.smd` = `dungeondsavas.smd`.
- `elmo2004.smd` ailesi (`_2`, `_3`) ve `karus2004.smd` ailesi: kasıtlı çoklu bölge kopyaları (II/III bölgeleri), sorun değil.

**Client haritasıyla uyuşmayanlar** (bölge · sunucu `.smd` · client `.gtd` · ölçü · bölgedeki yerleşim sayısı):

| Bölge | `.smd` (N) | Client `.gtd` (N) | Ölçü | Yerleşim |
|---|---|---|---|---|
| 35 Delos Basement | `dungeond.smd` (513, Luferson kopyası) | `dungeonD.gtd` (129) | **boyut farklı**; hiçbir `.smd` ile eşleşmiyor (en iyi %7,5) | 72 |
| 105 Zindan War, 110 Snow War | `dungeond.smd` (513) | `dungeonD.gtd` / `xmas_battle.gtd` (129) | boyut farklı | 50 / 30 |
| 85 Chaos Dengueon | `sky_war_2009.smd` (257, bossmode kopyası) | `sky_war_2009.gtd` (65) | boyut farklı | **1020** |
| 87 Juraid Mountain | `In_Dungeon05.smd` (257, bossmode kopyası) | `In_dungeon05.gtd` (257) | yükseklik %0,2–2,6 | **2100** |
| 84 Border Defance War | `In_dungeon04.smd` (257) | `In_dungeon04.gtd` (65) | boyut farklı | 420 |
| 96–99 Party War | `In_dungeon06.smd` (257, bossmode kopyası) | `In_dungeon06.gtd` (65) | boyut farklı | 1'er |
| 75 Krowaz Domion | `itemzone_a.smd` (513) | `itemzone_a.gtd` (513) | yükseklik **%13** (aynı boyut) | 352 |
| 66 Oreads | `new_runawar.smd` (513) | `new_runawar.gtd` (257) | boyut farklı | 296 |
| 73, 108 Ronark Land Base | `1098freezone_c.smd` (513) | `FreeZone_c.gtd` (257) | boyut farklı (en iyi %3,6) | 160 / 70 |
| 78 Clan War Ronark Land | `freezone_b_2012event.smd` (257) | `freezone_b_2012event.gtd` (513) | boyut farklı | — |
| 34, 94 Felankor Lair | `dragon_a.smd` (257) | `dragon_a.gtd` (33) | boyut farklı (1024 m'e karşı 128 m) | 2 / 2 |
| 89 Dungeon Defence | `dungeon_defense.smd` (257) | `dungeon_defense.gtd` (65) | boyut farklı | — |
| 95 Drakis Tower | `dungeon_b3th2015.smd` (129, b1th kopyası) | `dungeon_b3th2015.gtd` (129) | yükseklik %29,7 | — |
| 36 Flag War | `2017_flagwar.smd` (257) | `2017_flagwar.gtd` (257) | yükseklik %8 | — |
| 28 Old Human, 106 Piana War | `elmo_oldtime_2003.smd` (513, Luferson ızgarası) | `Old_Elmo.gtd` (513) | yükseklik **%0** | — / 63 |
| 107 Mini Colony Zone | `2003_karus_oldtime.smd` (513, Luferson kopyası) | `freezone_b_2012event.gtd` (513) | yükseklik %3 | 47 |
| 111 Night Delos War | `kobawar.smd` (257) | `Worldwar.gtd` (257) | yükseklik **%0** | 53 |
| 29 Old Moradon | `14th_oldmoradon.smd` (257) | `14th_oldmoradon.gtd` (129) | boyut farklı (**belgelenmiş**: "257'lik başka harita, eşleşmez") | — |
| 18 Kecoon Valley | `1098moradon_0826.smd` (257) | `2017_flagwar.gtd` (257) | yükseklik %0 | 25 |
| 51–55, 92 clanfight | `clanfight_b.smd` (65) | `clanfight_b.gtd` / `_d.gtd` (65) | yükseklik %25 | az |

Bölgeler 63, 71, 74, 109, 112, 114 için client haritası okunamadığı için (H-4, `.lilith`) bu karşılaştırma **yapılamadı** (doğrulanmadı).

**Tamam çıkanlar** (yükseklik benzerliği yüksek; fast güvenle eşleyebilir): `karus2004.gtd` ↔ `1098karus2004.smd` %81,9; `elmo2004.gtd` ↔ `1098elmo2004.smd` %90,3; `moradon.gtd` ↔ `1098moradon_0826.smd` %85,2; `moradon_xmas.gtd` ↔ `1098moradon_0826.smd` **%100**; `14th_oldmoradon.gtd` ↔ `old_moradon.smd` %98,6; `arena` %100; `battlezone` ↔ `BattleZone` %98; `battlezone_b` ↔ `BattleZone_b` %90,2; `battlezone_d` ↔ `battlezone_d` %93,9; `battlezone_e` ↔ `battlezone_e` %83,2; `bossmode` %100; `castlefreezone_b.gtd` ↔ `itemzone_a.smd` %98,1; `dungeon_b1th` %100, `dungeon_b2th` %88,2; `eslantzone.gtd` ↔ `k_eslant/e_eslant` %80,6; `freezone_a.gtd` ↔ `1098freezone_a.smd` %99,7; `In_dungeon02` %90,1; `war_a` %73. Orta (%56-67): `In_dungeon01/03`, `dungeon_a` %62, `freezone_b` %57.

**Oyuna etkisi:** Bu `.smd` dosyaları Myko'nun sunucu paketinden geliyor ve sunucu bunları çarpışma ve ışınlanma için kullanıyor. Client haritasıyla uyuşmayan bölgelerde sunucunun çarpışma yüzeyi, oyuncunun gördüğü haritanın duvarlarına uymaz; örneğin Delos Basement'ta (bölge 35) sunucu, Luferson'un çarpışmasını ve **Luferson'un 42 kapısını** kullanıyor. Orijinal pakette de böyle olabilir (**doğrulanmadı**). Şu an tarayıcıda oynanabilen haritalar (1, 2, 21, 18) bu listede değil (18 için aşağıya bak). Bu yüzden önem ORTA; bu bölgeler oyuna alındığında yükselir.

**Öneri (fast):**
1. `cli.ts`'e eşleşme denetimi ekle: `.smd` N'si `arazi` N'sinden farklıysa ya da yükseklik benzerliği %50'nin altındaysa `carpisma.bin`/`sunucu.json` yazma, açık uyarı ver (`--zorla` ile geçilir). Yukarıdaki "tamam" listesini `SUNUCU_HARITASI` tablosuna doğrulanmış eşleşmeler olarak ekle (şimdi tabloda olmayan haritalar `<ad>.smd` varsayımıyla eşleşiyor; `dungeond` için bu, Luferson'un dosyasını getirir).
2. Uyuşmayan bölgeleri `docs/formatlar/smd.md`'ye "çarpışma verisi güvenilmez" diye yaz.
3. `.smd` dosyalarına dokunma (sunucu verisi; kuralı: salt okunur).

**Risk:** Düşük (denetim yalnız uyarı/duraklatma ekler). **Karar gerekiyor mu:** Evet — bu bölgelerden hangilerinin oyuna alınacağı müdür/kullanıcı kararı; hiçbiri alınmayacaksa fast yalnız denetimi ekler.

**Not (bölge 18, belgelenmiş karar):** `haritalar.ts` ve YAPILACAKLAR bölge 18'i `moradon` (yeni Moradon) yapıyor; sunucu `.smd`'si de `1098moradon_0826.smd`. Client'ın kendi `Zones` tablosu ise bölge 18'i `2017_flagwar.gtd`'ye bağlıyor (ve sunucu `.smd` ile client `.gtd` yükseklikleri %0 eşleşiyor). 25 yerleşimin zemin yüksekliklerine bakarak ikisini ayıramadım (flagwar düz bir harita; her nokta uyar). **Kararı bozacak kanıt yok**, ama çelişki var; bölge 21 için ise client tablosu (`14th_oldmoradon_gtd.lilith`) belgelenmiş kararla uyumlu.

---

### H-3 — Client `Zones` tablosunun gösterdiği harita dosyaları eksik (DÜŞÜK)

**Yöntem:** `Zones.csv` içindeki 105 satırın 844 dosya yolunu (`.gtd`, `.tct`, `.tlt`, `.opd`, `.opdext`, `.glo`, `.gev`, `.ens`, `.flag`, `.lilith`) `KnightEmpire\Zones\` ile karşılaştırdım. 27 yol eksik, 4 bölgeye ait:

| Bölge | Client satırı | Eksik |
|---|---|---|
| 65 Moradon War (sunucuda açık, 6 NPC) | `BattleZone_f` | harita dosyalarının **hepsi** (gtd, tct, tlt, opd, opdext, glo, gev, flag) |
| 67 Test Zone (açık) | `battlezone_67` | hepsi (+ ens) |
| 88 Lk War (açık) | `LK_war_a01` | hepsi; `.ens` yolu `lilithwar2012.ens` de yok |
| 109 Moradon War (açık, 70 yerleşim) | `oraclegamer_moradonwar` | `moradonwar.glo`, `moradonwar.ens` |

**Etki:** Orijinal client bu bölgeye girince haritayı yükleyemez; bizim client'ta bu bölgeler `haritalar.ts`'te yok. **Öneri:** Fast bu bölgeleri "kaynak yok" diye işaretlesin (kapı listesinde gri kalsın, dönüştürmeye çalışmasın). Bölgeleri sunucuda kapatmak (Status 0) müdür/kullanıcı kararı.

---

### H-4 — Okunamayan 6 `.gtd` dosyası (DÜŞÜK)

Okunamayan: `clanfight.gtd`, `clanfight_c.gtd`, `elmorad_start.gtd`, `karus_start.gtd`, `freezone.gtd`, `freezone_new.gtd` (52 `.gtd` okunuyor, 6 okunmuyor; `araclar/harita/arazi.ts` "Geçersiz ızgara boyu" hatası veriyor). `model.md:80` bunu zaten not ediyor; **yeni olan kanıt:** hepsinde başlık **farklı biçimde**: normal dosyada ilk 4 bayt ad uzunluğu ve ad XOR'lu (`karus2004`: `09 00 00 00 63 da ad 8b…`); bu 6'sında ilk bayt `01` ya da `02` (sürüm numarası gibi), sonra ad uzunluğu, sonra **düz yazı ad** (`01 00 00 00 | 09 00 00 00 | "clanfight"`). Okuyucunun verdiği sahte "ızgara boyu" değerleri (1718509932 vb.) aslında adın ASCII baytları. Bu başlığın kalanını (ızgara boyu, yükseklikler) **çözmedim**.
**Etki:** `freezone.gtd` bölge 74 (Test Zone); `karus_start`/`elmorad_start`/`clanfight*` bölge tablosunda doğrudan kullanılmıyor (giriş/karakter seçimi ya da ek haritalar olabilir; **doğrulanmadı**). Ayrıca `.lilith` uzantılı (şifreli) client haritaları (bölge 21-24, 71, 109, 112, 114…) hiç okunmuyor. **Öneri:** format-cozucu/fast `arazi.ts`'e ikinci başlık sürümünü eklesin; test için `freezone.gtd`.

---

### H-5 — `smd.md`'deki "x/z yer değişmiş" notu genel doğru değil (DÜŞÜK, belge)

`docs/formatlar/smd.md` "`.smd` yükseklik ızgarası `.gtd` ile x/z yer değiştirmiş (`smd[z*N+x] == gtd[x*N+z]`)" diyor. 52 haritada ölçtüm: **yalnız `moradon`, `moradon_xmas`, `bossmode` gibi birkaç haritada** böyle (ör. `moradon` %85 yer değiştirmiş vs %13 aynı). **Çoğunda aynı sıra** (ör. `karus2004`: aynı sıra %81,9, yer değiştirmiş %8,1; `elmo2004` %90,3 vs %9,3; `battlezone`, `dungeon_b1th`, `freezone_a`, `eslantzone` aynı sıra). Dönüştürücü `.smd` yüksekliklerini kullanmadığı için bugün bir hataya yol açmıyor, ama ileride (yürünebilirlik, `karoOlay` kullanımı) yanıltır. **Öneri:** belgede "haritaya göre değişir" yazılsın, tabloya yönü eklensin.

---

## 3. Düzelenler ve yanlış alarm çıkanlar (hata saymadım)
- **Negatif yüksekliğe yerleşim/varış.** Bazı yerleşimler ve ışınlanma varışları −7…−24 m zeminde (Luferson'da Kalluga Valley 912,241 = −12,6 m; Linart Village 1727,870 = −24,5 m; El Morad'da Laiba Village 320,1254 = −18,5 m, Kalluga Valley Entrance 1131,1820 = −7,2 m). Köy/vadi varışları olduğu için "su altı" demedim; su yüzeyi seviyesi **doğrulanmadı**. Bölge 61 Napies Gorge'un bütün 169 yerleşimi negatif zeminde; yani harita genel olarak negatif.
- **Zararsız geometri:** sınır dışına taşan ve sıfır alanlı üçgenler (H-1'in sonu).
- **Staff Num çakışmaları:** müdür 2026-11-19'da düzeltmiş (YAPILACAKLAR satır 415); tekrar etmedim.

## 4. Temiz geçenler
- 77 `.smd`: okunuyor, dosya sonu tam oturuyor, NaN yükseklik yok, sivri tepe/çukur (4 komşudan >50 m sapma) yok, hücre dizin taşması yok, nesne olayları harita içinde.
- 4 dönüştürülmüş harita (`14th_oldmoradon` 113, `karus2004` 294, `elmo2004` 286, `moradon` 25 yerleşim): hiçbiri harita dışında ya da `alan` ile taşmıyor; aynı noktada çakışan farklı NPC yok; nesne olaylarının yüksekliği zemine uyuyor (medyan fark 0–0,1 m; `moradon` için 2,7 m, ki `.smd` ile `.gtd` o haritada %85 eşleşiyor); `carpisma.bin` temiz.
- 617 ışınlanma kapısı kaydında hedef bölge hepsinde tanımlı; varış koordinatı client haritası boyutları içinde (client haritası okunabilen 477'de).
- `ZONE_INFO1098` 77 bölge: hepsinin `.smd` dosyası var.

## 5. Bakılmayanlar
- `.lilith` (şifreli) ve H-4'teki 6 `.gtd` içerikleri; bu yüzden bölge 63, 71, 74, 109, 112, 114'ün client eşleşmesi.
- Su yüzeyi seviyesi/su altı denetimi (`su.json` ile doğuş noktası).
- Yerleşimin duvar içinde/ulaşılamaz yerde olması (`karoOlay` anlamı bölgeden bölgeye değişiyor; doğrulanmadı, "yürünemez" demedim).
- Nesne (`.opd`), doku (`.tct`), ışık (`.tlt`/`.glo`) ve model (`.glb`) içerikleri; `nesneler.glb` boyutu/performans.
- Sunucunun H-1 ve H-2 verisini çalışırken nasıl yorumladığı (kaynak kodda `shared/SMDFile.cpp` hücre/üçgen kullanımı okunmadı).

## 6. Önerilen sonraki adım (fast için)
1. **H-1:** `smd.ts`'te bozuk üçgen filtresi + test (küçük, risksiz).
2. **H-2:** `cli.ts`'e `.smd` ↔ `.gtd` eşleşme denetimi (boyut + yükseklik benzerliği) ve doğrulanmış eşleşme tablosu.
3. **H-5 ve H-4:** `smd.md` düzeltmesi; sonra 6 okunamayan `.gtd` için ikinci başlık biçimini çözmek.
