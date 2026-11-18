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

## Biten görevler
(henüz yok)
