# `.tbl` — Oyun tabloları

Durum: ✅ **Çözüldü.** Okunuyor, CSV/JSON'a çevriliyor, düzenlenip geri yazılabiliyor.
Araç: [`araclar/tbl/`](../../araclar/tbl/). 246 tablonun 244'ü çöz → CSV/JSON → geri yaz sonrası
orijinaliyle **bayt bayt aynı** (`npm run tbl-dogrula`).

## Nasıl kullanılır

`araclar/` klasöründe:

| Komut | Ne yapar |
|---|---|
| `npm run tbl-coz` | Bütün `.tbl` dosyalarını `donusturulmus/tablolar/` altına **CSV + `.meta.json`** olarak yazar |
| `npm run tbl-coz -- --json` | CSV yerine tek parça JSON üretir |
| `npm run tbl-coz -- Data/Zones.tbl` | Sadece verilen tabloyu çevirir |
| `npm run tbl-yaz -- <tablo.csv \| tablo.json>` | Düzenlenmiş tabloyu `.tbl` yapar → `donusturulmus/tablolar-tbl/` |
| `npm run tbl-dogrula` | Her tabloyu çöz + (JSON ve CSV üzerinden) geri yaz, orijinaliyle karşılaştır |
| `npm test` | Testler |

### Düzenleme (CSV)
1. VS Code'da `donusturulmus/tablolar/Data/…csv` dosyasını açın.
2. Sağ üstteki **"Edit as csv"** düğmesine (veya Ctrl+Shift+P → "Edit as csv") basın; tablo ızgara olarak açılır.
3. Hücreleri değiştirin, satır ekleyin/silin, **Apply and save** ile kaydedin. Sütun eklemeyin/silmeyin.
4. Aynı addaki `.meta.json` dosyasına dokunmayın; geri yazım için gerekli.

İlk satır başlıktır: `1:DWORD,2:STRING,…` (sütun sırası:türü). Ondalık ayracı noktadır.

### Kod sayfası (metinler)
Oyun İngilizce olduğu için tablolar `windows-1252` ile açılır; sadece `_tk`/`_tr` tabloları `windows-1254`
(Türkçe) ile açılır. Seçilen kod sayfası `.meta.json` içine yazılır ve geri yazımda aynısı kullanılır.

Araç orijinal oyun klasörüne (`KnightEmpire/`) **yazmayı reddeder**. Üretilen `.tbl` dosyasını
oyuna koymak bilinçli olarak elle yapılır.

## Şifreleme

Üç çeşit var. Araç imzaya bakarak, imza yoksa iki XOR çeşidini deneyerek otomatik seçer.

### 1. `usko-cift` — çift şifre (235 dosya)
Pentagram TBL editöründe adı: *"Double Encryption (1886 and above) — The encryption used by the USKO"*.

```
0x00  16 bayt  imza: 4C 26 43 7F 80 F1 57 98 79 FC AF 26 86 D6 20 8E
0x10   4 bayt  düz veri uzunluğu (big-endian)
0x14   ...     şifreli veri (8'in katı)
```
Çözme sırası:
1. `0x14`'ten sonrası **DES-ECB** ile çözülür. Anahtar `FE A8 01 97 75 73 97 76`.
   Dikkat: bu DES'te **başlangıç/bitiş permütasyonları (IP/FP) yoktur**; geri kalan her şey standart
   (anahtar takvimi, E, S-kutuları, P). Bu yüzden hazır DES kütüphaneleri doğrudan kullanılamaz.
2. Çıkan veri XOR akış şifresiyle çözülür: `r=0x0418, c1=0x8041, c2=0x1804` (aşağıdaki formül).
3. İlk `uzunluk` bayt tablodur. Sonrası dolgudur ("kuyruk"); birebir geri yazım için saklanır.

Şifreleme bunun tersidir: XOR → 8'e tamamlama → DES → imza + uzunluk.

### 2. `xor-eski` — tek XOR, eski anahtar (3 dosya: `npcs.tbl`, `MON.tbl`, `Texts.tbl`)
`r=0x0816, c1=0x6081, c2=0x1608`. Kaynak: `N3TableBase.h` (`LoadFromFile`).

### 3. `xor-0418` — tek XOR, yeni anahtar (6 dosya, ör. `MOB.tbl`, `DisguiseRing.tbl`)
`r=0x0418, c1=0x8041, c2=0x1804`.

### XOR akış şifresi
```
çözme:    düz[i] = şifreli[i] XOR (r >> 8);   r = (şifreli[i] + r) * c1 + c2   (16 bit)
şifreleme: şifreli[i] = düz[i] XOR (r >> 8);  r = (şifreli[i] + r) * c1 + c2
```

### Nasıl bulundu
- `N3TableBase.h` (anti-cheat kaynağı) eski XOR'u ve tablo yapısını gösterdi.
- `KOTableEditor.exe` (Pentagram TBL editor v1.3, .NET) IL kodu incelendi: `Class22` = çift şifre,
  `Class31::smethod_82/34` = blok DES. 768 baytlık hazır tur anahtarlarından 8 baytlık anahtar geri hesaplandı.
- Doğrulama: editörün kendi çözme fonksiyonu çalıştırılıp çıktısı bizim çıktımızla bayt bayt karşılaştırıldı.

## Tablo yapısı (şifre çözüldükten sonra)

Tüm sayılar little-endian.

```
[önek]           usko-cift tablolarda 5 bayt (int32 + byte; anlamı bilinmiyor, korunur), diğerlerinde yok
int32            sütun sayısı N
int32 × N        sütun türleri (aşağıdaki tablo)
int32            satır sayısı
satırlar         her satırda N değer, türüne göre art arda
```

| Kod | Tür | Boyut | JSON'da |
|---|---|---|---|
| 1 | CHAR | 1 (işaretli) | sayı |
| 2 | BYTE | 1 | sayı |
| 3 | SHORT | 2 (işaretli) | sayı |
| 4 | WORD | 2 | sayı |
| 5 | INT | 4 (işaretli) | sayı |
| 6 | DWORD | 4 | sayı |
| 7 | STRING | int32 uzunluk + bayt | metin |
| 8 | FLOAT | 4 | sayı; NaN/sonsuz/-0 ise `"#f32:XXXXXXXX"` |
| 9 | DOUBLE | 8 | sayı; NaN/sonsuz/-0 ise `"#f64:…"` |
| 10 | INT64 | 8 (işaretli) | sayı; çok büyükse metin `"123…"` |

- 10 (INT64) eski kaynak kodda yok; `Player_experience.tbl`, `Quest_Helper*.tbl`, `SpecialAuction_us.tbl` vb. kullanıyor.
- İlk sütun her zaman satırın kimliğidir (ID, DWORD). Oyun aynı ID'nin sadece ilkini kullanır.
  (Not: orijinal `Item_Org_us.tbl` içinde de tekrar eden birkaç ID var.)
- Metinler tek baytlık kod sayfasıyla yazılır. Varsayılan `windows-1252` (İngilizce), `_tk`/`_tr` için `windows-1254`. Her bayt bir karaktere
  karşılık geldiği için hiçbir bilgi kaybolmaz. Eski Korece metinler (EUC-KR) bozuk görünür ama aynen geri yazılır.

## JSON dosyası

```json
{
  "_aciklama": "…",
  "bicimSurumu": 1,
  "kaynak": "Data/ACHIEVE_com.tbl",
  "sifreleme": "usko-cift",
  "kodSayfasi": "windows-1252",
  "onek": "a54e000707",
  "sutunTurleri": ["DWORD", "BYTE", "INT", "INT"],
  "satirSayisi": 68,
  "artik": "",
  "kuyruk": "…",
  "satirlar": [
    [1, 2, 3, 4],
    …
  ]
}
```
Düzenlenebilir alanlar: `satirlar` (değer değiştirme, satır ekleme/silme). `satirSayisi` bilgi amaçlıdır,
yazarken dikkate alınmaz. `onek`, `artik`, `kuyruk`, `sifreleme` alanlarına dokunulmamalı.

## Çözülemeyenler

| Dosya | Durum |
|---|---|
| `Data/modify_us.tbl` | Bilinen üç yöntemle de açılmıyor (DES'in farklı başlangıç noktaları da denendi). Sunucuya özel olabilir. Açık iş. |
| `Data/Slander_us.tbl` | 0 bayt, boş dosya. |

## Eşya tablosu sütunları (Item_Org_us.tbl, Myko) — eşya bilgisi için
`__TABLE_ITEM_BASIC` sırası (client GameDef.h) + Myko'nun eklediği iki sütun: 0 numara, 1 uzantı, 2 ad, 3 açıklama, 6 model kaynağı, 7 simge, 10 tür (Kind), 12 yuva, 13 ırk, 14 meslek, 15 saldırı gücü, 16 saldırı aralığı, 17 menzil (0,1 m), 18 ağırlık (0,1), 19 dayanıklılık, 20 fiyat, 22 savunma, 23 yığınlanır mı, 26 gereken seviye, 30-34 gereken güç/dayanıklılık/çeviklik/zekâ/büyü gücü, 36 **eşya sınıfı: 1 Low, 2 Middle, 3 High Class** (5 = yüksek sınıfın yükseltme çeşidi; metinler Texts_us 4562-4564 "Item Grade : …"). Örnek: Quilted Pauldron 1, Plate Armor Pauldron 2, Chitin Armor Pauldron 3; Dagger 1, Kukry 2, Mirage Dagger 3.
Eşya bilgisi penceresi: `client/src/arayuz/esyaBilgisi.ts` (orijinal UIImageTooltipDlg satır sırası; yetmeyen şartlar kırmızı). Büyü/direnç gibi uzantı (Item_Ext) alanları henüz gösterilmiyor.
