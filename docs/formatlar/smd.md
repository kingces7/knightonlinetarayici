# `.smd` — server harita dosyası

Kaynak: server `shared/SMDFile.cpp` ve `N3BASE/N3ShapeMgr.cpp` (Myko_Source.rar). Dosyalar server paketinde
`Depo/Map/*.smd`. Okuyucu: `araclar/harita/smd.ts` (test: `smd.test.ts`). Hepsi little-endian.

| Bölüm | İçerik |
|---|---|
| Yükseklik | `int32 N`, `float birim`, `float yukseklik[N*N]` |
| Çarpışma | `float genislik, uzunluk`, `int32 yuzSayisi`, `float3 koseler[yuzSayisi*3]` (üçgenler) |
| Hücreler | 16 m'lik hücrelerde (z dış, x iç döngü) `uint32 var`; varsa `int32 sekilSayisi`, `uint16 sekil[]`, sonra 4×4 alt hücre (4 m) × `{int32 ucgenSayisi, uint32 koseIndeksi[ucgenSayisi*3]}` |
| Nesne olayları | `int32 adet`, 24 baytlık kayıtlar `{int32 sahip, int16 indeks, int16 tur, int16 npc, int16 durum, float x,y,z}` (kapılar, kollar…) |
| Karo olayları | `int16 olay[N*N]` — sunucuya göre `0` = yürünebilir, `>=2` = olay/kapı. Moradon'da hepsi 0 |
| Doğuş noktaları | `int32 adet`, 20 baytlık kayıtlar `{float x,y,z, alanZ, alanX}` (Moradon'da yok) |
| Işınlanma kapıları | `int32 adet`, 320 baytlık hizalamasız `_WARP_INFO`: `id@0 ad@2 duyuru@34 ücret@292 bölge@296 x,y,z,r@300 millet@316` |

## Bulgular
- Çarpışma üçgenlerinin ve olay konumlarının koordinatı **istemcinin `.gtd` arazisiyle aynı** dünya
  koordinatıdır (x, y yukarı, z). Sahnede `(x, y, -z)` olarak çizilir. Testle doğrulandı: köşelerin
  %70'i araziye 6 m içinde (x,z sırası); x/z yer değiştirseydi %30 olurdu.
- `.smd` içindeki yükseklik ızgarası `.gtd` ile **haritaya göre** x/z yer değiştirmiş ya da aynı sıradadır (ölçüm: `npm run harita-eslesme`, 58 client haritasının hepsi, 2026-11-19):
  **yer değiştirmiş** (`smd[z*N+x] == gtd[x*N+z]`): yalnız `moradon` (%85,2), `moradon_xmas` (%100) ve `bossmode` (%100).
  **Aynı sıra** (`smd[x*N+z] == gtd[x*N+z]`): geri kalan bütün eşleşenler, ör. `karus2004` %81,9 (devrik yalnız %8), `elmo2004` %90,3, `14th_oldmoradon` %98,6, `battlezone` %98, `dungeon_b1th` %100, `freezone_a` %99,7, `war_a` %73.
  Eskiden burada "hepsi x/z yer değiştirmiş" yazıyordu; bu yalnız Moradon ailesi için doğruydu. Oyunda arazi için `.gtd` kullanılır; dönüştürücü `.smd` yüksekliğini kullanmaz, yalnız çarpışma üçgenleri ve kapıları alır
  (üçgen koordinatı iki durumda da `.gtd` dünya koordinatıdır).
- İstemci harita adı ile sunucu dosyası eşleşmesi: `moradon` → `1098moradon_0826.smd` (sunucu v1098'in güncel Moradon'u; `moradon_0826.smd` ile yükseklik ve çarpışma aynı, yalnız kapı listesi farklı — 1098'de Kecoon Valley kapıları var).
  Eşleşme `araclar/harita/cli.ts` içindeki `SUNUCU_HARITASI` tablosunda.
- Zemin/duvar ayrımı istemcide yapılır (`client/src/dunya/carpisma.ts`): normal.y > 0,55 → yürünebilir zemin
  (köprü, kat, merdiven), |normal.y| ≤ 0,55 → duvar.

- **Eski Moradon:** `14th_oldmoradon.gtd` (129×129) ile eşleşen sunucu dosyası `old_moradon.smd`dir (yükseklik %94 aynı, bu haritada x/z yer değiştirmemiş). `14th_oldmoradon.smd` 257'lik başka bir haritadır, eşleşmez. Eski dosyalardaki kapı adları Korece (CP949) kodlu; okuyucu `euc-kr` ile çözer.

## Dışa aktarım
`npm run harita -- moradon` artık `donusturulmus/web/harita/moradon/` altına şunları da yazar:
- `carpisma.bin` — ham float32, üçgen başına 9 sayı (Moradon: 31.077 üçgen, 1,1 MB)
- `sunucu.json` — ışınlanma kapıları, nesne olayları, doğuş noktaları

## `.smd` ↔ client haritası eşleşmesi (2026-11-19, bugger raporu H-2)
Sunucu paketindeki 61 `.smd`'nin çoğu başka haritanın kopyasıdır ve **32 bölgenin `.smd`'si client haritasıyla uyuşmaz**. Yanlış `.smd`'den gelen çarpışma ve kapı verisi client haritasının duvarlarına uymaz.
- **Denetim:** `araclar/harita/eslesme.ts` yükseklik ızgaralarını karşılaştırır (iki hücre < 1 m fark = aynı; iki x/z yönü denenir). Boyut farklıysa ya da benzerlik **%50'nin altındaysa** `npm run harita -- <ad>` (ve `--sadece-sunucu`) `carpisma.bin` ve `sunucu.json` **yazmaz**, nedenini söyler; yine de yazmak için `--zorla`. Client `.gtd` okunamıyorsa da yazmaz.
- **Tablo:** `SUNUCU_HARITASI` (aynı dosyada) client harita adı → `.smd`. Bölge bazında (`ZONE_INFO1098.strZoneSmdName` ↔ client `Zones.csv`) ölçülerek doğrulandı; adı `<ad>.smd` olmayanlar buradadır.
- **Tarama:** `npm run harita-eslesme` (tüm `.gtd`'ler), `-- --en-iyi` (aynı boyuttaki en iyi `.smd` adayları), `-- --eksik` (client `Zones.csv`'nin gösterdiği ama olmayan dosyalar).

**Birebir kopya `.smd` dosyaları (md5 aynı):** `1098karus2004` = `2003_karus_oldtime` = **`dungeond`** (Luferson'un 42 kapısıyla); `14th_oldmoradon` = `2017_flagwar` = `LK_war_a01` = `battlezone_67` = `testwar2012`; `In_Dungeon05` = `In_Dungeon06` = `sky_war_2009` = `bossmode`; `dungeon_b1th` = `dungeon_b3th2015`; `battlezone_e` = `battlezone_e_fl`; `dungeon_a` = `dungeondsavas`.

**Uyuşan (güvenilir) eşleşmeler (28):** `karus2004` %81,9, `elmo2004` %90,3, `moradon` %85,2, `moradon_xmas` %100, `14th_oldmoradon` %98,6, `arena` %100, `battlezone` %98, `battlezone_b` %90,2, `battlezone_d` %93,9, `battlezone_e` %83,2, `battlezone_e_fl` %80,1, `bossmode` %100, `dungeon_a` %62, `dungeon_b1th` %100, `dungeon_b2th` %88,2, `freezone` %99,9, `freezone_a` %99,7, `freezone_a_event2012` %80, `freezone_b` ve `newfreezone_b` %50,9 (eşiğin hemen üstünde), `In_dungeon01/02/03` %67/90/65, `war_a` %73, `warfreezone_a_event2012` %80, `clanfight` %98,9, `clanfight_c` %100, `freezone_new` ↔ `itemzone_a.smd` %100.

**Çarpışma verisi GÜVENİLMEZ olan bölgeler** (bölge · sunucu `.smd` · client `.gtd` · neden): 18 Kecoon Valley (`1098moradon_0826` ↔ `2017_flagwar`, %0; ama oyunda bölge 18 `moradon` kullanıyor, bkz. `haritalar.ts`), 28/106 Old Human ve Piana War (`elmo_oldtime_2003` ↔ `Old_Elmo` %0), 34/94 Felankor Lair (`dragon_a` 257 ↔ 33), 35/105/110 Delos Basement, Zindan War, Snow War (`dungeond` 513 ↔ 129), 36 Flag War (%8,5), 51-55 ve 92 clanfight (`clanfight_b.smd` ↔ `clanfight_b.gtd` %25,5; sunucunun dosyası `clanfight_c.gtd`/`clanfight.gtd` ile %100/%98,9 örtüşüyor), 66 Oreads (257 ↔ 513), 73/108 Ronark Land Base (257 ↔ 513), 75 Krowaz Domion (`itemzone_a` ↔ `itemzone_a.gtd` %13,1; sunucu dosyası client'ın `freezone_new.gtd`'siyle %100), 78 Clan War Ronark Land (513 ↔ 257), 84 Border Defance War, 85 Chaos Dengueon, 96-99 Party War, 89 Dungeon Defence (boyut farklı), 87 Juraid Mountain (%0,5), 95 Drakis Tower (%0), 107 Mini Colony Zone (%3), 111 Night Delos War (%0), 29 Old Moradon (257 ↔ 129, belgelenmiş). **Belirsiz:** bölge 63 Nieds Triangle (`BattleZone_d.smd`) için `Zones.csv`'de iki satır var: 630 → `Worldwar.gtd` (%17,5, uyuşmaz) ve 6300 → `BattleZone_d.gtd` (%93,9, uyuşur); client'ın hangisini kullandığı doğrulanmadı. Bölge 18 için de 180 → `2017_flagwar.gtd`, 1800 → `Old_Karus.gtd` satırları var.
Bu bölgeler oyuna alınırken doğru `.smd` aranmalı ya da çarpışma `.opd`'den üretilmeli (`carpisma-opd.ts`).

## Bozuk çarpışma üçgenleri
`1098freezone_a`, `freezone`, `freezone_a`, `freezone_a_event2012` ve `freezone_b_2012event` dosyalarında **11.319 üçgenin 1586'sı bozuktur** (56'sı NaN/sonsuz, 1530'u |değer| > 1e5, en büyüğü ≈ 3,4e38; dizinin 648–2270 aralığında, 32 ardışık blok). Dosya bozulması mı yanlış okunan bir yapı mı **doğrulanmadı**; bu üçgenlere bağlı yalnızca 2 hücre var, sunucuya etkisi doğrulanmadı.
`smdOku` bozuk sayısını `bozukYuz` olarak verir (`yuzler` olduğu gibi kalır, çünkü `hucreler` üçgen sırasına göre indeksler); `saglamYuzler()` bozukları atar ve dışa aktarım (`carpisma.bin`) bunu kullanır (`npm run harita -- freezone_a` → "1586 bozuk üçgen atlandı", 9733 üçgen). Klasördeki 61 `.smd`'nin geri kalan 56'sında bozuk üçgen yok (hepsi tarandı; test: `eslesme.test.ts`).

## Henüz kullanılmayan
`uint16 sekil[]` (hücredeki nesne numaraları), `karoOlay` (olay karoları), kapılar ve nesne olayları (kapı/kol işlevleri).
