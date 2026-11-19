# Arazi karo taraması — yollardaki bozuk karolar (fast, 2026-11-20)

Kullanıcı: "Haritada hâlâ bozuk görünen karolar var, özellikle yollarda" (kırmızı işaretli fotoğraf). **Fotoğraf bana ulaşmadı** (diskte yok); sonuç fotoğraftan bağımsız, 58 haritanın hepsinin ölçümüne ve gerçek client ekran görüntülerine dayanıyor.

## 1. Sonuç
**Kök neden:** client'taki arazi shader'ının karo yön eşlemesi yanlıştı. Her karonun yön kodu (0-7), karo dokusunun kare üzerine nasıl döndürüleceğini/aynalanacağını belirler. Önceki "düzeltme" (`karo-yon-arastirma.ts`) yön kodunu bir "dönüşüm numarası" gibi yorumlamıştı. Bu eşleme, çaprazdan giden yollarda taş parçalarını merdiven/elmas biçiminde kırık gösteriyordu. Doğrusu orijinal `N3Terrain.cpp` tablosunun (`m_fTileDirU/V`) aynen uygulanmasıdır.

**Düzeltme:** `client/src/dunya/arazi.ts` `yonUv` artık orijinal tabloyu (köşe eşlemesi A=[2], B=[0], C=[1], D=[3]) dönüşümsüz kullanır. Gerçek client'ta (Luferson şehri, eski Moradon, El Morad) ekran görüntüsüyle doğrulandı: yollar ve zemin yamaları kesintisiz.

## 2. Kanıt
- **Eski aracın yanılgısı:** `karo-yon-arastirma.ts` "tüm karolara aynı dönüşüm uygulanınca dikiş sürekliliği değişmez" varsayıyordu ve "orijinal" adayı v-çevrilmiş kurmuştu. Karo kenarları yönlüdür; global dönüşüm dikişleri değiştirir.
- **Ölçü** (karus2004, komşu karo dikişlerinde "kötü dikiş" = ortak kenarda renk farkı > 40; orijinal tablonun 8 global dönüşümü): **kimlik %2,2**, yatay ayna %6,1, dikey ayna %7,5, 180° %10,1, döndürmeler %19-23. Düzeltmeden önceki shader (C) %6,6; ilk eski tablo %12,7. Diğer haritalarda kimlik/C: eski Moradon %0,9 / %3,9; Moradon %4,5 / %7,5; El Morad %2,6 / %5,3.
- **Görsel:** `donusturulmus/onizleme/kd_karus_town_C.png` (önceki: kırık elmas/merdiven yol) ve `kd_karus_town_O.png` (orijinal tablo: kesintisiz yol); git'e girmez.
- **Gerçek client:** `client/scripts/arazKarsilastir.mjs` ile `?dokuv=3` (düzeltilmiş) ve `?dokuv=2` (eski tablo) aynı noktadan: eski tabloda kırık taş parçaları ve siyah elmas boşlukları, yeni tabloda pürüzsüz yol.

## 3. 58 haritanın taraması
Komut: `node araclar/harita/karo-tara.ts` (tek harita: `... karus2004`). Her harita doğrudan oyun dosyalarından yüklendi. O = orijinal tablo, C = düzeltmeden önceki shader. Sütunlar: ortalama dikiş farkı / kötü dikiş oranı (örneklenmiş komşu çiftler).

Ölçülebilen 56 haritada **orijinal tablo 50'sinde daha iyi, 6'sında eşit, hiçbirinde kötü değil**; ortalama kötü dikiş %6,41 → %3,11. `dungeon_b1th` ve `dungeon_b2th`'de karo dokusu yok (yalnız renk haritası).

| harita | N | karo sayısı | O (orijinal) | C (önceki) |
|---|---|---|---|---|
| 14th_oldmoradon | 129 | 226 | 13.3 / %1.2 | 15.3 / %4.2 |
| 2017_flagwar | 257 | 51 | 17.1 / %5.3 | 21.7 / %12.1 |
| arena | 65 | 18 | 20.8 / %0.5 | 21.6 / %1.6 |
| bat_b_20050718 | 257 | 175 | 13.6 / %1.2 | 14.0 / %1.3 |
| battlezone | 257 | 407 | 23.8 / %3.2 | 27.0 / %9.2 |
| battlezone_b | 257 | 175 | 13.6 / %1.2 | 14.0 / %1.3 |
| battlezone_c | 257 | 158 | 17.5 / %4.3 | 18.6 / %5.5 |
| battlezone_d | 257 | 157 | 17.6 / %4.4 | 18.7 / %5.6 |
| battlezone_e | 257 | 271 | 19.2 / %4.3 | 23.0 / %11.5 |
| battlezone_e_fl | 257 | 158 | 22.9 / %2.4 | 24.3 / %3.4 |
| bossmode | 257 | 94 | 1.5 / %0.2 | 2.0 / %0.8 |
| castlefreezone_b | 513 | 353 | 15.3 / %1.7 | 16.3 / %1.8 |
| clanfight | 65 | 12 | 21.0 / %1.2 | 21.5 / %2.4 |
| clanfight_b | 65 | 1 | 20.9 / %0.0 | 20.9 / %0.0 |
| clanfight_c | 65 | 12 | 21.1 / %1.5 | 21.6 / %2.7 |
| clanfight_d | 65 | 1 | 20.9 / %0.0 | 20.9 / %0.0 |
| dragon_a | 33 | 26 | 13.0 / %0.0 | 17.4 / %1.6 |
| dungeon_a | 257 | 131 | 11.5 / %0.8 | 14.1 / %1.1 |
| dungeon_b1th | 129 | 0 | – (karo yok) | – |
| dungeon_b2th | 129 | 0 | – (karo yok) | – |
| dungeon_b3th2015 | 129 | 2 | 23.6 / %1.9 | 23.6 / %1.9 |
| dungeon_defense | 65 | 48 | 10.4 / %2.5 | 15.0 / %6.8 |
| dungeond | 129 | 18 | 23.8 / %0.6 | 23.9 / %0.9 |
| elmo2004 | 513 | 181 | 15.6 / %2.6 | 16.9 / %5.3 |
| elmorad_intro | 65 | 22 | 16.0 / %1.2 | 16.9 / %1.2 |
| elmorad_start | 513 | 448 | 22.9 / %7.3 | 25.6 / %10.9 |
| eslantzone | 257 | 440 | 18.6 / %5.1 | 22.4 / %10.9 |
| folk_war | 257 | 82 | 16.9 / %0.4 | 17.3 / %0.7 |
| freezone | 257 | 458 | 22.8 / %2.9 | 27.0 / %10.6 |
| freezone_a | 257 | 458 | 22.8 / %2.9 | 27.0 / %10.6 |
| freezone_a_event2012 | 257 | 439 | 23.1 / %2.9 | 27.2 / %10.5 |
| freezone_b | 513 | 237 | 17.8 / %4.4 | 20.1 / %7.8 |
| freezone_b_2012event | 513 | 108 | 19.3 / %1.9 | 20.4 / %3.2 |
| freezone_bb | 257 | 488 | 23.1 / %2.9 | 27.4 / %11.0 |
| freezone_c | 257 | 68 | 12.7 / %1.3 | 15.0 / %3.5 |
| freezone_new | 513 | 357 | 15.3 / %1.8 | 16.4 / %1.9 |
| In_dungeon01 | 65 | 50 | 24.1 / %13.0 | 29.9 / %23.1 |
| In_dungeon02 | 65 | 56 | 15.2 / %0.4 | 19.8 / %4.6 |
| In_dungeon03 | 65 | 49 | 22.0 / %7.8 | 27.7 / %17.6 |
| In_dungeon04 | 65 | 74 | 14.4 / %4.0 | 22.6 / %17.8 |
| In_dungeon05 | 257 | 17 | 28.6 / %1.1 | 28.6 / %1.1 |
| In_dungeon06 | 65 | 74 | 14.4 / %4.0 | 22.6 / %17.8 |
| itemzone_a | 513 | 182 | 11.8 / %1.0 | 12.2 / %1.3 |
| karus_intro | 65 | 22 | 16.0 / %1.2 | 16.9 / %1.2 |
| karus_start | 513 | 492 | 18.9 / %8.6 | 20.6 / %10.5 |
| karus2004 | 513 | 275 | 17.8 / %2.2 | 20.9 / %6.6 |
| moradon | 257 | 174 | 20.5 / %4.6 | 23.2 / %7.8 |
| moradon_xmas | 257 | 247 | 20.0 / %3.6 | 24.7 / %12.3 |
| new_runawar | 257 | 164 | 16.4 / %2.6 | 18.3 / %4.5 |
| newfreezone_b | 513 | 237 | 17.8 / %4.4 | 20.1 / %7.8 |
| old_elmo | 513 | 448 | 22.9 / %7.3 | 25.6 / %10.9 |
| old_karus | 513 | 492 | 18.9 / %8.6 | 20.6 / %10.5 |
| sky_war_2009 | 65 | 17 | 20.6 / %4.2 | 20.8 / %4.4 |
| war_a | 257 | 67 | 10.7 / %0.4 | 11.8 / %1.2 |
| warfreezone_a_event2012 | 257 | 439 | 23.1 / %2.9 | 27.2 / %10.5 |
| Worldwar | 257 | 132 | 18.0 / %10.0 | 20.2 / %14.9 |
| xmas_battle | 129 | 43 | 9.4 / %3.1 | 10.6 / %4.4 |
| Xmas_event2018 | 129 | 43 | 9.4 / %3.1 | 10.6 / %4.4 |

## 4. Tarama bulguları (yön dışında)
- **Eksik dosya:** `Worldwar.gtd` `dtex\04el_ground_0.gtt` istiyor, client'ta yok (karo 121-123 gri). Düzeltilemez.
- **Sıfır dolu karolar:** `itemzone_a.gtd` karo 153-156 kaynak dosyada baştan sona sıfır baytla dolu (çözücü hatası değil; orijinalde de siyah; 504 köşe). `bossmode`, `dungeon_a`, `dungeond`, `dungeon_b3th2015`'teki siyah `invisible__0.gtt` karoları kasıtlı (görünmez karo).
- **`.gtt` sıra eşleşmesi:** her karonun (dosya, sıra) çifti, ardışık okuma ile "NTF" araması aynı konuma gidiyor; çözülemeyen karo yok.
- **Karo bilgisi:** hiçbir haritada `tam_karo = 0`, "doku2 var doku1 yok", geçersiz doku indeksi ya da yön > 7 yok.
- **Dikişi sürekli kötü çıkan karo indeksleri** (ör. moradon #159, elmo2004 #47, karus_start #201, Worldwar #68) gözle incelendi: çim, toprak ve yol yamaları orijinal tabloyla doğal görünüyor; bu sayılar tekrarlı zemin dokularının doğal kenar gürültüsü (karus_start'taki kareli desen dokunun kendi deseni).

## 5. Yapılanlar
- Düzeltme: `client/src/dunya/arazi.ts` (shader `yonUv`).
- Araçlar: `araclar/harita/karo-denetim.ts` (yukarıdan çizim ve dikiş ölçümü), `karo-tara.ts` (58 harita), `client/scripts/arazKarsilastir.mjs` (aynı noktadan ekran görüntüsü).
- Test: `araclar/harita/karo-denetim.test.ts` (shader'daki `YU/YV` kaynakla aynı kalmalı; gerçek haritada orijinal tablo diğerlerinden iyi olmalı). `npm test` 23/23, iki `tsc --noEmit` temiz.
- `cli.ts` kuşbakışı önizleme (`--onizleme`) aynı yanlış tabloyu kullanıyordu: orijinal tabloya bağlandı.
- `karo-yon-arastirma.ts` yanlış sonuç uyarısıyla işaretlendi; `docs/formatlar/model.md` ve `docs/YAPILACAKLAR.md` düzeltildi.

## 6. Yapılmayanlar / doğrulanmayanlar
- **Fotoğraftaki kırmızı işaretli yerler** bana ulaşmadı. Harita adı ve yaklaşık koordinat gelirse aynı noktayı yeni shader'la yeniden fotoğraflayıp bakarım. Düzeltmeden sonra yine bozukluk görülürse yön dışı bir sebep (aşağıdakiler) olabilir.
- **Karo kenar çizgileri (RepeatWrapping):** bilineer filtrede karo kenarındaki texeller karşı kenarla karışır. Orijinal D3D motoru da varsayılan sarmayı (WRAP) kullanıyor; ekran görüntülerinde ızgara çizgisi görmedim, dokunmadım.
- **Orijinalde olup client'ta olmayanlar** (`luferson/arazi-doku-notlari.md` bölüm 5): `.tlt` gölge katmanı, uzakta renk haritasına geçiş, `Terrain_Base.bmp` çarpımı. Zeminin orijinalden farklı görünmesine yol açabilir, yön hatasıyla ilgisi yok.
- Sunucu yeniden başlatma gerekmez; yalnız client shader'ı değişti (Vite açıksa sayfa yenilenince geçerli).
