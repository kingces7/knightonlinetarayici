# Dosya formatları — durum listesi

Hedef: oyunun okunamayan **bütün** dosyalarını okunabilir ve düzenlenebilir hale getirmek
(her biri için "çöz" ve "geri yaz" aracı, kayıpsız gidiş-dönüş testi ile).

Sayılar `KnightEmpire/` client klasöründen (2026-11-14).

| Durum | Anlamı |
|---|---|
| ✅ | Çözüldü: okunuyor + düzenlenip geri yazılabiliyor, testli |
| 🟡 | Kısmen biliniyor / kaynak kodda ipucu var |
| ⬜ | Henüz başlanmadı |
| ➖ | Zaten açık format, çözmeye gerek yok |

## Öncelik sırası ve durum

| # | Tür | Adet | Ne olduğu | Durum | Belge |
|---|---|---|---|---|---|
| 1 | `.tbl` | 246 | Oyun tabloları (item, skill, NPC, zone…) | ✅ 244/246 | [tbl.md](tbl.md) |
| 2 | `.hdr` + `.src` | 3 çift | **Paket arşivleri**: `UI/ui`, `Item/item`, `Object/object` — arayüz, eşya ve nesne modellerinin çoğu bunların içinde | ⬜ | |
| 3 | `.dxt` | 838 | Dokular (DXT1/3/5 + kendi başlığı) → PNG | 🟡 `N3Texture.cpp` var | |
| 4 | `.uif` / `.lilith` | 1 / 201 | Arayüz pencere tanımları; `.lilith` bu sunucuya özel şifreli sürüm (anahtar `xCODE/uif.ini`'de) | 🟡 | |
| 5 | `.n3pmesh`, `.n3shape`, `.n3vmesh` | ~120 | Statik modeller → glTF | ⬜ | |
| 6 | `.n3chr`, `.n3cpart`, `.n3cskins`, `.n3cplug`, `.n3joint`, `.n3anim` | ~1700 | Karakterler, parçalar, iskelet, animasyon → glTF | ⬜ | |
| 7 | `.gtd`, `.gtt`, `.tct`, `.tlt`, `.glo`, `.gmd`, `.gev`, `.gfo`, `.ens`, `.flag`, `.brd` | ~1700 | Harita/arazi verisi | ⬜ | |
| 8 | `.opd`, `.opdext`, `.opdsub`, `.evt`, `.evtsub` | ~200 | Haritadaki nesne ve olay listeleri | ⬜ | |
| 9 | `.n3scene`, `.n3scenex`, `.n3camera`, `.n3light`, `.n3sky`, `.n3fxplug`, `.fx` | ~440 | Sahne, kamera, ışık, gökyüzü, efektler | ⬜ | |
| 10 | `.mob` | 36 | Harita başına yaratık yerleşimi (server tarafında da var) | ⬜ | |
| 11 | `.navimesh`, `.rvr`, `.wap`, `.wal`, `.tsd`, `.trn`, `.tld`, `.tcm`, `.sdt`, `.pvr`, `.grs`, `.tgx`, `.swal`, `.dtx`, `.mcn`, `.gea`, `.n3m`, `.n3pp`, `.n3me_lightmap` | az sayıda | Çeşitli harita/editör dosyaları | ⬜ | |
| – | `.ogg`, `.png`, `.bmp`, `.tga`, `.ttf`, `.swf`, `.ini`, `.lst` | ~560 | Ses, resim, yazı tipi, ayar | ➖ | |

Server tarafındaki formatlar (`.smd` harita dosyaları, Lua script'leri, veritabanı) ayrıca ele alınacak.
