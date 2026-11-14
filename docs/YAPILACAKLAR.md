# KnightEmpire — Yapılacaklar Listesi

Son güncelleme: 2026-11-14 · Biten işler `[x]` ile işaretlenir. Görmek için: dosyaya sağ tık → **Open Preview** (Ctrl+Shift+V).

---

## 🟢 Şu an sıradaki

- [ ] **Paket arşivleri (`.hdr` + `.src`) çözücüsü** — `UI/ui`, `Item/item`, `Object/object`. Arayüz, eşya ve nesne modellerinin çoğu bunların içinde.
- [ ] **Doku (`.dxt`) → PNG** çevirici ve geri yazıcı (ipucu: `N3Texture.cpp` elimizde).

## 📦 Dosya formatlarını çözme (tam kontrol hedefi)

Ayrıntılı durum: [formatlar/README.md](formatlar/README.md)

- [x] `.tbl` oyun tabloları → CSV/JSON ve geri (244/246, bayt bayt kayıpsız)
- [ ] `.hdr` + `.src` paket arşivleri
- [ ] `.dxt` dokular
- [ ] `.uif` / `.lilith` arayüz dosyaları (`.lilith` şifre anahtarı `xCODE/uif.ini` içinde)
- [ ] `.n3pmesh`, `.n3shape`, `.n3vmesh` statik modeller → glTF
- [ ] `.n3chr`, `.n3cpart`, `.n3cskins`, `.n3cplug`, `.n3joint`, `.n3anim` karakterler ve animasyonlar → glTF
- [ ] `.gtd`, `.gtt`, `.tct`, `.tlt`, `.glo`, `.gmd`, `.gev`, `.gfo`, `.ens`, `.flag`, `.brd` harita / arazi
- [ ] `.opd`, `.opdext`, `.opdsub`, `.evt`, `.evtsub` harita nesneleri ve olayları
- [ ] `.n3scene`, `.n3camera`, `.n3light`, `.n3sky`, `.n3fxplug`, `.fx` sahne, ışık, gökyüzü, efektler
- [ ] `.mob` yaratık yerleşimleri
- [ ] Diğer küçük harita dosyaları (`.navimesh`, `.rvr`, `.wap`, `.wal`, `.tsd`, `.trn`, `.tld`, `.tcm`, `.sdt`, `.pvr`, `.grs`, `.tgx`, `.swal`, `.dtx`, `.mcn`, `.gea`, `.n3m`, `.n3pp`, `.n3me_lightmap`)
- [ ] Server tarafı formatlar: `.smd` harita dosyaları, Lua script'leri

## 🔍 Sonra dönüp bakılacaklar (açık sorular)

**Tablolar**
- [ ] `Data/modify_us.tbl` hiçbir bilinen yöntemle açılmıyor — sunucuya özel şifre olabilir. Oyunun bu dosyayı kullanıp kullanmadığı da kontrol edilecek.
- [ ] Çift şifreli tabloların başındaki **5 baytlık önekin** anlamı bilinmiyor (şimdilik aynen korunuyor).
- [ ] CSV başlıklarında sadece sütun türü var (`1:DWORD`…). **Gerçek sütun adları** (ör. "Ad", "Fiyat", "Hasar") kaynak koddaki yapılardan (`GameDef.h` → `TABLE_ITEM_BASIC` vb.) çıkarılıp eklenecek.
- [ ] `Item_Org_us.tbl` içinde **tekrar eden ID'ler** var (261001000, 261002000… — oyun sadece ilkini kullanıyor). İncelenecek.
- [ ] Tablolardaki **Korece iç adlar** anlamsız karakterler olarak görünüyor. Zararsız (baytlar korunuyor); istenirse ayrı bir "Korece göster" seçeneği eklenebilir.
- [ ] Oyunun hangi tabloyu okuduğu netleştirilecek: `_us` olmayan 82 tablonun hangileri İngilizce sürümü olmadığı için doğrudan kullanılıyor.
- [ ] `Slander_us.tbl` boş (0 bayt) — oyunun buna ihtiyacı var mı?
- [ ] Edit CSV eklentisi çok büyük tablolarda yavaşlarsa alternatif düzenleyici (ör. tarayıcıda kendi tablo editörümüz) düşünülecek.

**Server ve veritabanı**
- [ ] **SQL Server 2022 kurulumu** (veritabanı yedeği 2022 ile alınmış; server'ı çalıştırmak için gerekli).
- [ ] `LILITH_MYKO.bak` geri yüklenince `VERSION` tablosundaki **2401 / 2450** kayıtlarının gerçek olup olmadığı kontrol edilecek.
- [ ] `LILITH_LOG.bak` içeriği incelenecek (sadece kayıt/log veritabanı mı?).
- [ ] Veritabanındaki eşya / NPC / görev adlarının dili kontrol edilecek — **oyun İngilizce** olacak.
- [ ] Server'daki görünen adlar (**MykoNetwork → KnightEmpire**) server kurulurken güncellenecek (kullanıcıya sorularak).
- [ ] `LogInServer.ini` içindeki eski yama/indirme adresi ve client `Server.ini` içindeki eski sunucu adresi (`lilith-acs.diabloko.com`) değiştirilecek.
- [ ] Server'ın **anti-cheat** (LilithACS / Pearl Guard) bekleyip beklemediği kontrol edilecek. Tarayıcı client'ında bu program olmayacak; server tarafında kapatılması gerekebilir.

**Araçlar ve depo**
- [ ] TypeScript **tür denetimi** (`tsc`) eklenecek; şu an Node.js kodu denetimsiz çalıştırıyor.
- [ ] Git satır sonu uyarıları (LF/CRLF) için `.gitattributes` eklenecek.
- [ ] `KnightOnline.exe` bir koruma yazılımıyla paketlenmiş; içinden bilgi gerekirse (ör. şifre anahtarı) çalışma anında inceleme gerekebilir.

## 🙋 Kararı sizde olanlar

- [ ] `knight online ham proje.rar` (8,3 GB) silinsin mi? İçinde her şeyin (Homeko dahil) yedeği var. Şimdilik **tutuluyor**.
- [ ] Server sahibinin değiştirdiği oyun içi adlar (MykoNetwork vb.) yerine ne yazılacak?

## 🗺️ Yol haritası (CLAUDE.md)

- [x] Aşama 0 — Keşif
- [x] Aşama 1 — Tablolar
- [ ] Aşama 2 — Harita ve model okuyucuları, glTF çıktısı
- [ ] Aşama 3 — İlk görüntü: tarayıcıda harita + yürüyen karakter + kamera
- [ ] Aşama 4 — Sunucu bağlantısı: WebSocket köprüsü, şifreleme, login, karakter seçimi
- [ ] Aşama 5 — Oyun sistemleri: oyuncular, mob'lar, chat, envanter, savaş, skill'ler

---

## ✅ Tamamlananlar

- [x] Keşif raporu ([KESIF.md](KESIF.md))
- [x] Myko seçildi, Homeko dosyaları silindi
- [x] Client klasörü `KnightEmpire` olarak adlandırıldı
- [x] Node.js kuruldu
- [x] `.tbl` şifresi çözüldü (USKO çift şifre + iki XOR çeşidi) — [formatlar/tbl.md](formatlar/tbl.md)
- [x] Tablolar CSV olarak VS Code'da düzenlenebilir (Edit CSV eklentisi kuruldu)
- [x] Oyun dili İngilizce kararı: `_us` tabloları kullanılıyor
