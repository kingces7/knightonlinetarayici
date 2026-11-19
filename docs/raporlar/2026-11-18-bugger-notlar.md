# Bugger notları — 2026-11-18

Kapsam: `docs/YAPILACAKLAR.md` → "Veri tarayıcı ve bulgular" bölümündeki 4 karar bekleyen bulgunun yeniden doğrulanması ve karar seçenekleri.
**Hiçbir şey değiştirilmedi** (veritabanı, dosya, kaynak kod). `npm run tara` yeniden çalıştırıldı: sayılar aynı (KRITIK 0, YUKSEK 1, ORTA 5, DUSUK 13, BILGI 2; 26 kontrol temiz, 0 atlandı; SQL Server açık). Araca kod eklenmedi; tek seferlik sorgu ve betikler scratchpad klasöründe kaldı.

Terimler: **Num** = eşyanın kimlik numarası. **Ganimet grubu (MAKE_ITEM_GROUP)** = mob ölünce "şu gruptan rastgele bir eşya düş" denen eşya havuzu. **Uzantı (Extension)** = eşyanın "+N" ve ateş/buz/yıldırım gibi varyantlarını tanımlayan client tablosu (`Item_Ext_<n>`); eşya Num'unun son 3 hanesi uzantı satırının numarasıdır.

## 1. Özet

| Bulgu | Aracın dediği | Doğrulanan | Önerilen önem |
|---|---|---|---|
| (a) Aynı Num, farklı kayıt | 12 / 105.018 (YUKSEK) | **12 doğru** (7 ayrı Num grubu türü, aşağıda). Hiçbiri ganimet/mağaza/üretimde geçmiyor; yalnız 389400000 mağazada (grup 999000) satılıyor | ORTA (4 çift gerçek stat hatası, geri kalanı ad/fazlalık) |
| (b) Ganimet grubu eksik | 44 satır (ORTA) + 19 mob (ORTA) | 44 satır **tek bir grup koduna (8888)** bağlı; 19 mobun 2'si yalnız **kapalı** bölgede | ORTA kalır ama (b2) için 17'ye, DROP-02'nin iki mobu DUSUK'e inmeli |
| (c) Adında "?" | 284 (ORTA) | 284 doğru; ama **yalnızca 14 benzersiz ad** (233'ü tek aile: Hunter's Bow) | DUSUK-ORTA |
| (d) Client'ta karşılığı yok | 43 (ORTA) | 43 doğru **ama tarayıcı client'ında büyük ölçüde zaten çözülmüş**: 40'ı `tum.json`'da var | DUSUK (araç yanlış kaynakla karşılaştırıyor) |

Önceki taramaya göre değişiklik: yok (aynı gün, aynı veri).

---

## 2. Bulgular ve kullanıcı karar listeleri

### (a) DB-ITEM-02 — Aynı Num ile farklı 12 eşya kaydı

**Bakılan:** ITEM 105.018 satır (3'ü tamamen NULL; 105.015 Num'lu satırda 104.999 benzersiz Num → 16 fazla satır). Bu 16 satırdan 12'si farklı (bulgu), 4'ü birebir aynı (DB-ITEM-11). Alan alan karşılaştırdım (ayrı betik); araç 12 diyor, ben de 12 buldum.

**Kanıt ve yorum (gruplara göre):**

| Num | Fark | Hangisi doğru? |
|---|---|---|
| 180130061, 180130091 (Wood Staff), 180330061, 180330091 (Wizard Staff) — 4 çift | Biri `(+1)` (Hasar 40, buz/yıldırım 56), diğeri `(+11)` (Hasar 62, bonus 72) | **`(+1)` doğru.** Client `Item_Ext_34_us.csv`: uzantı 61 = Frozen +1, 70 = Frozen +10, 71 = Frozen +11; uzantı 91 = Lightning +1, 100 = +10, 101 = +11. Sunucuda `+1` 061/091'de doğru; ama `+10` 060/090'a, `+11` 061/091'e yazılmış. Doğru Num'lar 070/071 ve 100/101 olmalı. Bu 4 Num'un (070, 071, 100, 101) sunucuda hiçbiri yok. Ayrıca sunucudaki 060 ve 090, client'ta "Burning +30" ve "Frozen +30" anlamına geliyor |
| 159301520 Lugias(+10) | Biri Güç 20 / Dayanıklılık 20, diğeri Dayanıklılık 20 / Çeviklik 28 | **Güç/Dayanıklılık satırı doğru** (+1…+9 serisi Güç=Dayanıklılık). Çeviklik 28'li satır, ayrı Lugias ailesinin (+21) satırı (159311111) kopyası |
| 389400000 Premium Potion MP (5000) | Satır A: süre 5000, alış 3.000.000, etki 500146. Satır B: süre 1000, alış 15.000, etki 500144, açıklama "Voucher" | **A doğru görünüyor.** Kardeşi 389390000 (HP 5000) aynı fiyat/süre ve etki 500145 (ardışık); B, 389360000'ın (MP 5000 PUS, etki 500144) kalıntısı. Client satırı ikisine de tam uymuyor (etki 500146 + süre 5000 = A; fiyat 15.000 = B) |
| 330620431…435 Felankor yüzükleri (5 çift) | Yalnız ad: `Ring of the Felankor(+N)` / `Felankor(+N)` | Oyun farkı yok. +6…+10 yalnız `Felankor(+N)` adlı; adlar tutarsız. Client'ta karşılığı yok, doğru adı doğrulayamadım |
| 910158138 | Yalnız ad: `Messenger Pendant` / `Mage Pendant` | Oyun farkı yok. Başka bir eşya (900530849) zaten "Mage Pendant" adlı; yani "Messenger Pendant" daha ayırt edici |

**Sunucu hangisini yüklüyor?** `ItemTableSet.h:91` → `PutData` yeni kaydı `map.insert` ile ekler; anahtar varsa ekleme başarısız olur ve kayıt `delete` edilir: **ilk gelen satır kazanır, ikincisi sessizce atılır.** ITEM tablosunda dizin yok (heap), ilk gelen = diskte önce duran satır. Buna göre: staff'larda `(+1)` önce (4/4), Lugias'ta Güç satırı önce, Premium Potion'da A önce, Felankor'da "Ring of the Felankor" önce, Pendant'ta "Messenger" önce. Yani **bugün zaten "doğru" olan satırlar yükleniyor**; ikinci satırlar ölü veri. Kesin doğrulama (canlı sunucuda hangisi yüklü) yapılmadı: sıra, SQL Server'ın tarama sırasına dayanıyor.

**Oyuna etkisi:** Staff `(+10)`/`(+11)` buz ve yıldırım varyantları yanlış Num'da; `+11` hiç yüklenmiyor. Bu eşyaların nasıl elde edildiği (yükseltme zinciri, GM komutu) doğrulanmadı; mağazada ya da ganimette geçmiyor. Kalan çiftler oyunu etkilemiyor.

**Seçenekler (kullanıcıya sorulacak):**
1. **Staff'lar:** (a1) 8 yanlış satırın Num'unu client'a uydur: 180130060→070, 180130061(+11)→071, 180130090→100, 180130091(+11)→101, Wizard için aynısı. Oyuncu envanterinde eski Num'larla duran eşya varsa kimlik değişir (doğrulanmadı; envanter SELECT ile bakılmadı). (a2) Yalnız çakışan 4 `(+11)` satırı sil, `(+10)` kalsın. (a3) Dokunma.
2. **Lugias / Premium Potion / Pendant / Felankor:** önerim, ikinci (zaten yüklenmeyen) satırı silmek; Felankor için tek ad seçmek ("Ring of the Felankor" ya da "Felankor"). Risk çok düşük, çünkü bugün de yalnız ilk satır yükleniyor.
3. **4 birebir aynı satır (810961000, 810963000, 810965000, 814042737) ve 3 boş satır:** fazlalığı silmek güvenli. Dikkat: üçü Aurora mağazasında (grup 999000) iki kez yazılı görünür; bu sayım satır çoğalmasından geliyor, mağaza slotu çift değil.

**Karar gerekiyor mu:** Evet — özellikle staff'lar için (a1/a2/a3). Diğerleri "önerim uygulansın mı" onayı.

---

### (b) Ganimet — 44 satır ve 19 mob

**(b1) DB-DROP-03 — grup kodu olmayan 44 ganimet satırı.** Bağımsız sorguyla yeniden saydım: 44 satır, 43 farklı ganimet kaydı, **hepsi tek grup koduna bağlı: 8888.** MAKE_ITEM_GROUP'ta 239 grup var, 8888 yok (8000-8999 aralığında hiçbiri yok). Kaynak kod: `Npc.cpp:6246-6249` — `pGroup == nullptr || pGroup->iItems.size() <= 0` ise `continue`; o ganimet slotu sessizce atlanıyor, diğer slotlar çalışmaya devam ediyor.

Etkilenen mobların konumu (ilk bölge): Colony Zone (71) 23 satır, Luferson Castle (1) 10, El Morad Castle (2) 6, Eslant (11) 4, Ronark Land Base (73, **kapalı bölge**, Status 0) 1. Yani tarayıcıda bugün açılan haritalardan 2'sinde (karus2004, elmo2004) 16 satır var: Uruk Hai/Blade/Tron, Deruvish, Apostle, Harpy, Raven Harpy, Stone Golem, Giant Golem.
Düşme oranları (`sPersent`, 10000 = %100): satırların çoğu **1 = %0,01**; 50 = %0,5; 100 = %1; en yüksek 9805 "DARK MARE (Anti AFK)" 500 = %5. Yani etki: nadir, belki özel bir "sürpriz eşya" havuzu için ayrılmış slot.

Ek gözlem: MAKE_ITEM_GROUP'ta 4 **boş grup** var (1500, 9998, 15010, 312101: 200 eşya alanının hepsi 0). Hiçbir ganimet satırı bunları kullanmıyor; etkisi yok.

**(b2) DB-DROP-02 — ganimet tablosu olmayan 19 mob.** Yeniden saydım: 19 (araçla aynı) — ama aracın "haritada duran" tanımı *herhangi bir* `K_NPCPOS1098` satırı; **2 mob yalnız kapalı bölgede (73, Ronark Land Base, Status 0)**: 8011 Dragon Tooth commander, 8014 Apostle of Piercing Cold. Açık bölgede duran **17 mob**. Kural: sunucuda mobların 2166/2171'inde `sItem = sSid`; bu 19'unun ganimet satırı (`sIndex = sSid`) hiç oluşturulmamış. Kaynak kod: `Npc.cpp:~6273` — `m_NpcItemArray.GetData(m_iItem)` boşsa hiçbir ganimet işlenmez.

17 mobun yeri: Delos, Desperation Abyss, Hell Abyss (504, 505, 506, 5552, 5651, 7001, 7002), El Morad Castle (505, 5 adet), Isillion/Felankor Lair (5701, 5702 — iki boss), Eslant (7018-7022: 4 `[Quest]` mob, görev eşyası düşürüyor olabilir, **doğrulanmadı**), Krowaz Domion (8608 Giga Hammer, 8615 Lirimu, 8617 Ashiton, 8634 Treasure Chest — sandık ganimetsiz ise gerçek hata).
Aynı adlı ve ganimeti olan "kardeş" mob 14 tanesinde var (ör. Dark eyes 504 → 554, Dire wolf 505 → 555, Servant of Isiloon 5552/5651 → 5502, Felankor 5702 → 9415); 7001, 7018, 7019, 7021, 7022 için kardeş yok.

**Seçenekler:**
- **8888:** (b1-a) Dokunma — oranlar çok düşük, etki küçük. (b1-b) Slotları boşalt (44 satır UPDATE, ganimet kodunu 0 yap) — hata kalkar, davranış aynı kalır. (b1-c) 8888 grubunu oluştur ve içine eşya koy — **hangi eşyaların düşeceği oyun dengesi kararı, sizin.** Önerim (b1-b) ya da "bilinçli bırak" notu; (c) için önce bu slotların orijinal amacının ne olduğunu bilmek lazım (doğrulanmadı).
- **19 mob:** (b2-a) Dokunma. (b2-b) Ganimet satırı olmayan 14 mobun satırını aynı adlı kardeş mobdan kopyala (ör. 504 ← 554). (b2-c) `sItem = 0` yap (ganimetsiz resmen). Önerim: görev mobu olanları (7018-7022) ve boss'ları (5701, 5702) önce sizinle konuş; sıradan mobları (b2-b).
- Araç: kapalı bölgedeki 2 mob DUSUK'e inmeli (aracın "haritada duran" tanımı sıkılaştırılabilir: bölge Status 1 ve tanımlı).

**Karar gerekiyor mu:** Evet. 1) 8888 için a/b/c, 2) 19 mob için a/b/c ve görev/boss mobları için ayrı karar.

---

### (c) DB-ITEM-04 — Adında "?" olan 284 eşya

**Bakılan:** ITEM 105.018 satır; `strName LIKE '%?%'` = 284 (araçla aynı). Bunlar **14 benzersiz ad** (artı numarasını çıkarınca):

| Ad (DB) | Satır | Önerilen düzeltme | Dayanak |
|---|---|---|---|
| `Hunter??s Bow(+N)` (900534xxx) | 233 | `Hunter's Bow(+N)` | DB'de başka bir ailenin adı zaten `Hunter's Bow(+10)` (160450060). `??` = UTF-8 kesme işareti bozulması (237 satırda aynı kalıp). Client tablosunda taban ad `Hunter? Bow` |
| `Mj?nir(+N)` (1110576841…) | 30 | `Mjolnir(+N)` | Client tablosu: `Mjolnir` |
| `Mj?lnir (+N)` (1110566721…) | 10 | `Mjolnir (+N)` | aynı |
| `Premium ?ksir Kuponu (HP 300)` / `(MP 500)` (389370000, 389380000) | 2 | `Premium Potion Voucher (HP 300)` / `(MP 500)` | Türkçe "İksir Kuponu"; kardeşleri `Premium Potion Voucher (HP 100)` vb. CLAUDE.md "oyun içeriği İngilizce" |
| `??????? ??` (910071292) | 1 | `Dagger of Chicken That Ate Sansam` | Client tablosunda aynı Num bu adla var |
| `Master??s Teaching`, `Sword of Shojin??`, `Kar Lahanas??`, `Punishment?Stick`, `Protector?of the King?Belt`, `Dagger of ?Shin?`, `Boss monster??7kinds..one-hand[for Mammoth]` | 1'er | Bir kısmı belli (`Master's Teaching`, `Punishment Stick`, `Protector of the King Belt`); diğerlerinde doğru yazım **doğrulanmadı** | client tablosunda da aynı bozuk |
| `????? ????` (810368000) | 1 | Korece orijinal ad kayıp; doğru ad **bilinmiyor** | client'ta da `??? ??` |

**Oyuncu ne görüyor? (önemli):** Tarayıcı client'ı eşya adını `donusturulmus/web/esya/tum.json`'dan alıyor; bu dosya `Item_Org_us.tbl`'den (yani orijinal client tablosundan) üretiliyor (`araclar/oyun/tumEsyalar.ts`). Bu tabloda `?` **orijinal dosyada literal 0x3F olarak duruyor** (kodlama bozulması değil; tablo kayıpsız çözülüyor). `tum.json` içinde adında `?` olan 17 taban eşya var: bunların 8'i DB ile aynı eşya, 9'u yalnız client tablosunda (ör. `Bow of ???Nakjji???`, `Sword of ?????`, `Sword of the Dead ?l?lerin K?l?c?`) ve DB tarafında sorun olmayabilir. Yani **yalnız DB'yi düzeltmek oyuncunun gördüğü adı değiştirmez**; `tum.json` üretimine bir ad-düzeltme listesi (ya da CSV düzeltmesi) gerekir.
Erişilebilirlik: 284'ten 8'i Aurora mağazasında (grup 999000) satılıyor (Kar Lahanas, Master's Teaching, Sword of Shojin, Punishment Stick, 2 Premium Voucher, 810368000, Boss monster...); hiçbiri ganimet ya da üretim grubunda yok. 233 Hunter's Bow(+N)'in bu 3 yoldan hiçbiriyle elde edilmediği görünüyor (nasıl elde edildikleri doğrulanmadı).

**Seçenekler:**
1. Otomatik düzeltme betiği: Hunter's Bow (233), Mjolnir (40), Premium Voucher (2), Chicken-Sansam dagger (1) = **276 satır**, yedekli UPDATE. Kalan 8 satır elle.
2. Yalnız oyuncunun gördüğü 17 adı düzelt (`tum.json` üretimine düzeltme listesi), DB'ye dokunma.
3. Dokunma (oyunu bozmuyor; sunucu mesaj/kayıtlarında kötü görünür).

Önerim: 2 + 1 birlikte (yan etki yok). **Karar gerekiyor mu:** Evet (hangi seçenek ve belirsiz ~8 adın İngilizce karşılığı).

---

### (d) DB-ITEM-06 — Client tablosunda karşılığı olmayan 43 sunucu eşyası

**Bakılan:** DB'de Num'lu 105.015 satır. `Item_Org_us.csv` (5.327 satır) ile karşılaştırma (Num ya da Num − Num%1000): **43, aracla aynı.** Bunların hepsi uzantı 22'li (etkinlik/premium eşya) ve 1'i adsız (890227000).

**Asıl bulgu — araç yanlış hedefle karşılaştırıyor:** tarayıcı client'ı `Item_Org_us.csv`'yi doğrudan kullanmıyor; `araclar/oyun/tumEsyalar.ts:47-53` sunucuya özel eşyaları ITEM tablosundan ekliyor (Num%1000=0 olanlar ve ganimette geçenler). Sonuç: 43'ün **40'ı `tum.json`'da ad + simgeyle var** (simge dosyaları da var). Eksik olan **3**: 910248854 `War wing` (Num%1000≠0 varyant), 900797825 `AryaOnlineWorld emblem`, 900897826 `YAYINCI emblem`; üçü de mağazada/ganimette geçmiyor, oyuncu bunlara ulaşamıyor.
Oyuncu açısından: 43'ün **39'u Aurora mağazasında (grup 999000) satılıyor**; Aurora, Moradon (21), Luferson (1) ve El Morad'da (2) duruyor, yani oyuncular bu eşyaları görebilir. Bunlar `tum.json` sayesinde adlı ve simgeli görünür.

**Önerilen önem:** DUSUK. Araç kontrolü, `tum.json`'u (ya da `Item_Org_us + ITEM'dan eklenenler`) esas almalı; o zaman bulgu 3 eşyaya iner.

**Seçenekler:**
1. Dokunma, yalnız aracın kontrolünü `tum.json`'a göre düzelt (önerim).
2. 3 eksik eşyayı `tum.json`'a ekle (`Num%1000≠0` varyantları için taban eşyadan kopya; ayrıca emblem/wing'ler ulaşılamaz olduğu için gereksiz).
3. Mağazadaki 39 slotu kaldır (önerilmez: Aurora'nın amacı bu eşyaları satmak gibi görünüyor).

**Karar gerekiyor mu:** Hayır, yalnız "araç düzeltmesi yapılsın mı" onayı.

---

## 3. Düzelenler / yanlış alarm çıkanlar
- **DB-ITEM-06 (d):** büyük ölçüde yanlış alarm — tarayıcı client'ı için karşılığı 40/43 var (yukarıda).
- **DB-DROP-02 (b2):** 19 sayısı doğru ama 2'si kapalı bölgede; "ORTA" abartılı, 17 için doğru.
- **DB-ITEM-02 (a):** YUKSEK abartılı; 12 kaydın 9'unda yalnız ad farkı ya da ikinci satır zaten yüklenmeyen kopya. Gerçek stat sorunu 4 staff çiftinde (8 satır).
- **DB-ITEM-04 (c):** 284 değil 14 benzersiz ad; çoğu tek ailenin tekrarı.
- **Düşme oranları:** (b1) satırlarında oran çoğunlukla %0,01; etki tarayıcı raporunda ima edilenden çok küçük.

## 4. Temiz geçenler (bu görevde yeniden üretilenler)
- DB-ITEM-01: 3 boş NULL satır (ITEM 105.018 satırda; toplam − Num'lu = 3).
- DB-ITEM-11: 4 birebir aynı satır doğrulandı (810961000, 810963000, 810965000, 814042737).
- DB-DROP-03: 44 satır birebir sayıldı (8888, Npc.cpp:6246).
- MAKE_ITEM_GROUP: 239 grup; boş (200 alanın hepsi 0) olan 4 grup hiçbir ganimet satırınca kullanılmıyor.
- Aurora (K_NPC 29990, grup 999000): `K_NPCPOS1098` içinde bölge 21, 1, 2'de 1'er adet.

## 5. Bakılmayanlar
- Oyuncu envanterinde/hesaplarında eski Num'lu eşya olup olmadığı (staff Num değişikliği riski). Veritabanında eşyalar ikili (binary) alanda saklanıyor; bakmadım. admin226 hesabına dokunulmadı.
- Sunucunun yükseltme (+N → +N+1) kuralı: `Num + 1` mi, başka mı? Aradım, `ItemUpgradeSystem.cpp`'de net satır bulamadım; staff'ların nasıl elde edildiği **doğrulanmadı**.
- Quest mobların (7018-7022) görev betikleriyle eşya verip vermediği (Lua/görev tabloları kapsam dışı).
- `?` içeren adların orijinal (doğru) İngilizce halleri; benim önerdiklerim eşya ailesi ve client tablosundan çıkarım. Kesin kaynak yok.
- Hangi bölgelerin oyuncuya tarayıcıda açık olduğu: `haritalar.ts` yalnız 4 harita (14th_oldmoradon, karus2004, elmo2004, moradon) tanımlı, hepsi `canavar: false`; bu yüzden 'oyunda erişilebilir' yargısı sunucu tarafında (Status 1 bölgeler) verildi.
- Sunucu çalışırken gerçekten hangi satırın yüklendiği (yalnız heap sırasından çıkarım).

## 6. Ek gözlem (kapsam dışı, doğrulanmadı; araçta kontrol yok)
Tek seferlik betikle baktım: DB'de uzantısı (Extension) 45-62 olan 18 eşya var ve client'ta `Item_Ext_45…62` tablosu yok; ayrıca **290 eşyanın** uzantı satırı client tablosunda yok (ör. 1110564721 `Sarenga (+1)` uzantı 9 satır 721; `<selfname>'s Adaga` uzantı 12). Bu eşyaların "+N" etkisini/adını client'ın nasıl çözdüğünü doğrulamadım; önem belirsiz. İsterseniz araçta yeni bir kontrol olarak eklenebilir.

## 7. Önerilen sonraki adım
1. **Staff Num hatası (a1/a2/a3):** tek gerçek veri hatası; karar sizde. Öneri: önce envanterde eski Num var mı bakılsın, sonra yedekli yeniden numaralandırma.
2. **Adlardaki "?" (c):** 276 satırlık güvenli otomatik düzeltme + `tum.json`'daki 17 görünür adın düzeltme listesi; belirsiz ~8 ad için karar.
3. **Araç düzeltmeleri:** DB-ITEM-06'yı `tum.json`'a karşı çalıştır; "haritada duran" tanımını açık bölgeye daralt (DROP-02/03); DB-ITEM-02 önemini ORTA'ya indir. (araclar/ kaynak kodu, onayınızla.) Ganimet kararlarını (8888, 19 mob) bu üçüncü adımdan sonra almak daha temiz olur.
