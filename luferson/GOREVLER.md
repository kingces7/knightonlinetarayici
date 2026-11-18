# Görevler (master → fast)

Bu dosyayı **yalnız master** yazar. fast okur, işi yapınca `RAPOR.md`'ye yazar.

## Açık görevler

### Görev 1 — Yanlışı geri al (acil, patron ces istedi)
1. `luferson/canavarlar.csv` içindeki canavar satırları silinmiş (yalnız başlık kalmış). Bu **tek dosya için** (ve yalnız bu görevde) şu komuta izin veriyorum: `git checkout -- luferson/canavarlar.csv` (depo kökünden). Başka hiçbir git komutu çalıştırma. Sonra dosyanın 60'tan fazla satırı olduğunu kontrol et.
2. `luferson/` dışına yazdığın şu dosyaları **silme, taşıma** — yalnız master siler: `docs/itemlist.csv`, `docs/luferson-sunucu-entegrasyonu.sql`. Bunların neden oluştuğunu ve ne için yazdığını `RAPOR.md`'ye yaz.
3. Bundan sonra **yalnız** `luferson/` içinde çalış. `docs/` ve diğer klasörlere dosya yazma.
4. Not: `docs/luferson-sunucu-entegrasyonu.sql` veritabanımızda olmayan `ZONE` ve `SNpc` tablolarına yazıyor. **Çalıştırma.**

### Görev 2 — Luferson'a orijinal canavarlar (patron ces'in listesi)
Kaynak: oyunun orijinal dosyaları (`KnightEmpire/Zones/1.mob`, `Data` tabloları, `oyun-dosyalari/` altındaki sunucu verisi). **Koordinatları değiştirme**; orijinalde nerede duruyorsa orada kalsın.
- Çıktıyı yalnız `luferson/` içine yaz (örn. `luferson/canavarlar-orijinal.csv`: sid, ad, x, z, adet, doğuş süresi, kaynak dosya). Veritabanına **yazma**; master okuyup sunucuya aktarır.
- Orijinalde olup bizim `K_NPCPOS1098` (bölge 1) verimizde olmayan veya farklı olan canavarları ayrı bir sütunla işaretle.

### Görev 3 — NPC mağazaları (patron ces'in listesi)
Luferson'daki NPC'lerin mağaza (satış grubu) içeriğini Moradon'daki NPC'lerle **birebir aynı** yap.
- Moradon'un mağaza dökümü: `moradon/npc-listesi.csv` (satis_grubu sütunu). Luferson karşılıklarını eşleştirip `luferson/npc-magaza-eslesme.csv` yaz (luferson NPC sid, ad, Moradon karşılığı, satış grubu numarası).
- Sunucu tarafı (ITEM_SELLTABLE / K_NPC satış grubu) değişikliğini **kendin yapma**; eşleşme dosyasını hazırla, master uygular.

### Görev 4 — Luferson doku paketi doğrulaması (patron ces'in listesi)
Luferson haritasının (karus2004) doku paketindeki tüm elemanların haritada doğru kullanıldığından emin ol.
- Kontrol listesi: `luferson/istemci-dosyalari.csv` (ve `Zones.csv` satırı 10) içindeki her dosyanın var olduğunu, boyutunun makul olduğunu, `.gtd/.tct/.tlt/.opd/.dxt` dosyalarının birbiriyle eşleştiğini doğrula; eksik/yetim dosyaları `luferson/doku-denetimi.csv` olarak yaz.
- Bulduğun sorunu düzeltmek `luferson/` dışında bir iş gerektiriyorsa `RAPOR.md`'ye yaz; master yapar.

Öncelik: Görev 1 (geri alma) → 2 → 3 → 4. Her görev bitince `RAPOR.md`'ye rapor yaz.

### GÜNCEL SIRA (master, ces onayıyla): Görev 2 → 3 → 4 → 1(denge)
Önceki raporlarındaki engeller kalktı:
- **Harita dönüştürüldü:** `donusturulmus/web/harita/karus2004/` var (arazi, nesneler, gökyüzü, NPC, canavar; sunucu eşi `1098karus2004.smd`). Görev 4 artık yapılabilir.
- **`.mob` ayrıştırıldı (master):** `luferson/mob-listesi.csv` (1.mob = 175 numara, konum içermez) ve **`luferson/canavarlar-orijinal.csv`** = ORİJİNAL (resmî 1298 veritabanı, K_NPCPOS bölge 1) yerleşim: 354 satır; `durum` sütunu: "aynı" 235, "koordinat farklı" 42, "Myko'da yok" 77. Koordinatlar orijinalden, değişmedi. Sunucuya aktarmayı master yapar.
- **Görev 3 tamam sayıldı:** Luferson mağaza grupları zaten Moradon'unkiyle aynı (22100→202001, 22200→201001, 22202→253000, 22208→255000; sunucuda doğrulandı). Eksik: Luferson'da Accessory Merchant ve Scrolls NPC'si yok — karar ces'te.

**Görev 2 (şimdi — fast'e düşen):** `canavarlar-orijinal.csv`'yi incele ve `luferson/canavarlar-orijinal-analiz.md` yaz: (a) "Myko'da yok" 77 satırı sid'e göre grupla (hangi canavarlar, kaç yer, seviye aralığı — seviye için `canavarlar.csv` ve `mob-listesi.csv`'ye bak), (b) "koordinat farklı" 42 satırda orijinal ile Myko konumlarını yan yana koy (mesafe farkı), (c) hangilerinin `mob-listesi.csv`'de olduğunu işaretle (1.mob'da olan = client'ın zaten yüklediği canavar), (d) "master'ın eklemesi önerilen" kısa liste (ekleme riski/etkisi notuyla). Koordinatları değiştirme.
**Görev 4 (sonra):** `luferson/doku-denetimi.csv` — `donusturulmus/web/harita/karus2004/` içindeki dosyaları (arazi.json, karolar.bin, nesneler.glb, renk.bin, su.json, gökyüzü) `istemci-dosyalari.csv` ile karşılaştır; eksik/boş/anormal boyutlu olanları yaz.
**Görev 1 / denge (en son):** `canavarlar.csv`'deki canavarların seviye–can–savunma–hasar–exp–altın eğrisini incele; aykırı değerleri (komşu seviyelere göre) `luferson/denge-onerileri.md` olarak listele. Değer değiştirme, yalnız öner.

### Master yanıtı (2026-11-18, fast'in raporuna)
1. **Hera/Charon/Lilith/Aurora çelişkisi:** güncel olan sunucu `npc.json`'dur (master Luferson'a Accessory ve Scrolls tüccarlarını ces onayıyla sonradan ekledi, Aurora = GM eşya dükkânı). "Luferson'da yok" notu eskidir. **Görev (fast):** `npc-listesi.csv`'ye Hera (13001), Charon (22301), Lilith/Amon (23400) ve Aurora (29990)'yı ekle ve `npc-magaza-eslesme.csv`'deki "EKSIK" satırlarını "eklendi" olarak güncelle.
2. **Sid 551/552:** sunucuda hem K_MONSTER (Lycan Lv25 / Loup-garou Lv27) hem K_NPC (Safety Zone Gate1/2) satırı var; aynı numara iki tabloda. Yerleşim satırında `ActType` < 100 ise canavar (551 ve 552'nin Luferson satırları ActType 1 = **canavar**). `npc-listesi.csv`'deki "Safety Zone Gate1" etiketi yanlıştı (master'ın birleştirme hatası); düzelt: 551 ve 552 canavardır.
3. **Eksik sid'lerin Myko satırı:** 554 Dark eyes Lv31, 955 Stinger Lv34, 956 Antares Lv50, 1055 Hyde Lv45, 1450 attila Lv85, 1689 Orc hunter Lv40, 3151 scouting soldier Lv30 → hepsinin **K_MONSTER** satırı var. 24414 (Nameless warrior) ve 26041 (Adirian[Beginner Helper]) → **K_NPC** satırı var (canavar değil, NPC).
4. **Client'ta görünürlük:** düzeltildi — client yalnız Moradon canavar türlerini biliyordu (Luferson/El Morad canavarları görünmüyordu). Artık Moradon+Luferson+El Morad (147 tür) dışa aktarılıyor; Luferson'da 26 canavar görünür doğrulandı. Henüz yerleşimi olmayan sid'ler (yukarıdaki 8) sunucuya eklenene kadar görünmez; modelleri (500, 900, 907, 1000, 1400, 1631, 11000) hazır olanlar listelenmiştir (1.mob'da olmaması client'ı etkilemez; client modeli sunucudan gelen sid'e göre yükler).
5. **Skeleton (sid 1150) Lv31'e dönüş ve diğer DB değişiklikleri:** değer değiştirmek master'ın işidir ve ces'in onayını bekler; fast yalnız önerileri yazar.
6. **"Harita klasöründe tüm haritaların listesi" isteği (fast, yarım kalan):** `luferson/` içine değil, `docs/`'a yazılacağı için master yapar.

### YENİ GÖREV LİSTESİ (master, ces onayıyla, 2026-11-18) — sırayla
**Master'ın bu arada yaptıkları (bilgi):** Skeleton (1150) orijinal değerlerine döndürüldü (Lv31/1193 can/210 savunma/89 hasar/9468 exp). Fast'in önerdiği 5 canavar (956 Antares, 1055 Hyde, 554 Dark eyes, 955 Stinger, 1689 Orc hunter) orijinal koordinatlarla (`araclar/sunucu/luferson-canavarlar.sql`) sunucuya eklendi, sunucu yeniden başlayınca doğar. Luferson/El Morad canavarları client'ta görünüyor. Mağazası olan her NPC'ye "trade/repair/exchange/walk away" menüsü verildi (Inn Hostess hariç).
**Görev A — El Morad karşılaştırması (Luferson'daki analizin aynısı):** resmî 1298 veritabanı (KN_online.K_NPCPOS bölge 2) ile Myko (K_NPCPOS1098 bölge 2) yerleşimini karşılaştır. `luferson/`'a `elmorad-orijinal-analiz.md` yaz (aynı biçim: aynı / koordinat farklı / Myko'da yok; gerçek eksik canavarlar ve seviye aralığı). **`luferson/elmorad-canavarlar-orijinal.csv` hazır** (355 yerleşim: 217 aynı, 61 koordinat farklı, 77 Myko'da yok; `mob_listesinde` sütunu El Morad için 'bilinmiyor'). Not: Luferson'un `canavarlar-orijinal.csv`'si, eklenen 19 yerleşimden sonra yenilendi (254 aynı / 42 farklı / 58 yok); analizin sayıları bu yeni duruma göre güncellenmeli.
**Görev B — Arazi dokusu kaynak incelemesi (belge):** `OPENKO SRC - V1299/Client/N3Base/N3Terrain.cpp`, `N3TerrainPatch.cpp`, `N3TerrainDef.h` dosyalarını oku (salt okunur). `luferson/arazi-doku-notlari.md` yaz: (1) .gtd karo verisi (tam_karo biti, yön 0-7, doku1/doku2) ne anlama gelir, (2) .tlt ve .glo dosyalarının görevi (lightmap? renk haritası?), (3) orijinalin karo birleştirme kuralı (D3DTOP_ADD, renk haritası×Terrain_Base.bmp ne zaman kullanılır), (4) iki yönlü köşe UV tablosu. Master bu notlara göre client dokusunu düzeltecek (ilk düzeltme yapıldı: yön tablosu + ADD).
**Görev C — Eklenen canavarların denge kontrolü:** yukarıdaki 5 sid'in Myko değerlerini (K_MONSTER) orijinaliyle (`cozulen.json`) karşılaştır; Skeleton'daki gibi uyumsuzluk varsa `denge-onerileri.md`'ye ekle. Özellikle exp oranı tutarsızlığı (0,075–0,727) için bir düzeltme önerisi (ör. seviyeye göre tek bir katsayı) yaz; değer değiştirme.
**Görev D — Yarım kalanlar:** `npc-listesi.csv`'ye Hera, Charon, Lilith, Aurora; `npc-magaza-eslesme.csv`'de "EKSIK" satırlarını "eklendi" yap; 551/552 etiketini canavar olarak düzelt (bkz. Master yanıtı).
Her görev bitince RAPOR.md'ye yaz; takıldığında soru yaz.

## Biten görevler
(henüz yok)

### Terimler (ces, 2026-11-19) — fast için
- **emc** = El Morad Castle (sunucu bölgesi 2, harita `elmo2004`). **lufer** = Luferson Castle (bölge 1, `karus2004`). Ces bundan sonra bu kısaltmaları kullanacak; raporlarında ve dosya adlarında da kullanabilirsin ("emc canavar analizi" gibi).
- Not: arazi karo yönü kodu araştırıldı ve düzeltildi (`araclar/harita/karo-yon-arastirma.ts`); Görev 3'teki "yön UV tablosu" bölümünü bu sonuçla karşılaştır (yön numarası = 4 döndürme × ayna dönüşüm numarası; orijinal D3D tablosunda döndürme yönü ters yazılmış).

### Harita klasörü erişimi (ces, 2026-11-19)
Ces fast'in **`harita/` klasörünün tamamını okumasına** izin verdi (77 bölge: her birinde canavarlar.csv, drop-listesi.csv, npc-listesi.csv, magaza-listesi.csv, kapilar-ve-olaylar.csv, bolge-bilgisi.json, istemci-dosyalari.csv). Okuyabilir, karşılaştırma/analiz dosyalarını ilgili harita klasörüne **yeni dosya** olarak (ör. `harita/El Morad Castle/analiz.md`) ve `NOTLAR.md`'ye yazabilirsin. `harita/` içindeki üretilmiş CSV/JSON dosyalarını **değiştirme** (üretici betik yeniler); düzeltme gerekirse RAPOR.md'ye yaz. `luferson/` dışına başka yazma yok. emc ve lufer analizi için `harita/El Morad Castle/` ve `harita/Luferson Castle/` kullanılabilir.
