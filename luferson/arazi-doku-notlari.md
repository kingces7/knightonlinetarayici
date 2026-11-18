# Arazi dokusu — orijinal client kaynağından notlar (Görev B / 3)

Okunan (salt okunur): `OPENKO SRC - V1299/Client/N3Base/N3Terrain.cpp`, `N3TerrainPatch.cpp`, `N3TerrainDef.h`; ayrıca `WarFare/GameDef.h` (`__TABLE_ZONE`), `WarFare/LightMgr.cpp` (`LoadZoneLight`), `N3Base/N3Light.cpp`. Gerçek dosya doğrulamaları `KnightEmpire/Zones/karus2004.*` üzerinde yapıldı (yalnız okuma).

Not: kaynak V1299; elimizdeki dosyalar 1298. Aşağıdaki doğrulamalarda (`.gtd`, `.tlt`, `.tct` düzeni) bu fark sorun çıkarmadı.

## Sabitler (`N3TerrainDef.h`)

| sabit | değer | anlamı |
|---|---|---|
| `TILE_SIZE` | 4 | bir karo 4 m |
| `PATCH_TILE_SIZE` | 8 | bir yama 8×8 karo = 32 m |
| `PATCH_PIXEL_SIZE` | 32 | bir yama renk haritasında 32 px (1 px = 1 m) |
| `COLORMAPTEX_SIZE` | 128 | bir renk haritası dokusu 128×128 px = 128 m = 32×32 karo |
| `UNITUV` | 32 | renk haritası UV birimi: 32 karo |
| `TILE_PIXEL_SIZE` | 128 | karo dokusu 128×128 |
| `LIGHTMAP_TEX_SIZE` | 16 | ışık haritası UV hesabında (aşağıda) |

## 1. `.gtd` karo verisi

Dosya düzeni (`CN3Terrain::Load` sırası): başlık, `int boyut` (karus2004: 513 köşe → 512×512 karo), **`MAPDATA[boyut × boyut]`**, yama orta-Y/yarıçap (`float` çifti, `(boyut−1)/8` yama kenarı), çim özelliği (`boyut²` bayt), çim dosya adı (260 bayt), karo doku listesi, ışık haritası bölümü, nehir, gölet.

`MAPDATA` = 8 bayt (`N3TerrainDef.h`): `float fHeight` + 32 bitlik alan (MSVC, en düşük bit önce):

| bit | alan | anlamı |
|---|---|---|
| 0 | `bIsTileFull` (**tam_karo**) | 1 = karo tam; 0 = karo dokusu yok sayılır |
| 1–5 | `Tex1Dir` | doku1'in yönü (aşağıda) |
| 6–10 | `Tex2Dir` | doku2'nin yönü |
| 11–20 | `Tex1Idx` | doku1 indeksi (1023 = yok) |
| 21–30 | `Tex2Idx` | doku2 indeksi (1023 = yok) |

Varsayılan (`MapData()` kurucusu): `fHeight = FLT_MIN`, `bIsTileFull = true`, yönler 0, indeksler 1023.

- **doku1 / doku2:** karo doku listesine indeks (`m_pTileTex[i]`, `NumTileTex` = karus2004'te 275). Liste `LoadTileInfo` ile okunur: `uint32 NumTileTex`, `int NumTileTexSrc`, `NumTileTexSrc × char[260]` (`.gtt` yolları), sonra `NumTileTex × (int16 kaynak, int16 kaynak içi sıra)`. doku1 = ana karo dokusu; doku2 = ikinci katman (geçiş karosu), **ADD** ile eklenir (bölüm 3). İndeks ≥ `NumTileTex` ya da 1023 "yok" demek (çizimde `>=` ile denetleniyor).
- **tam_karo biti:** 1 ise karo dokuları kullanılır. 0 ise doku1 geçerli olsa bile karo **renk haritası × Terrain_Base** yoluna düşer (bölüm 3, durum a).- **Yön (0–7):** alan 5 bit (0–31) ama tablo yalnız 8 satır ve kodda sınır denetimi yok. Yön, karo dokusunun kare üzerine nasıl döndürüldüğünü/aynalandığını belirler (bölüm 4). 0–3 döndürme, 4–7 aynalı hali (kaynak yorumu: `up, right, left, bottom, up_mirr, right_mirr, left_mirr, bottom_mirr`).
- **Ayrıca:** `.gtd`'nin içinde de bir "ışık haritası" bölümü var (`int NumLightMap`, her biri `int16 sx, int16 sz` + doku). `Load` bunları okuyup **atıyor**; gerçek ışık haritaları `.tlt`'den gelir. karus2004.gtd'de bu sayı **0**; bölüm karo listesinden sonra, nehirden önce duruyor (`bitis` sonrasındaki ilk `int` = 0, ardından 9). Dönüştürücümüz nehri bu bölümden sonra sezgisel taradığı için etkilenmiyor.

**karus2004'te gerçek dağılım** (`araclar/harita/arazi.ts` çıktısı, 263 169 köşe):
- `tam_karo` = 1 olan: **263 169 (hepsi)**; = 0 olan: 0.
- doku1 geçersiz (1023): 1025 köşe, yani `x = 512` satırı ve `z = 512` sütunu (513 + 513 − 1). Bunlar karo başlangıcı olmadığı için çizilmiyor.
- doku2 geçerli: 73 620 köşe (yaklaşık %28); geçersiz: 189 549.
- yön1: 0 → 196 896, 1 → 20 287, 2 → 19 985, 3 → 15 449, 4 → 5 058, 5 → 5 490, 6 → 1, 7 → 3. yön2 (doku2 olanlarda): yalnız 0–5.
- Sonuç: bu haritada yakın alanda "renk haritası × Terrain_Base" yoluna düşen karo **yok**.

## 2. `.tct`, `.tlt` ve `.glo`

`__TABLE_ZONE` sırası (`GameDef.h`), `Zones.csv` sütun sırasıyla aynı (tek fark: CSV'de gökyüzü için ek bir `_hdr` sütunu var): `gtd`, ad, **`szColorMapFN` = `.tct`**, **`szLightMapFN` = `.tlt`**, `szObjectPostDataFN` = `.opd`, …, `szMiniMapFN` = `.dxt`, gökyüzü, …, **`szLightObjFN` = `.glo`**, `gev`, `ens`, `flag`, `opdsub`, `evtsub`.

### `.tct` — renk haritası ✅
`LoadColorMap`: `m_iNumColorMap = (yamaKenarı × 32) / 128` = karus2004'te **16**. Dosya **16×16 = 256** bağımsız `CN3Texture`'dan oluşur, sıra `for x { for z { Load } }` (x dış döngü). Yama (px, pz) → `m_ppColorMapTex[px·32/128][pz·32/128]` = `[px/4][pz/4]`. Boyut kanıtı: `karus2004.tct` = 256 × 43 704 bayt (128×128 A1R5G5B5, mipmaplı). Bu, `docs/formatlar/model.md`'deki "x-parçası = ⌊i/N⌋, z-parçası = i mod N" bulgusunu kaynaktan doğruluyor.

### `.tlt` — **ışık haritası (gölge katmanı)**, renk haritası değil
`SetLightMap` / `SetLightMapPatch` / `GetLightMap`. Dosya düzeni:

```
int   sürüm                                    (karus2004: 0)
int   adres[yamaSayısı × yamaSayısı]            (karus2004: 64×64 = 4096 adres, 16388 bayt tablo)
adres[px + yamaKenarı·pz] noktasında (x HIZLI ilerler; MAPDATA'daki x*N+z'nin tersi):
  int  dokuSayısı
  dokuSayısı × { int tx, int tz  (yama içi karo 0–7),  CN3Texture (NTF) }
```
Doğrulama (karus2004.tlt, 10 064 544 bayt): sürüm 0; tablo 16388 bayt; **4096 yamanın 1527'sinde ışık haritası var** (adres > 0), en küçük adres 16388 (tablodan hemen sonra), ilk dolu yamada 2 doku. İlk dokunun başlığı `NTF` sürüm 3, **32×32**, biçim kodu 26 (**A4R4G4B4**), 1 mip; kırmızı kanal hep 0, alfa 0–85 (0x00–0x55): yani **siyah, yarı saydam bir gölge katmanı**. (Yalnız ilk dokuyu çözdüm; diğerlerini ve ikinci dokunun başlığını doğrulamadım.)

Kullanım:
- Yalnızca oyuncunun bulunduğu yama etrafındaki **3×3 yama** için yüklenir (`m_LightMapPatch[3][3]`, merkez yama değişince kaydırılır, `DispositionPatch`).
- Anahtar `tx*10000 + tz` (dünya karo koordinatı).
- Yalnız **seviye 1** (yakın) yamalarda, karolar çizildikten sonra **ikinci geçişte** çizilir (bölüm 3).
- UV: karonun dört köşesine `suv = 1/16`, `euv = 15/16` ile (köşe eşlemesi bölüm 4). Dosyadaki doku 32×32 iken sabit `LIGHTMAP_TEX_SIZE = 16` kullanılıyor; neden 16 olduğu belli değil (kenar payı gibi duruyor).

### `.glo` — bölge ışık nesneleri (zemin dokusuyla ilgisi **yok**)
`CLightMgr::LoadZoneLight`: `int sürüm`, `int adet`, `adet × CN3Light` (`CN3Transform` + `m_Data`, ışık numarası 0–7). Elimizdeki dosyalarda kayıt başına 168 bayt: karus2004.glo = 8 + 9 × 168 (**9 ışık**), karus_start.glo ve old_karus.glo = 8 + 15 × 168 (**15 ışık**, ikisi bayt bayt aynı, MD5 eşit). `Zones.csv` bölge 10, `karus2004.glo` değil **`karus_start.glo`** gösteriyor (karus2004.glo hiçbir satırda yok). Bu dosya nesne/karakter aydınlatması içindir; arazi dokusunu değiştirmez.

## 3. Karo birleştirme kuralı ve ne zaman hangi doku

**LOD (yama seviyesi).** `SetLODLevel(3)` (Init'te çağrılıyor): her yama için merkez yamaya uzaklık `dist = int(√(dx²+dz²) + 0.6)` (yama birimi). `dist ≤ 3` → **seviye 1**, `dist ≤ 6` → seviye 2, daha uzak → seviye 3. Bir yama 32 m olduğu için seviye 1 yaklaşık 3 yama (**≈ 100 m**) yarıçapında.

**Seviye 2 ve 3 (uzak):** yalnız **renk haritası**: aşama 0 = renk haritası, `MODULATE(DIFFUSE, TEXTURE)`; aşama 1 ve 2 kapalı. Karo dokusu, `Terrain_Base`, ışık haritası **yok**. Üçgen yelpazeleri (fan) kullanılıyor; iki seviye arasındaki fark geometri inceliği (ayrıntısını okumadım).

**Seviye 1 (yakın):** her karo ayrı bir dörtgen, `D3DPT_TRIANGLEFAN`, 2 üçgen. Üç durum (`N3TerrainPatch::Render`):

| durum | koşul | aşama 0 | aşama 1 | aşama 2 |
|---|---|---|---|---|
| **a) renk haritası** | `Tex1Idx ≥ NumTileTex` **veya** `tam_karo = 0` | renk haritası | `Terrain_Base.bmp`, `MODULATE` | `MODULATE` × diffuse |
| **b) iki katman** | doku1 ve doku2 geçerli | doku1 | doku2, **`D3DTOP_ADD`** (doku1 + doku2) | `MODULATE` × diffuse |
| **c) tek katman** | yalnız doku1 geçerli | `MODULATE`(doku1, diffuse) | kapalı | kapalı |

- **a):** renk haritası × `Terrain_Base.bmp` (`Misc/Terrain_Base.bmp`, `N3Terrain::Init` yükler; KnightEmpire'da var, 786 488 bayt, boyutu yalnız dosya uzunluğundan tahmin edildi: yaklaşık 512×512, 24 bit). `Terrain_Base` karo başına 0–1 UV ile (4 m'de bir tekrar), renk haritası 1 piksel/m ile örnekleniyor. Yani renk haritası **dokusuz bölgeleri kaplayan** zemin; `Terrain_Base` bunun üstüne ince bir doku/ton çarpanı.
- **b):** ekran kartı en az 3 doku aşaması ve `BLENDOP` destekliyorsa (`m_bAvailableTile`; `TestAvailableTile`'daki `ValidateDevice` denemesi koddaki `return` ile devre dışı) aşama 2 ile diffuse çarpılıyor. Değilse tek geçişte ADD, ikinci geçişte `ZERO / SRCCOLOR` karışımı ile diffuse çarpılıyor.
- **Işık haritası geçişi** (yalnız seviye 1): karolar bittikten sonra, ışık haritası olan karolar için ikinci bir dörtgen: `ALPHABLENDENABLE`, `SRCALPHA / INVSRCALPHA`, aşama 0 = `MODULATE(TEXTURE, DIFFUSE)`. Siyah A4R4G4B4 dokunun alfası gölge şiddetini verir.
- Köşegen: karo `(ix + iz)` çiftse köşegen `(tx,tz)–(tx+1,tz+1)`, tekse `(tx,tz+1)–(tx+1,tz)`; yani satranç tahtası biçiminde değişiyor. Yükseklik geometrisini etkiler (UV'yi değil, çünkü her karonun 4 köşesine aynı karo UV'leri veriliyor).

**Özet:** renk haritası × `Terrain_Base` yalnız (1) seviye 1'de **geçersiz doku1 veya tam_karo = 0** olan karolarda ve (2) seviye 2–3'te renk haritası **tek başına** (Terrain_Base olmadan) kullanılır. karus2004'te (1) hiç tetiklenmiyor, yani **yakında karo dokusu, uzakta renk haritası**.

## 4. Yön UV tablosu

Kaynak (`N3Terrain.cpp`, `m_fTileDirU/V[8][4]`; sütunlar `[LT, RT, LB, RB]`):

```
          U                      V
yön0  {0,1,0,1}            {0,0,1,1}     up
yön1  {0,0,1,1}            {1,0,1,0}     right
yön2  {1,0,1,0}            {1,1,0,0}     left
yön3  {1,1,0,0}            {0,1,0,1}     bottom
yön4  {1,0,1,0}            {0,0,1,1}     up_mirr
yön5  {0,0,1,1}            {0,1,0,1}     right_mirr
yön6  {0,1,0,1}            {1,1,0,0}     left_mirr
yön7  {1,1,0,0}            {1,0,1,0}     bottom_mirr
```

**Köşe eşlemesi** (`N3TerrainPatch.cpp`, satır 273–291): karonun dört köşesi `A = (tx, tz)`, `B = (tx, tz+1)`, `C = (tx+1, tz+1)`, `D = (tx+1, tz)` (dünya x = tx·4, z = tz·4); tabloya şöyle bakılır: **A = [2], B = [0], C = [1], D = [3]**. Aynı eşleme doku2 için `Tex2Dir` ile geçerli.

Sonuçta her yön için (U, V), D3D düzeninde (V = 0 görüntünün **üstü**):

| yön | A (x, z) | B (x, z+1) | C (x+1, z+1) | D (x+1, z) |
|---|---|---|---|---|
| 0 | (0, 1) | (0, 0) | (1, 0) | (1, 1) |
| 1 | (1, 1) | (0, 1) | (0, 0) | (1, 0) |
| 2 | (1, 0) | (1, 1) | (0, 1) | (0, 0) |
| 3 | (0, 0) | (1, 0) | (1, 1) | (0, 1) |
| 4 | (1, 1) | (1, 0) | (0, 0) | (0, 1) |
| 5 | (1, 0) | (0, 0) | (0, 1) | (1, 1) |
| 6 | (0, 0) | (0, 1) | (1, 1) | (1, 0) |
| 7 | (0, 1) | (1, 1) | (1, 0) | (0, 0) |

Yön 0'da görüntünün üstü = **+z**, sağı = **+x**.

**Diğer UV'ler:**
- **Renk haritası** (durum a, ve seviye 2–3): `u(A,B) = (tx mod 32)/32`, `u(C,D) = u + 1/32`; `v(A,D) = (32 − (tz mod 32))/32`, `v(B,C) = v(A,D) − 1/32` (**v, +z'de azalır**). `UVConvert` kimlik fonksiyonu (düzeltme kapalı).
- **Terrain_Base** (durum a, aşama 1): A = (0,0), B = (0,1), C = (1,1), D = (1,0).
- **Işık haritası** (`suv = 1/16`, `euv = 15/16`): çift karoda A = (suv, euv), B = (suv, suv), C = (euv, suv), D = (euv, euv); tek karoda köşe sırası bir kaydırılıyor ama her köşe aynı UV'yi alıyor (A = (suv, euv) … aynı eşleme).

## 5. Client ile karşılaştırma (`client/src/dunya/arazi.ts`)

Eşleşenler:
- Shader'daki `YU/YV` dizileri yukarıdaki tabloyla **birebir aynı** (8 yön × 4 köşe) ve köşe eşlemesi `LB/LT/RT/RB` ile uyuşuyor. `mod & 1` ile orijinal tablo, `mod & 2` ile **doku1 + doku2 (ADD)** açık; master'ın ilk düzeltmesi (yön tablosu + ADD) kaynakla uyumlu.
- doku1 geçersizken (`ilk >= karoAdedi`) renk haritası kullanılıyor; kaynakta da karşılığı var.

Kaynakta olup client'ta görmediklerim (bakmadığım yerler olabilir; yalnız `arazi.ts` fragment shader'ına ve `araclar/harita/` çıktılarına baktım):
1. **Işık haritası (`.tlt`) yok:** 4096 yamanın 1527'sinde siyah yarı saydam gölge katmanı (alfa 0–85). `docs/formatlar/README.md`'de `.tlt` hâlâ ⬜. Beklenen sonuç: zemindeki bu gölgeler client'ta görünmüyor (hangi nesnelerin gölgesi olduklarını doğrulamadım).
2. **Mesafe ayrımı yok:** orijinalde ≈ 100 m ötesi (seviye 2–3) yalnız renk haritası; shader her mesafede karo dokusu örnekliyor (`vDerinlik` yalnız sis için). Uzak zemin orijinalden farklı doku/ton görebilir.
3. **Renk haritası yolu `Terrain_Base`'siz:** `taban` doğrudan renk. Orijinalde seviye 1'deki durum (a) `× Terrain_Base`; seviye 2–3 `× diffuse`. karus2004'te yalnız 1025 çizilmeyen kenar köşesini ilgilendirdiği için pratik etkisi yok; tam_karo = 0 olan başka haritalarda etkili olur.
4. **Renk/ışık eğrisi:** shader'da `pow(c, 1.12)`, 0.62 üstü sıkıştırma ve `0.84 + 0.24·N·L` var; kaynakta arazi köşe normali sabit `(0,1,0)` ve `D3D diffuse`/sis. Bu bilinçli bir stilizasyon gibi duruyor, orijinalden farkı not düşüyorum.
5. **Köşegen yönü:** orijinalde `(ix + iz)` çift/tek alternatifli. Client mesh'inin aynı köşegeni kullanıp kullanmadığına bakmadım (yükseklik/yürüme için önemli).

## 6. Doğrulanmayanlar

- Yön alanının 8–31 değerleri (karus2004'te yok; başka haritalarda var mı bakılmadı).
- `.tlt` içindeki diğer ışık haritası dokularının biçimi (yalnız ilk doku çözüldü), 32×32 doku ile `LIGHTMAP_TEX_SIZE = 16` ilişkisi.
- Seviye 2 ile 3'ün geometri farkı (`HalfCell` yelpazesi) okunmadı.
- `Terrain_Base.bmp` gerçek boyutu (yalnız dosya uzunluğundan tahmin).
- `.glo` içindeki ışıkların türü/parametreleri (`m_Data` alanları okunmadı).
- 1298 ile V1299 arasındaki olası farklar (yalnız karus2004 dosyalarıyla örtüştüğünü gördüm).
