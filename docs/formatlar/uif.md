# `.uif` / `.lilith` — arayüz pencereleri ✅

Oyunun pencereleri (karakter durumu, skill, envanter, HP çubuğu, görev çubuğu…) UIF dosyalarıdır. Bu sunucuda `LilithACS/*.lilith`
(187 dosya) adıyla ve **şifreli** durur. Kaynak kod: anti-cheat "Pearl Guard" içindeki `N3BASE/N3UI*.cpp` (`Load` fonksiyonları).
Okuyucu: `araclar/arayuz/lilith.ts` (şifre) + `uif.ts` (yapı); dışa aktarım: `npm run arayuz`; testler: `uif.test.ts`.

## Şifre
- RC4; anahtar = SHA-1(parolanın **ilk 29 karakteri**) ilk 16 bayt. Parola `xCODE/uif.ini` → `KEY`.
- Dosya: 4 bayt şifresiz başlık (int32 0), sonra **31 ya da 32 baytlık** parçalar; her parçada anahtar akışı baştan başlar
  (blok boyu dosyaya göre değişiyor; düz metinde en çok sıfır çıkan boyut seçilir — 187 dosyanın 84'ü 31, 103'ü 32).
  Kanıt: şifreli veri 31/32 periyotlu, çözülünce `ui\ui_el_myinfo.dxt` gibi doku yolları ve tutarlı yapı çıkıyor.

## Yapı (hepsi little-endian; düğümler özyinelemeli)
```
düğüm := metin ad                      (int32 uzunluk + bayt)
         int16 çocukSayısı, int16 ek   (sürüm 1264+; ek = tür-özel alanlardan önce atlanacak bayt sayısı, sıfır dolu)
         çocukSayısı × { int32 tür, düğüm }
         metin id, RECT kutu, RECT taşınabilirBölge (4×int32: sol, üst, sağ, alt)
         uint32 stil, uint32 ayrık ("reserved"), metin ipucu, metin sesAç, metin sesKapat
         + türe özel alanlar:
  Image(4):    metin doku, 4×float uv (u1,v1,u2,v2), float animKare
  Button(1):   RECT tıklamaKutusu, metin ses, metin ses        — çocuk resimler: ayrık 0 normal, 1 basılı, 2 üstünde, 3 pasif
  Static(2):   metin ses
  Progress(3): —                                               — çocuk resimler: ayrık 0 arka, 1 ön
  String(6):   metin yazıTipi, uint32 boy, uint32 bayrak(1 kalın, 2 italik), uint32 renk(ARGB), metin yazı, [ek varsa int32]
  Edit(8):     Static + metin ses ;  List(14): yazı tipi/boy/renk/kalın/italik
  Area(9):     int32 alanTuru                                  — yuva/tıklanabilir alan
  Base(0), ScrollBar(5), TrackBar(7): ek alan yok
```
Tür numaraları: `N3UIDef.h` (`eUI_TYPE`). Stil bitleri: yazı hizalama `0x200000` sol, `0x400000` sağ, `0x800000` ortala, `0x4000000` dikey ortala,
`0x100000` tek satır. Koordinatlar pencerenin sol üst köşesine göredir. UV'ler doku boyuna göre 0–1.
Doğrulama: 185/187 dosya dosya sonuna tam oturuyor; kalan 2'si bu oyunda kullanılmayan 14'ten büyük yeni öğe türleri içeriyor.

## Web'e aktarım
`npm run arayuz` her pencereyi `donusturulmus/web/arayuz/<ad>.json` (sadeleştirilmiş ağaç) ve kullandığı dokuları `arayuz/doku/*.png` yapar.
İstemci (`client/src/arayuz/orijinal.ts`) ağaçtan HTML üretir: resimler UV ile kırpılmış sprite, düğmeler 4 duruma sahip, yazılar,
ilerleme çubukları ve yuvalar kimlikle (`Text_Level`, `progress_HP`, `btn_str`…) oyun verisine bağlanır (`oyunArayuzu.ts`).

## Entegre pencereler
| Kısayol | Pencere | Dosya |
|---|---|---|
| (üstte) | HP / MP / EXP çubuğu, fps, koordinat | `re_el_hpbar` |
| (altta) | Görev çubuğu: Inventory, Character, Skill, kamera düğmeleri | `re_el_taskbar_main` |
| **U** | Karakter durumu (statüler, +puan harcama) | `re_el_page_state` |
| **K** | Skill (El Morad Savaşçı temel skilleri, gerçek adlar/simgeler) | `re_el_skill` |
| **I** | Envanter (28 çanta yuvası + ekipman) | `re_el_inventory` |

Kısayol tuşlarını (U, K, I) oyunun istemci dosyalarında bulamadık (varsayılanlar `KnightOnline.exe` içinde); istek üzerine bu değerler kullanıldı.

## Skill verisi
`npm run beceriler` → `Data/SkillMagicTable_us.tbl` (sütun 0 numara, 2 ad, 3 açıklama, 15 gereken seviye, 16 sayfa kodu, 17 MP).
Simge: `UI/skillicon_<numaranın son 2 hanesi>_<sayfa kodu>.dxt`. El Morad Savaşçı temel sayfası = 2010.

## Tür 17 (kademeli ilerleme çubuğu)
`re_target_framebar`da görülen arayüz türü 17 (RTTI: `CN3UIGradualProgress`) **ek alan taşımaz** (temel alanlar + çocuklar; çocuk resimleri `r` durumlarıyla: 0 arka, 1 dolu kısım, 2 geriden gelen katman). 15, 16, 18-20 türleri henüz görülmedi. Kanıt: tür 17 ek alansız okununca dosya baytı baytına tükeniyor (test: `uif.test.ts`). Hedef çerçevesi: `frame_0..11` hedef türü çerçeveleri, `grpg_level_0..3` seviye farkı renkleri (eşikler tahmin), `name`, `Text_Health`.
