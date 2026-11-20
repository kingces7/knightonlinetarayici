# Bölge → harita eşlemesi ve tüm haritaların dönüştürülmesi (fast, 2026-11-20)

İstek (müdür/ces): "admin karakterim istediği haritada dolaşabilmeli; bütün haritalar yüklenebilsin, tüm portalları kullanıp istediğim haritaya gidebileyim."

## Özet
- Sunucuda **77 bölge** (`ZONE_INFO1098`) var. **71'i** client haritasına eşlendi (47 **tam**: çarpışma + kapı verisi var, 24 **görsel**: yalnız arazi + nesneler), **6'sı eksik** (aşağıda neden).
- Bu 71 bölge **42 ayrı client haritası** kullanıyor; hepsi `donusturulmus/web/harita/<ad>/` altına dönüştürüldü (git'e girmez, toplam 1,5 GB; 37'si bu görevde, 5'i daha önce vardı).
- Eşleme `donusturulmus/web/harita/bolgeler.json` dosyasında; `client/src/oyun/haritalar.ts` açılışta bunu okur. Kapı listesinde haritası olan her bölge artık **aktif** (gri değil).
- 42 haritanın **hepsi headless Edge'de açıldı** (`?harita=<ad>&giris=0`): hata yok, çökme yok (ekran görüntüleri kontrol edildi).

## Nasıl çalışır
1. `powershell -ExecutionPolicy Bypass -File araclar\harita\bolge-disa-aktar.ps1` → bölge tablosu + başlangıç noktaları (SQL Server'dan **salt okunur**, `ApplicationIntent=ReadOnly`) → `donusturulmus/tablolar/bolge-sunucu.json`.
2. `node harita/bolge-tara.ts` (araclar klasöründe) → eşlemeyi hesaplar: `bolgeler.json` (eşleşenler), `bolgeler-eksik.json` (eşleşmeyenler + neden).
3. `node harita/bolge-tara.ts --donustur` → her harita için `harita/cli.ts` (+ gökyüzü `oyun/gokyuzu.ts`); var olanları atlar (`--yeniden` ile baştan).
4. Test: `client/scripts/haritaAcmaTesti.mjs` (tarayıcıda hepsini açıp süre/bellek/hata ölçer), `araclar/harita/bolge.test.ts` (json tutarlılığı).

Eşleme kuralı (sunucu .smd'si = bölgenin gerçekten kullandığı harita, çarpışma/kapı ondan gelir; yükseklik ızgarası benzerliği ≥ %50 = uyuşuyor):
- **A** Zones.csv'nin o bölge için gösterdiği `.gtd` .smd ile uyuşuyorsa → tam.
- **B** .smd adı aynı olan başka bir `.gtd` uyuşuyorsa → tam (ör. bölge 75 → `freezone_new` %100; Zones.csv `itemzone_a` %13 gösteriyor).
- **C** uyuşan yok ama Zones.csv'deki `.gtd` var → **görsel** (çarpışma/kapı verisi yazılmaz).
- **D** Zones.csv'de yok; tüm `.gtd`'ler arasında tek ve güçlü (≥ %70) eşleşme → tam.
- Elle: 18 → `moradon` (xmas sürümü değil), 21 → `14th_oldmoradon` (proje kararı).
- Yeni haritalarda varsayılan: `canavar:false` (canavarlar sunucudan), `deneyimKaybi` = `ZONE_INFO.ExpLost`, başlangıç = `START_POSITION1098` (harita sınırı içindeyse).

## client'ta değişenler
- `client/src/oyun/haritalar.ts`: `bolgeleriYukle()` (`/harita/bolgeler.json`), `haritaAyari(ad)`, `BOLGE_BILGISI`; 4 elle harita (moradon, 14th_oldmoradon, karus2004, elmo2004) ve ayarları (şehir/town, başlangıç, deneyimKaybi) aynen korundu; dosya yoksa yalnız bunlar çalışır.
- `client/src/main.ts` (cerrahi): `ayar` artık `basla()` başında `bolgeleriYukle()` sonrası `haritaAyari(HARITA)` ile belirlenir; import güncellendi.
- `client/src/oyun/sunucuVerisi.ts`: konum uygulama koşuna "bölgenin haritası = yüklü harita" eklendi (aynı haritayı paylaşan bölgeler — Luferson II/III, Moradon II–V, Eslant — girişte konumu doğru uygular).
- `araclar/harita/eslesme.ts`: `eslantzone → k_eslant.smd` eklendi.

## Eksik bölgeler (6)
| Bölge | Bölge adı | Sunucu haritası (.smd) | Neden |
|---|---|---|---|
| 65 | Moradon War | Msoft_Moradon_war.smd | Zones.csv'nin gösterdiği BattleZone_f.gtd client klasöründe yok; hiçbir .gtd ile tek ve güçlü yükseklik uyuşması yok |
| 67 | Test Zone | battlezone_67.smd | Zones.csv'nin gösterdiği battlezone_67.gtd client klasöründe yok; hiçbir .gtd ile tek ve güçlü yükseklik uyuşması yok |
| 71 | Colony Zone | 1098freezone_b.smd | Zones.csv'nin gösterdiği Freezone_b.lilith client klasöründe okunamayan .lilith biçiminde; hiçbir .gtd ile tek ve güçlü yükseklik uyuşması yok |
| 88 | Lk War | LK_war_a01.smd | Zones.csv'nin gösterdiği LK_war_a01.gtd client klasöründe yok; hiçbir .gtd ile tek ve güçlü yükseklik uyuşması yok |
| 109 | Moradon War | Msoft_Moradon_war.smd | Zones.csv'nin gösterdiği moradonwar_gtd.lilith client klasöründe okunamayan .lilith biçiminde; hiçbir .gtd ile tek ve güçlü yükseklik uyuşması yok |
| 112 | Folk War | kobawar.smd | Zones.csv'nin gösterdiği folk_war.lilith client klasöründe okunamayan .lilith biçiminde; hiçbir .gtd ile tek ve güçlü yükseklik uyuşması yok |

Bunlar kaynakta yok ya da okunamayan `.lilith` biçiminde; (65, 67, 88, 109 dahil) client'ta haritası olmadığı için kapı listesinde gri kalır.

## Sorunlu / dikkat edilecek eşlemeler
- **Görsel (24 bölge):** `.smd` yüksekliği client `.gtd` ile uyuşmuyor ya da ızgara boyu farklı. Çarpışma ve kapı verisi (`carpisma.bin`, `sunucu.json`) yazılmadı; GM yürürken duvar/engel olmaz. Boyutu farklı olanlarda (Felankor 33×33 ↔ 257×257, Delos Basement, Oreads, Ronark Land Base, Chaos Dengueon, Party War, Dungeon Defence, Border Defance War, Snow War…) sunucu koordinatları client haritasına **uymayabilir**: ışınlanınca karakter harita dışında çıkabilir (ör. başlangıç 1000,1000 olan bölgeler).
- **Eslant (11–16):** tek harita, iki .smd (`k_eslant`/`e_eslant`: yükseklik aynı, kapı listesi farklı). Karus'unki seçildi; karar bekliyor.
- **Bölge 113/114 (Ronark Land):** .smd uyumu %50,9 (eşiğin hemen üstünde); `freezone_b` ve `newfreezone_b` aynı veriyi kullanıyor.
- **Bölge 75 / 51–55 / 92:** Zones.csv'nin gösterdiği harita (`itemzone_a`, `clanfight_b`) sunucu .smd'siyle uyuşmuyor; uyuşan kopya (`freezone_new`, `clanfight_c`) seçildi.
- Zones.csv'nin 63 için iki satırı var (630 Worldwar, 6300 BattleZone_d); 6300 uyuştuğu için `battlezone_d`.
- Bazı haritalarda arazi eksikleri (Worldwar .gtt, itemzone_a sıfır karolar): `docs/raporlar/2026-11-20-karo-taramasi-fast.md`.

## Eşlenen bölgeler (71)
| Bölge | Bölge adı | Client haritası | Durum | .smd uyumu | Not |
|---|---|---|---|---|---|
| 1 | Luferson Castle | karus2004 | tam | %81.9 |  |
| 2 | El Morad Castle | elmo2004 | tam | %90.3 |  |
| 5 | Luferson Castle II | karus2004 | tam | %81.9 |  |
| 6 | Luferson Castle III | karus2004 | tam | %81.9 |  |
| 7 | El Morad Castle II | elmo2004 | tam | %90.3 |  |
| 8 | El Morad Castle III | elmo2004 | tam | %90.3 |  |
| 11 | Eslant | eslantzone | tam | %80.6 |  |
| 12 | Elmorad Eslant | eslantzone | tam | %80.6 |  |
| 13 | Karus Eslant II | eslantzone | tam | %80.6 |  |
| 14 | Karus Eslant III | eslantzone | tam | %80.6 |  |
| 15 | Elmorad Eslant II | eslantzone | tam | %80.6 |  |
| 16 | Elmorad Eslant III | eslantzone | tam | %80.6 |  |
| 18 | Kecoon Valley | moradon | tam | %85.2 |  |
| 21 | Moradon | 14th_oldmoradon | tam | %98.6 |  |
| 22 | Moradon II | moradon | tam | %85.2 |  |
| 23 | Moradon III | moradon | tam | %85.2 |  |
| 24 | Moradon IV | moradon | tam | %85.2 |  |
| 25 | Moradon V | moradon | tam | %85.2 |  |
| 28 | Old Human | old_elmo | görsel | %0.0 | .smd yüksekliği client haritasıyla uyuşmuyor (%0.0): çarpışma/kapı verisi yazılmaz |
| 29 | Old Moradon | 14th_oldmoradon | görsel | boyut 129≠257 | sunucu haritası 257×257, client 129×129: sunucu koordinatları client haritasına uymayabilir |
| 30 | Delos | war_a | tam | %73.0 |  |
| 31 | Bifrost | dungeon_a | tam | %62.0 |  |
| 32 | Desperation Abyss | dungeon_b1th | tam | %100.0 |  |
| 33 | Hell Abyss | dungeon_b2th | tam | %88.2 |  |
| 34 | Felankor Lair | dragon_a | görsel | boyut 33≠257 | sunucu haritası 257×257, client 33×33: sunucu koordinatları client haritasına uymayabilir |
| 35 | Delos Basement | dungeond | görsel | boyut 129≠513 | sunucu haritası 513×513, client 129×129: sunucu koordinatları client haritasına uymayabilir |
| 36 | Flag War | 2017_flagwar | görsel | %8.5 | .smd yüksekliği client haritasıyla uyuşmuyor (%8.5): çarpışma/kapı verisi yazılmaz |
| 48 | Battle Arena | arena | tam | %100.0 |  |
| 51 | Kecoon Valley | clanfight_c | tam | %100.0 |  |
| 52 | Blood Don Quest | clanfight_c | tam | %100.0 |  |
| 53 | Goblin Quest | clanfight_c | tam | %100.0 |  |
| 54 | Cape Quest | clanfight_c | tam | %100.0 |  |
| 55 | Forgotten Temple | clanfight_c | tam | %100.0 |  |
| 61 | Napies Gorge | battlezone | tam | %98.0 |  |
| 62 | Alseids Prairie | battlezone_b | tam | %90.2 |  |
| 63 | Nieds Triangle | battlezone_d | tam | %93.9 |  |
| 64 | Nereids Island | battlezone_e | tam | %83.2 |  |
| 66 | Oreads | new_runawar | görsel | boyut 257≠513 | sunucu haritası 513×513, client 257×257: sunucu koordinatları client haritasına uymayabilir |
| 69 | Snow War | battlezone_b | tam | %90.2 |  |
| 72 | Ardream | freezone_a | tam | %99.7 |  |
| 73 | Ronark Land Base | freezone_c | görsel | boyut 257≠513 | sunucu haritası 513×513, client 257×257: sunucu koordinatları client haritasına uymayabilir |
| 74 | Test Zone | freezone | tam | %99.9 |  |
| 75 | Krowaz Domion | freezone_new | tam | %100.0 |  |
| 76 | Knight Royale | battlezone_e_fl | tam | %80.1 |  |
| 77 | Clan War Ardream | freezone_a_event2012 | tam | %80.0 |  |
| 78 | Clan War Ronark Land | freezone_b_2012event | görsel | boyut 513≠257 | sunucu haritası 257×257, client 513×513: sunucu koordinatları client haritasına uymayabilir |
| 81 | Monster Stone | in_dungeon01 | tam | %67.1 |  |
| 82 | Monster Stone II | in_dungeon02 | tam | %90.1 |  |
| 83 | Monster Stone III | in_dungeon03 | tam | %65.3 |  |
| 84 | Border Defance War | in_dungeon04 | görsel | boyut 65≠257 | sunucu haritası 257×257, client 65×65: sunucu koordinatları client haritasına uymayabilir |
| 85 | Chaos Dengueon | sky_war_2009 | görsel | boyut 65≠257 | sunucu haritası 257×257, client 65×65: sunucu koordinatları client haritasına uymayabilir |
| 86 | Under The Castle | bossmode | tam | %100.0 |  |
| 87 | Juraid Mountain | in_dungeon05 | görsel | %0.5 | .smd yüksekliği client haritasıyla uyuşmuyor (%0.5): çarpışma/kapı verisi yazılmaz |
| 89 | Dungeon Defence | dungeon_defense | görsel | boyut 65≠257 | sunucu haritası 257×257, client 65×65: sunucu koordinatları client haritasına uymayabilir |
| 92 | Prison | clanfight_c | tam | %100.0 |  |
| 93 | Isillion Lair | dungeon_b2th | tam | %88.2 |  |
| 94 | Felankor Lair | dragon_a | görsel | boyut 33≠257 | sunucu haritası 257×257, client 33×33: sunucu koordinatları client haritasına uymayabilir |
| 95 | Drakis Tower | dungeon_b3th2015 | görsel | %0.0 | .smd yüksekliği client haritasıyla uyuşmuyor (%0.0): çarpışma/kapı verisi yazılmaz |
| 96 | Party War 1 | in_dungeon06 | görsel | boyut 65≠257 | sunucu haritası 257×257, client 65×65: sunucu koordinatları client haritasına uymayabilir |
| 97 | Party War 2 | in_dungeon06 | görsel | boyut 65≠257 | sunucu haritası 257×257, client 65×65: sunucu koordinatları client haritasına uymayabilir |
| 98 | Party War 3 | in_dungeon06 | görsel | boyut 65≠257 | sunucu haritası 257×257, client 65×65: sunucu koordinatları client haritasına uymayabilir |
| 99 | Party War 4 | in_dungeon06 | görsel | boyut 65≠257 | sunucu haritası 257×257, client 65×65: sunucu koordinatları client haritasına uymayabilir |
| 105 | Zindan War | dungeond | görsel | boyut 129≠513 | sunucu haritası 513×513, client 129×129: sunucu koordinatları client haritasına uymayabilir |
| 106 | Piana War | old_elmo | görsel | %0.0 | .smd yüksekliği client haritasıyla uyuşmuyor (%0.0): çarpışma/kapı verisi yazılmaz |
| 107 | Mini Colony Zone | freezone_b_2012event | görsel | %3.2 | .smd yüksekliği client haritasıyla uyuşmuyor (%3.2): çarpışma/kapı verisi yazılmaz |
| 108 | Ronark Land Base | freezone_c | görsel | boyut 257≠513 | sunucu haritası 513×513, client 257×257: sunucu koordinatları client haritasına uymayabilir |
| 110 | Snow War | xmas_battle | görsel | boyut 129≠513 | sunucu haritası 513×513, client 129×129: sunucu koordinatları client haritasına uymayabilir |
| 111 | Night Delos War | worldwar | görsel | %0.0 | .smd yüksekliği client haritasıyla uyuşmuyor (%0.0): çarpışma/kapı verisi yazılmaz |
| 113 | Ronark Land | newfreezone_b | tam | %50.9 |  |
| 114 | Castle Colony Zone | freezone_b | tam | %50.9 |  |
| 115 | Mini Ardream | warfreezone_a_event2012 | tam | %80.0 |  |

## Performans (headless Edge, yazılım GL, temiz önbellek, `localhost` Vite dev)
Hepsi 1–3,1 sn'de açıldı; çökme yok. En ağırları: `newfreezone_b` (bölge 113, Ronark Land: 3,1 sn, 105 MB indirme, **JS belleği 509 MB**, 1,7 milyon üçgen — en yük bindiren), `karus2004` (109 MB indirme), `freezone_b`/`freezone_new`/`elmo2004` (~800–900k üçgen). Dungeon'lar (Bifrost, Abyss, Felankor…) küçük: 22–47 MB, <1,9 sn. Ölçüm yazılım GL ile yapıldı; GPU'lu gerçek tarayıcıda süre ve bellek farklı olabilir. `newfreezone_b` zayıf makinede ilk izlenecek haritadır.

| Harita | Izgara (m) | İlk yükleme (sn) | İndirilen (MB) | JS belleği (MB) | Üçgen |
|---|---|---|---|---|---|
| 14th_oldmoradon | 512 | 1.8 | 74.2 | 156 | 191k |
| 2017_flagwar | 1024 | 1.4 | 45 | 124 | 699k |
| arena | 256 | 0.8 | 28.4 | 75 | 36k |
| battlezone | 1024 | 1.8 | 73.3 | 101 | 224k |
| battlezone_b | 1024 | 1.1 | 54.8 | 78 | 209k |
| battlezone_d | 1024 | 1.3 | 51.6 | 80 | 216k |
| battlezone_e | 1024 | 1.6 | 56.6 | 101 | 183k |
| battlezone_e_fl | 1024 | 1.4 | 53.6 | 83 | 220k |
| bossmode | 1024 | 1.1 | 50.5 | 105 | 322k |
| clanfight_c | 256 | 0.8 | 27.1 | 45 | 29k |
| dragon_a | 128 | 0.8 | 23.6 | 61 | 22k |
| dungeon_a | 1024 | 1.9 | 47 | 100 | 325k |
| dungeon_b1th | 512 | 1.1 | 33.6 | 91 | 118k |
| dungeon_b2th | 512 | 0.9 | 22.3 | 71 | 79k |
| dungeon_b3th2015 | 512 | 0.9 | 31.4 | 82 | 105k |
| dungeon_defense | 256 | 1.6 | 35 | 53 | 91k |
| dungeond | 512 | 1.2 | 37.2 | 74 | 113k |
| elmo2004 | 2048 | 2.7 | 101.6 | 205 | 891k |
| eslantzone | 1024 | 2.4 | 78.6 | 106 | 266k |
| freezone | 1024 | 2.1 | 68 | 127 | 219k |
| freezone_a | 1024 | 2.3 | 69.1 | 95 | 221k |
| freezone_a_event2012 | 1024 | 1.4 | 63.7 | 85 | 177k |
| freezone_b | 2048 | 2.6 | 80.2 | 135 | 830k |
| freezone_b_2012event | 2048 | 2 | 70.5 | 124 | 646k |
| freezone_c | 1024 | 1.6 | 52 | 84 | 256k |
| freezone_new | 2048 | 2.3 | 90 | 151 | 830k |
| in_dungeon01 | 256 | 1.3 | 36.9 | 72 | 59k |
| in_dungeon02 | 256 | 1.5 | 36.7 | 58 | 40k |
| in_dungeon03 | 256 | 1.7 | 35.9 | 82 | 62k |
| in_dungeon04 | 256 | 1 | 38.7 | 87 | 31k |
| in_dungeon05 | 1024 | 1.1 | 34.3 | 85 | 204k |
| in_dungeon06 | 256 | 1 | 40.1 | 96 | 91k |
| karus2004 | 2048 | 2.9 | 109.3 | 240 | 926k |
| moradon | 1024 | 2.8 | 95 | 146 | 601k |
| new_runawar | 1024 | 1.6 | 53.2 | 108 | 383k |
| newfreezone_b | 2048 | 3.1 | 104.9 | 509 | 1696k |
| old_elmo | 2048 | 1.9 | 83.8 | 153 | 744k |
| sky_war_2009 | 256 | 0.7 | 28.3 | 76 | 16k |
| war_a | 1024 | 1.5 | 41.6 | 99 | 200k |
| warfreezone_a_event2012 | 1024 | 1.3 | 69.2 | 96 | 177k |
| worldwar | 1024 | 1.5 | 62.2 | 90 | 284k |
| xmas_battle | 512 | 1 | 40.6 | 88 | 94k |

(`kaynakMB`: sayfanın açılışta indirdiği çözülmüş veri; harita + client ortak dosyalar dahil.)

## Doğrulama
- `node --test` (araclar): 66/66; `tsc --noEmit` hem `araclar` hem `client` temiz.
- Tarayıcı: 42/42 harita açıldı (`client/scripts/haritaAcmaTesti.mjs`); ekran görüntüsü örnekleri Bifrost, Krowaz, Felankor, Worldwar doğru görünüyor. Konsolda yalnız 5 haritada (14th_oldmoradon, elmo2004, karus2004, freezone_new, sky_war_2009) birer "404" satırı çıktı; kaynağı bulunamadı (istek günlüğüyle yeniden denemede çıkmadı, muhtemelen favicon). Oyunu etkilemiyor.
- Sunucu girişi ve gerçek ışınlanma bu görevde **denenmedi** (sunucu tarafı müdürde); yalnız harita yüklenmesi ve eşleme doğrulandı.
