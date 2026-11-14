# Paket arşivi, doku, harita ve model formatları

Tüm sayılar little-endian. "metin" = `int32 uzunluk + bayt` (sonunda 0 yok).
Kod: `araclar/paket`, `araclar/doku`, `araclar/harita`, `araclar/model`.

## `.hdr` + `.src` — paket arşivi ✅
Kaynak: `Launcher-Source/hdr.cpp`. Arşivler: `UI/ui`, `Item/item`, `Object/object`, `fx/fx`.
```
.hdr: uint32 adet; adet × { metin ad ("alt\dosya"), uint32 ofset, uint32 uzunluk }
.src: ham dosya içerikleri art arda (sıkıştırma/şifreleme yok)
```
`araclar/ortak/oyunDosyalari.ts` dosyaları gevşek klasörlerden ya da arşiv içinden bulur (büyük/küçük harf duyarsız).

## `.dxt` / `.gtt` — doku ✅ (sürüm 7 hariç)
```
metin ad
"NTF" + sürüm(1 bayt: 3, 4, 7)
int32 genişlik, int32 yükseklik, uint32 biçim (D3DFORMAT / FourCC), int32 mipmap_var
mipmap seviyeleri (en büyükten başlayarak)
DXT biçimlerde ardından yarım boyutlu 16 bitlik yedek kopya (eski ekran kartları için)
```
Biçimler: DXT1/3/5, 21 = A8R8G8B8, 22 = X8R8G8B8, 25 = A1R5G5B5, 26 = A4R4G4B4.
`.gtt` = arka arkaya 8 karo dokusu (her biri 128×128 DXT1, 21856 bayt).

**Sürüm 7 = şifreli.** Veri, her `ReadFile` çağrısında baştan başlayan sabit bir anahtar akışıyla XOR'lanmış
(Windows `CryptDecrypt` + RC4 davranışı). Anahtar akışı bütün dosyalarda aynı; ilk 256 baytı istatistik yöntemle
yaklaşık bulundu ama tam değil → **çözülmedi** (YAPILACAKLAR). Sürüm 7 olan dokular şimdilik gri gösterilir.
Etkilenenler: Moradon dahil yeni haritaların zemin karoları, bütün `.tct` renk haritaları, ~600 doku.

## `.gtd` — arazi ✅
```
metin ad (eski tablo XOR'u ile şifreli: r=0x0816)
int32 0
int32 N (köşe sayısı; 257 → 256×256 karo, karo = 4 m)
N×N × { float yükseklik; uint32 karo } (sıra x*N+z)
    karo bitleri: 0 tam | 1-5 yön1 | 6-10 yön2 | 11-20 doku1 | 21-30 doku2 (1023 = yok)
yama bilgisi (32×32 × 2 float), çim haritası (N×N bayt), 32×32 int (bilinmiyor)
char[260] çim dosya adı
int32 karo_doku_sayısı, int32 kaynak_sayısı, kaynak_sayısı × char[260] (.gtt yolları)
karo_doku_sayısı × { int16 kaynak, int16 kaynak içi sıra }
(devamı okunmuyor)
```
Bazı haritalarda (`clanfight`, `freezone`, `moradon_xmas`…) başlık farklı → okunamıyor (YAPILACAKLAR).
Karo dokuları kenarlarında kararan "geçiş karoları"; oyundaki birebir karışım kuralı ve yön kodlarının
anlamı henüz kesin değil (istemci yaklaşık bir karışım kullanıyor).

Sunucunun `.smd` haritası (`SMDFile.cpp`) aynı yükseklik ızgarasını + çarpışma üçgenlerini içerir.

## `.opd` — harita nesneleri ✅ (kısmen)
```
metin ad (XOR şifreli), int32 0, float genişlik, float uzunluk
çarpışma verisi (üçgen sayısı + üçgenler + hücreler)
... nesne listesi: int32 sayı, sayı × { int32 işaret (1051 veya 5147), .n3shape kaydı }
```
Nadiren kayıtlar arasında anlamı bilinmeyen ek alan var; okuyucu bir sonraki kayda atlıyor.

## `.n3shape` — nesne ✅
```
metin ad, vec3 konum, quat dönüş (x,y,z,w), vec3 ölçek
3 × animasyon anahtarı { int32 adet; adet>0 ise int32 tür, float oran, adet × (vec3 | quat) }
metin çarpışma modeli, metin tırmanma modeli
int32 parça_sayısı × { vec3 pivot, metin .n3pmesh, malzeme(92 bayt), int32 doku_sayısı, float fps, doku_sayısı × metin }
5 × int32 (belong, eventID, eventType, npcID, npcStatus)
```
Parça dünya konumu = pivot, sonra nesnenin konum/dönüş/ölçeği.

## `.n3pmesh` — model ✅
```
metin ad
int32 çökme_sayısı, int32 indeks_değişim_sayısı, int32 köşe, int32 indeks, int32 en_az_köşe, int32 en_az_indeks
köşe × { vec3 konum, vec3 normal, vec2 uv }   (32 bayt)
indeks × uint16
(ayrıntı seviyesi verisi: çökmeler, indeks değişimleri, LOD tablosu — en ayrıntılı seviye için gerekmez)
```

## Karakter / canavar ✅
`NPC_Looks.tbl` her model için: iskelet (.n3joint), animasyon (.n3anim), 13 parça (.n3cpart).

**`.n3joint`** (iskelet, kemik ağacı, ön-sıra):
```
metin ad, vec3 konum, quat dönüş, vec3 ölçek
4 × animasyon anahtarı (konum vec3, dönüş quat, ölçek vec3, yönelim quat) — oran = anahtar/saniye
int32 çocuk_sayısı, çocuklar (aynı yapı)
```
**`.n3cpart`**: `metin ad, int32, malzeme(92), metin doku, metin .n3cskins`

**`.n3cskins`** (deri, 3 ayrıntı seviyesi art arda):
```
metin ad
her seviye: metin ad, int32 yüz, int32 köşe, int32 uv
   köşe × { vec3 konum, vec3 normal }, yüz×3 uint16 köşe indeksi, uv × vec2, yüz×3 uint16 uv indeksi
   köşe × { vec3 bağlanma_konumu, int32 n, 8 bayt (bellek adresi, anlamsız), n × int32 kemik, (n>1 ise) n × float ağırlık }
```
Kemik numaraları iskeletin ön-sıra (pre-order) dizisine göredir.

**`.n3anim`**: `int32 adet`, her kayıt `int32 uzunluk` + **[tablo imzası 16 bayt][uzunluk 4 (BE)][DES (IP/FP'siz, tablo anahtarı) şifreli]**
(tablolardan farklı olarak XOR katmanı yok). Çözülen kayıt: 2 bayt + float alanlar (başlangıç karesi, bitiş karesi,
kare/sn, iz başlangıç/bitiş, ses kareleri, karışım süresi, vuruş karesi…) + sonda metin ad.
Kareler 30 kare/sn birimindedir. Kayıt sırası her modelde aynı:
0 bekleme, 1 yürüme, 2 koşma, 3 geri, 4-5 saldırı, 6-8 darbe, 9 savunma, 10-11 ölüm, 12-15 konuşma, 16-17 büyü.

## Koordinatlar
Knight Online sol elli (D3D): x doğu, y yukarı, z kuzey. glTF/Three.js sağ elli → z ekseni ters çevrilir
(konum z → -z, dörtey (x,y,z,w) → (-x,-y,z,w), üçgen sırası ters). Modeller sahnede -z yönüne bakar.
