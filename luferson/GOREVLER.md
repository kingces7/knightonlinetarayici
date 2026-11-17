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

## Biten görevler
(henüz yok)
