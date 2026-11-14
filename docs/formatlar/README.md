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
| 2 | `.hdr` + `.src` | 4 çift | **Paket arşivleri**: `UI/ui`, `Item/item`, `Object/object`, `fx/fx` | ✅ | [model.md](model.md) |
| 3 | `.dxt` / `.gtt` / `.tct` | 16.814 + 1.096 + 59 | Dokular → PNG (sürüm 7 şifreli olanlar dahil: RC4, 588 dosya) | ✅ | [model.md](model.md) |
| 4 | `.uif` / `.lilith` | 1 / 187 | Arayüz pencere tanımları; `.lilith` = şifreli UIF (RC4, 31/32 baytlık bloklar) | ✅ 185/187 | [uif.md](uif.md) |
| 5 | `.n3pmesh`, `.n3shape` | ~11.700 | Statik modeller → glTF | ✅ | [model.md](model.md) |
| 6 | `.n3joint`, `.n3cskins`, `.n3cpart`, `.n3anim` (+ `.n3chr` ✅ okunuyor, `.n3cplug` ⬜) | ~8.000 | Karakterler, iskelet, animasyon → glTF | ✅ | [model.md](model.md) |
| 7 | `.gtd` ✅ · `.tct` ✅ (renk haritası, haritaya yerleşimi ölçülerek bulundu), `.tlt`, `.glo`, `.gmd`, `.gev`, `.gfo`, `.ens`, `.flag`, `.brd` ⬜ | ~600 | Harita/arazi verisi | 🟡 | [model.md](model.md) |
| 8 | `.opd` ✅ · `.opdext`, `.opdsub`, `.evt`, `.evtsub` ⬜ | ~200 | Haritadaki nesne ve olay listeleri | 🟡 | [model.md](model.md) |
| 9 | `.n3scene`, `.n3scenex`, `.n3camera`, `.n3light`, `.n3sky`, `.n3fxplug`, `.fx` | ~440 | Sahne, kamera, ışık, gökyüzü, efektler | ⬜ | |
| 10 | `.mob` | 36 | Harita başına yüklenecek NPC/yaratık **numara listesi** (`21.mob`: 141 adet int32; konum içermez — konumlar veritabanında `K_NPCPOS1098`) | 🟡 | |
| 11 | `.navimesh`, `.rvr`, `.wap`, `.wal`, `.tsd`, `.trn`, `.tld`, `.tcm`, `.sdt`, `.pvr`, `.grs`, `.tgx`, `.swal`, `.dtx`, `.mcn`, `.gea`, `.n3m`, `.n3pp`, `.n3me_lightmap` | az sayıda | Çeşitli harita/editör dosyaları | ⬜ | |
| – | `.ogg`, `.png`, `.bmp`, `.tga`, `.ttf`, `.swf`, `.ini`, `.lst` | ~560 | Ses, resim, yazı tipi, ayar | ➖ | |

Server tarafındaki formatlar: `.smd` harita dosyası ✅ okunuyor (yükseklik, çarpışma üçgenleri, kapılar, olaylar) → [smd.md](smd.md). Lua script'leri ve veritabanı ayrıca ele alınacak.
