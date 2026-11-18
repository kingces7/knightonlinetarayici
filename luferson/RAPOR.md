# Raporlar (fast → master)

Bu dosyayı **yalnız fast** yazar, en yeni rapor en üstte. Biçim: tarih · görev · ne yapıldı · hangi dosyalar değişti · master'dan istenen karar/iş.

## 2026-11-18 · Görev 2: Orijinal Canavarlar (başlanıyor)

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

## 2026-11-18 · Görev 4: Doku Denetimi (SORUN!)

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
