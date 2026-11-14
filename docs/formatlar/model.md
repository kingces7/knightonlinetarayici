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

## `.dxt` / `.gtt` / `.tct` — doku ✅ (sürüm 7 dahil)
```
metin ad
"NTF" + sürüm(1 bayt: 3, 4, 7)
int32 genişlik, int32 yükseklik, uint32 biçim (D3DFORMAT / FourCC), int32 mipmap_var
mipmap seviyeleri (en büyükten başlayarak)
DXT biçimlerde ardından yarım boyutlu 16 bitlik yedek kopya (eski ekran kartları için)
```
Biçimler: DXT1/3/5, 21 = A8R8G8B8, 22 = X8R8G8B8, 25 = A1R5G5B5, 26 = A4R4G4B4.
`.gtt` = arka arkaya 8 karo dokusu (her biri 128×128 DXT1, 21856 bayt).

Mipmap zinciri en küçük kenar 4'e inene kadar sürer (4×4 dahil; 2×2 ve 1×1 yok). DXT biçimlerinde ana zincirin
arkasına yarım boyutlu yedek kopya gelir (DXT1 için A1R5G5B5, diğerleri için A4R4G4B4), o da 4'e kadar mipmaplıdır.
Seviye boyu oyunun yazdığı gibi: DXT1 = g·y/2, DXT2-5 = g·y, sıkıştırılmamış = g·y·piksel baytı.
(Kanıt: 588 sürüm 7 `.dxt`/`.tct` dosyasının hepsinde bu düzenin toplamı dosya boyuna tam eşit.)

### Sürüm 7 = şifreli ✅ (çözüldü)
Başlık (ad, "NTF", sürüm, 16 bayt) **şifresiz**; yalnızca piksel verisi şifreli.
- **Algoritma:** RC4. Anahtar = SHA-1(parola) ilk 16 bayt (Windows CryptoAPI: `CryptCreateHash(0x8004)`,
  `CryptHashData`, `CryptDeriveKey(0x6801, 128 bit)`; `CryptDecrypt(Final=TRUE)` akışı her çağrıda baştan başlatır).
- **Parola:** `owsd9012%$1as!wpow1033b%!@%12` (29 karakter). Kaynak: `KnightOnline.exe` içinde
  "Microsoft Enhanced Cryptographic Provider v1.0" yazısının hemen önünde düz metin (dosya ofseti 8734750 civarı).
  Anti-cheat'in `.lilith` (UIF) parolası `(A;dq1DPV…` ayrı bir şey: o da SHA-1 + RC4 ama parolanın **yalnızca ilk 29
  karakteri** hash'lenir (`CryptHashData(..., 29, …)`); `MessageBox.lilith` ile bu çözüm doğrulandı, doku parolasıyla ilgisi yok.
  İlk denemelerin başarısız olma nedeni buydu: yanlış parola, ayrıca hash uzunluğunun 29'a kırpılması.
- **Anahtar akışı her okumada 0. bayttan başlar.** Okuma sınırları (kanıtlı, aşağıya bak):
  - DXT ana seviyeleri: seviyenin tamamı tek okuma (akış her seviyede yeniden başlar)
  - sıkıştırılmamış ana seviyeler: satır satır (akış her `genişlik·piksel baytı` baytta yeniden başlar)
  - DXT'nin yarım boyutlu 16 bit kopyası: seviye seviye, satır satır
- Şifreleme = XOR olduğu için çözme ile aynı işlem (`surum7Donustur`), yani geri yazma da aynı fonksiyonla olur.
- Kod: `araclar/doku/dxt.ts` (`dxtOku` sürüm 7'yi kendiliğinden çözer; `veriDuzeni`, `surum7Donustur`, `tctOku`).

**Kanıtlar** (`araclar/doku/dxt.test.ts`):
1. 37 sürüm 7 dosyanın düz (sürüm 3) kopyası oyunda var (aynı ad, başka klasör). Şifreli ^ düz = anahtar akışı;
   ilk 32 bayt `904d4f1f13a9e5f3f8de11d1f2981a33cade2324524f0325d68c25b3719f0a2c`, SHA-1 parolasıyla üretilen RC4
   akışının ilk 32 baytıyla **bire bir aynı**.
2. Çözülen DXT3 (ana zincir + 16 bit kopya), A8R8G8B8 (satır satır) ve 16×16 DXT3 dokular düz kopyayla bayt bayt aynı.
3. Görsel kontrol: ağaç yaprağı dokusu, Moradon `.tct` renk haritası düzgün resim veriyor.
4. Sayım: 588 sürüm 7 `.dxt`/`.tct` dosyasının 588'i hatasız çözülüyor (587'si komşu-piksel ölçütünü de geçiyor;
   `zones\dungeond.tct` bilerek gürültülü bir renk haritası, görsel olarak doğru). `.gtt` içinde ayrıca 960 sürüm 7 karo
   dokusu var; hepsi hatasız çözülüyor (görsel ölçüt uygulanmadı).
- **Doğrulanmadı:** DXT dokularda yarım boyutlu 16 bit kopyanın kendisi (okumuyoruz; düz kopyalarla karşılaştırmada
  tam tutan örneklerde 2720/2720 bayt aynı, resmi farklı olan çiftlerde elbette farklı). Çok büyük DXT seviyelerinin
  (>64 KB) tek okuma olduğu varsayımı 128×128 DXT3'e kadar (16 KB) düz kopyayla kanıtlı; daha büyükler görsel olarak doğru
  ama bayt bayt karşılaştırılacak düz kopya yok.

### `.tct` — renk haritası ✅
Arka arkaya N×N adet bağımsız doku: her biri `int32 0 (ad boş)` + "NTF" + sürüm + başlık + veri, **128×128 A1R5G5B5,
mipmaplı** (43704 bayt). 4 / 16 / 64 / 256 parça görülüyor (haritanın boyuna göre; 59 dosya: 22 sürüm 7, 37 sürüm 3). Sürüm 7 toplamı: 566 `.dxt` + 22 `.tct` = 588.
**Haritaya yerleşim (ölçülerek bulundu):** N×N parçadan oluşan görüntü haritayla 1 piksel = 1 metre örtüşür. Parça i, x-parçası = ⌊i/N⌋,
z-parçası = i mod N; parça içinde satırlar z ekseninde ters. 128 olası düzen, yaklaşık taban renkle karşılaştırıldı: Moradon r=0,83,
eski Moradon r=0,86; ikinci en iyi 0,48 / 0,40. Kod: `araclar/harita/cli.ts` → `renkHaritasi`, çıktı `renk.bin` (ham RGBA, satır=z, sütun=x).

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
indeks × uint16                              ← TÜM ÇÖKMELER UYGULANMIŞ (en düşük ayrıntı) durumdaki indeksler
çökme_sayısı × { int32 kaybolan_indeks, int32 değişen_indeks, int32 kaybolan_köşe, int32 değişim_başlangıcı, int32 hedef_köşe, float değer }
indeks_değişim_sayısı × uint32               (indeks dizisindeki yerler)
int32 sayı, sayı × { float uzaklık, int32 köşe }   (LOD kontrol değerleri)
```
**Tam ayrıntılı ağı elde etmek için çökmeler uygulanmalıdır** (önceki sürümde "gerekmez" sanılıyordu; bu yüzden binalar,
kayalar, direkler parçalanmış ve dokuları çizgi çizgi uzamış görünüyordu). Kayıtlar en düşükten en ayrıntıya (bölme)
sırasındadır: köşe sayısı 0'dan başlar; her kayıtta `kaybolan_köşe` kadar artar ve kaydın değiştirdiği indeks yerlerine
yeni doğan köşenin numarası (= o andaki köşe sayısı − 1) yazılır.
Kanıtlar: (1) çökme kayıtlarının toplamı tam köşe ve indeks sayısına eşit; (2) ilk üçgenler `0 2 1, 1 3 2, 4 6 5` ve kayıtlar
3, +1, +3 köşe ekliyor; (3) ölçüm: Moradon'un 1091 modelinde kullanılmayan köşe 7599 → 0, UV'si çökmüş yüzey %18,6 → %0,18
(eski Moradon: 2654 → 0, %14,6 → %0,49). Test: `araclar/model/pmesh.test.ts`.

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
