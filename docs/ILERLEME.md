# İlerleme

| Tarih | Aşama | Yapılan |
|---|---|---|
| 2026-11-14 | Kurulum | Depo, CLAUDE.md ve .gitignore oluşturuldu. Sıradaki iş: Aşama 0 — Keşif |
| 2026-11-14 | Aşama 0 — Keşif | Oyun dosyaları tarandı, sonuç `docs/KESIF.md`. Server kaynak kodu (C++) ve veritabanı yedeği var; client kaynak kodu yok. Sıradaki iş: klasör düzeni kararı, sonra Aşama 1 — Tablolar |
| 2026-11-14 | Karar | Myko seçildi, oyun dosyaları yerinde kalıyor, GitHub gönderimi öncesi kullanıcıya haber verilecek. CLAUDE.md güncellendi |
| 2026-11-14 | Temizlik | Homeko dosyaları silindi. Myko client'ı `DiabloKO/` arşivden çıkarıldı ve kullanılacak client oldu |
| 2026-11-14 | Ad | Oyunun adı KnightEmpire olarak belirlendi. Client klasörü `DiabloKO/` → `KnightEmpire/` |
| 2026-11-14 | Aşama 1 — Tablolar ✅ | `.tbl` şifresi tamamen çözüldü (USKO çift şifre: XOR + IP/FP'siz DES; ayrıca iki XOR çeşidi). `araclar/tbl/` aracı: tbl ↔ JSON, 244/246 tablo bayt bayt kayıpsız. Belge: `docs/formatlar/tbl.md`. Tüm formatların listesi: `docs/formatlar/README.md`. Sıradaki: `.hdr/.src` paket arşivleri |
