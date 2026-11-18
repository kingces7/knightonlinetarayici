# Knight Online Bug Çözücü Ajanı — Görev Talimatı

## 📋 Genel Amaç
Knight Online oyunundaki tüm veri dosyalarını sistematik olarak incelemek, çarpık/eksik/tutarsız verileri tespit etmek, yapılan testleri belgeleyen kapsamlı bir bug raporu oluşturmak.

---

## 🎯 Ajanın Yetenekleri (Zorunlu)

### 1. **Dosya Erişim & İnceleme**
- ✓ Tüm JSON/CSV/binary dosyaları okuyabilmek
- ✓ Klasör yapısını anlayabilmek
- ✓ 100+ dosya içinde arama yapabilmek
- ✓ Encoding sorunlarını tespit edebilmek (UTF-8, Korece vs)

### 2. **Veri Doğrulama**
- ✓ Referans integriteleri kontrol (ör. npc.sid → item tablosundaki sid)
- ✓ Aralık kontrol (ör. level 1-99, koordinatlar harita sınırları içinde)
- ✓ Türü kontrol (string vs number, boolean vs integer)
- ✓ Zorunlu alanları kontrol (null/undefined/boş)

### 3. **Mantık Testleri**
- ✓ Fiyat tutarlılığı (item fiyatı > 0, item satış fiyatı >= fiyat)
- ✓ Level sınırları (NPC level <= 99, canavar level 1-99)
- ✓ Stat tutarlılığı (toplam stat makul mı)
- ✓ Skill level gereksinimleri (prerequisite checks)

### 4. **Raporlama & Dokümantasyon**
- ✓ Hata kategorilerine göre gruplandırma
- ✓ Her hatanın kaynağını, satır numarasını, önerilen çözümünü yazmak
- ✓ İstatistik ve özet oluşturmak
- ✓ HTML/JSON çıkış üretmek

---

## 📂 İncelenecek Veri Dosyaları

### **1. Harita Verileri** (`donusturulmus/web/harita/*/`)
```
Haritalar: moradon, 14th_oldmoradon, karus2004, elmo2004, moradon_xmas

Her harita için:
├─ arazi.json (arazi yapı tanımı)
├─ sunucu.json (kapılar)
├─ canavar.json (canavar yerleşimleri)
├─ npc.json (NPC'ler)
├─ gokyuzu.json (gök kubbe)
└─ dosya bütünlüğü (arazi.bin, renk.bin, karolar.png vs)
```

**Kontrol Listesi:**
- [ ] Her harita için gereken dosyalar var mı?
- [ ] Kapı koordinatları harita sınırları içinde mi?
- [ ] Kapı bolge numaraları valid mi (21, 1, 2, 30, 71, 72, 73, 105 vb)?
- [ ] Canavar ve NPC koordinatları harita sınırları içinde mi?
- [ ] Dil encoding sorunu var mı (Korece, Çince, special chars)?
- [ ] JSON format valid mi (trailing comma, quotes vs)?

### **2. Tablo Verileri** (`donusturulmus/tablolar/Data/`)

#### **Item Tabloları** (`Item_Ext_*.json`)
```
Kontrol:
- [ ] Her item için sid unique mı?
- [ ] Item adı boş mu?
- [ ] Price > 0 mı?
- [ ] ItemClass (0-37) valid aralıkta mı?
- [ ] ItemType geçerli mi?
- [ ] RequiredLevel 1-99 aralığında mı?
- [ ] Rarity (0-6) valid mi?
- [ ] SetItemNum cross-reference valid mi?
```

#### **NPC/Mob Tabloları** (`Monster.json`, `NPC.json`)
```
Kontrol:
- [ ] Her NPC/mob için ID unique mı?
- [ ] Adı boş değil mi?
- [ ] Level 1-99 aralığında mı?
- [ ] HP/MP > 0 mı?
- [ ] Attack/Defense gerçekçi mi?
- [ ] Experience düzeye göre uygun mu?
- [ ] Drop item ID'leri item tablosunda var mı?
```

#### **Skill Tabloları** (`Skill_*.json`)
```
Kontrol:
- [ ] Her skill için ID unique mı?
- [ ] Skill adı geçerli mi?
- [ ] RequiredLevel valid aralıkta mı?
- [ ] RequiredPoint (SP) >= 0 mı?
- [ ] Cooldown, Mana, Stamina mantıklı mı?
- [ ] Prerequisite skillId tablosunda var mı?
```

#### **Quest Tabloları** (`Quest_*.json`)
```
Kontrol:
- [ ] Quest ID unique mı?
- [ ] NPC ID quest tablosunda var mı?
- [ ] RequiredLevel valid aralıkta mı?
- [ ] Reward item ID'leri var mı?
- [ ] Reward experience gerçekçi mi?
```

### **3. Yapılandırma Dosyaları**
- [ ] `client/src/oyun/haritalar.ts` — tüm haritalar tanımlı mı?
- [ ] `BOLGE_HARITASI` mapping tam mı?
- [ ] `baslangic` ve `sehir` koordinatları valid mi?

---

## 🔍 Bug Kategorileri

### **A. Veri Tutarlılığı (Data Integrity)**
- Referans hataları (orphaned records)
- Duplicate ID'ler
- Null/undefined zorunlu alanlar
- Tür uyuşmazlıkları

### **B. Aralık Hataları (Range Errors)**
- Koordinatlar harita sınırları dışında
- Level > 99 veya < 1
- Negatif değerler (HP, MP, price)
- Fiyat tutarsızlıkları

### **C. Encoding/Format Hataları**
- Korece/Çince karakterler İngilizce yazıda
- JSON parsing error
- BOM karakterleri
- Special character escape problems

### **D. Eksik Veriler (Missing Data)**
- Dosyalar yok
- Gerekli alanlar boş
- Cross-reference broken (item → skill → quest)

### **E. Mantık Hataları (Logic Errors)**
- Level sınırları uyuşmazlığı (quest level > item level)
- Stat tutarsızlığı (defense > attack)
- Skill prerequisite broken chain
- NPC spawn alanı (alan < 0)

### **F. İstatistiksel Anomaliler (Anomalies)**
- Çok yüksek/düşük fiyat
- Aşırı yüksek stat (defense > 999)
- Unrealistic experience reward
- Ölü NPC ID aralıkları

---

## 📊 Test Senaryoları

### **1. Harita Bütünlüğü Testi**
```
FOR EACH harita IN [moradon, 14th_oldmoradon, karus2004, elmo2004, moradon_xmas]:
  - Dosya sayısını kontrol et
  - JSON format valid mi?
  - Kapı koordinatları valid mi?
  - Canavar/NPC yoğunluğu makul mu?
  - Dil encoding sorun yok mu?
  REPORT: Harita detaylı durumu
```

### **2. Item Cross-Reference Testi**
```
FOR EACH item IN Item_Ext_*.json:
  - SetItemNum referanslı item var mı?
  - RequiredClass valid class ID mi?
  - RequiredJob geçerli mi?
  - Price range (100-9999999) makul mı?
  REPORT: Orphaned item, duplicate ID, encoding error
```

### **3. Quest Chain Testi**
```
FOR EACH quest IN Quest_*.json:
  - NPC ID npc.json'da var mı?
  - RequiredLevel çeşitli mi (1-99 range)?
  - Reward item ID'leri var mı?
  - Quest difficulty uygun mu?
  REPORT: Broken chain, missing NPC, unrealistic reward
```

### **4. Skill Tree Testi**
```
FOR EACH skill IN Skill_*.json:
  - Prerequisite skill var mı?
  - Level progression uygun mu?
  - Mana/Stamina cost sabit mi?
  - RequiredClass valid mi?
  REPORT: Broken tree, circular dependency
```

### **5. NPC/Mob Nitelikleri Testi**
```
FOR EACH npc/mob:
  - Level vs Experience reward uygun mu?
  - Defense vs Attack ratio makul mu?
  - Drop item rarity uygun mu?
  - Stat distribution logical mi?
  REPORT: Overpowered, Underpowered, Broken drop
```

---

## 📋 Rapor Şablonu

```markdown
# Knight Online Veri Bütünlüğü Raporu

## 📊 Genel İstatistikler
- Toplam Item: X
- Toplam NPC/Mob: X
- Toplam Skill: X
- Toplam Quest: X
- Harita Sayısı: 5
- **Toplam Hata: N**
- **Kritik Hata: N**
- **Uyarı: N**

## 🚨 Kritik Hatalar (Acil Çözüm Gerekli)
### Kategori: Harita
- ...
- ...

### Kategori: Item
- ...

## ⚠️ Yüksek Öncelikli Uyarılar
- ...

## 📝 Detaylı Bulgu Tablosu
| Dosya | Satır | Hata Tipi | Açıklama | Çözüm |
|-------|-------|-----------|----------|--------|
| ... | ... | ... | ... | ... |

## 🧪 Test Sonuçları
- [x] Harita Bütünlüğü
- [x] Item Cross-Reference
- [x] Quest Chain
- [x] Skill Tree
- [x] NPC Nitelikleri

## ✅ Öneriler
1. ...
2. ...
```

---

## 🛠️ İşlem Adımları

1. **Başlama** — Tüm dosyaları tarayıp ön kontrol yap
2. **İnceleme** — Kategori başına sistematik test çalıştır
3. **Doğrulama** — Her hatayı 2x kontrol et
4. **Raporlama** — Bulguları kategorize et ve şablon doldur
5. **Çıkış** — HTML/JSON rapor ve öneriler

---

## 🔗 Dosya Konumları
```
Harita verileri:      donusturulmus/web/harita/*/
Tablo verileri:       donusturulmus/tablolar/Data/
Konfigürasyon:        client/src/oyun/
Oyun dosyaları:       oyun-dosyalari/
```

---

## ⏱️ Beklenen Çıkış
- **Rapor Türü:** HTML (interaktif) + JSON (makine okuması)
- **Hata Sayısı:** >10 bekleniyor (kurulum aşamasında normal)
- **Zaman Tahmini:** 20-30 dakika (tüm dosyalar)
- **Çıkış Yolu:** `docs/BUG_RAPORU_TAMAMLI.html` + `.json`

---

## ✅ Rapor Oluşturma Tamamlandı

### 🎯 Sonuç Özeti (2026-11-18)

**Toplam Hatalar:** 8 (Kritik: 0, Yüksek: 7, Düşük: 1)

**Veri İstatistikleri:**
- NPC: 1,685
- Skill: 5,880
- Quest: 13,522
- Harita: 5
- İncelenen dosyalar: 37
- Eksik dosyalar: 6
- Encoding sorunları: 0
- Referans hataları: 1

**Ana Bulguların:**
1. **moradon haritası:** canavar.json ve npc.json eksik (2 hata)
2. **moradon_xmas haritası:** sunucu.json, canavar.json, npc.json, gokyuzu.json eksik (4 hata)
3. **Item verileri:** 5,768 item SID eksik/boş (1 hata)
4. **Konfigürasyon:** moradon_xmas haritası konfigürasyonda tanımlanmadı (1 hata)

---

## 📌 Notlar
- Bug çözücü **sadece rapor oluşturur**, dosya düzeltmez
- Her hata için "nasıl çözeceğin" söyle ama değiştirme
- Korece/Türkçe karakterleri hedef al (encoding sorunu yaygın)
- Eksik dosyaları vurgula — müdür de onları çıkartacak
- Rapor dosyaları: `docs/BUG_RAPORU_TAMAMLI.html` ve `docs/BUG_RAPORU.json`
