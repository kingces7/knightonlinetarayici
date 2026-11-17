# `.fxb` efekt paketleri

## DURUM (2026-11-17): okuyucu ve oynatıcı VAR — %99 çözülüyor (1202/1219)
**Son düzeltme:** parçacık parçası sürüm 9 / taban 4 için ek bayt 27 değil **23** idi (ölçüm hatası); bu tek düzeltme 1168 → 1202 dosyayı çözdü ve `heal_cast.fxb` (2601) artık çiziliyor. Kalan 17 dosya (çoğu 15+ parçalı dev paketler) oyunda kullanılan skill'lerde yok.
**Önemli düzeltme:** aşağıdaki eski bölümlerde "kaynak kod yok" yazıyor; bu artık yanlış. `OPENKO SRC - V1299/Client/N3Base/` içinde **N3FXBundle, N3FXPartBase, N3FXPartParticles,
N3FXPartBillBoard, N3FXPartBottomBoard, N3FXPartMesh, N3FXParticle** kaynakları var. Okuyucu bunlardan birebir yazıldı: `araclar/oyun/fxb.ts`.

- **Düzen (kaynaktan):** bundle = `i32 sürüm, f32 ömür, f32 hız, bool boyutaBağlı`, sonra 16 yuva (`i32 tür` + tür≠0 ise `f32 başlangıç` + parça), sürüm ≥ 2'de `bool statik`.
  Parça tabanı: `u8 sürüm, u8 tabanSürüm, f32 ömür, u8 tür, hız/ivme/dönüş (3×vec3), bool yerde, vec3 konum, i32 dokuAdedi, f32 dokuFps, 260 bayt doku adı, karışım/solma/çizim bayrakları`.
  Parçacık / tahta (billboard) / mesh / zemin tahtası alanları kaynaktaki `Load` sırasıyla. Doku kareleri `<ad>0000.dxt …`.
- **Ama dosyalar kaynaktan YENİ sürümde:** kaynak en çok paket sürümü 2, parça sürümü 5, taban sürümü 2 okur; elimizdeki dosyalarda paket 6, parça 10, taban 4'e kadar var.
  Yeni sürümlerde eklenenler (ölçülerek bulundu, içerikleri bilinmiyor): taban sürümü ≥ 3 → parça tabanında 2 `i32`; taban sürümü ≥ 4 → renderFlag'den sonra 260 bayt **HDR doku adı**;
  parça sürümleri 6-10 → parça sonunda sabit sayıda bilinmeyen bayt (`fxb.ts` `EKSTRA` tablosu: yüzlerce örnekte aynı çıktı); paket sürümü ≥ 3 → dosya sonunda 45-93 baytlık bilinmeyen kuyruk.
- **Doğrulama:** `araclar/oyun/fxb.test.ts` — 1219 dosyanın **1168'i (%96) çözülüyor**; paket sürümü ≤ 2 olanlar baytı baytına tam. Çözülemeyen ~50 dosya (çoğu paket 5-6 ve 3 parça yapısı farklı) için
  yeni sürümlerin parça içi eklentilerinin yeri bulunmalı (şüphe: parçacık sürüm 9-10'da `bChangeColor`/`bAnimKey` bölgesine alan eklenmiş; `heal_cast.fxb` 3. parçası bunun örneği).
- **Oynatıcı:** `client/src/dunya/efekt.ts` (`EfektYoneticisi`): parçacık (normal/yayılma/toplanma, hız, yerçekimi, renk anahtarları, doku kareleri), tahta ve zemin tahtası. **Mesh parçaları var** (`.n3shape` → `.n3pmesh` geometrisi; araclar/model/n3.ts okuyucusu; yön, ölçek hızı, doku kareleri; doku kaydırma ve şekil içi animasyon anahtarları henüz yok).
  Dönüştürücü: `npm run efekt` (araclar) → `donusturulmus/web/efekt/fx/<fx.tbl no>.json` + `efekt/doku/*.png`.
- **Oyuna bağlı:** skill kullanılınca (`main.ts beceriKullan`): kendinde efekt (fx.tbl sütun 7), buff'ta hedef efekti de kullanana, saldırı skill'inde vuruş anında hedefte efekt (sütun 12).
  Savaşçı temel skill'lerinden Sprint (2701 + 10029) ve Defense (2701 + 701) ve vuruş efekti (10002 `damage0_1`) çalışıyor; `heal_cast.fxb` (2601) çözüldü ve çalışıyor.
- **Sıradaki:** (1) kalan ~50 dosya: yeni sürüm parça içi alanlarını bulmak, (2) mesh doku kaydırma/anahtar animasyonu ve `Ability_target0_1` şekli, (3) uçan efekt (sütun 11) ve bundle yönü/hedefe uçuş (`FX_BUNDLE_MOVE_*`), (4) efekt sesi (fx.tbl sütun 3), (5) HDR doku seçimi, (6) parçacık LOD, (7) sunucu skill'leri bağlanınca oyuncular arası efekt.

---
## Eski notlar (kaynak bulunmadan önce yazıldı; tarihsel)

Durum: **okuyucu yok.** Elimizde N3 efekt motorunun kaynağı yok (`N3FXBundle`/`N3FXPart*` sınıfları client kaynağında bulunmuyor; yalnızca `N3River.h`
ve `N3AnimatedTexures.h` başlıkları var). Aşağıdakiler ikili dosyalardan gözlenenlerdir.

- `fx/fx.hdr` + `fx.src` paketinde 8950 dosya: **1219 `.fxb`**, 6 `.n3fxpart`, 1 `.n3fxbundle`, 4887 `.dxt` (efekt dokuları), 1566 `.n3pmesh`, 1040 `.n3shape`, 128 `.n3vmesh`.
- `.fxb` ilk 4 bayt = sürüm (1–6; dağılım 1:117, 2:134, 3:614, 4:31, 5:103, 6:220). Küçük dosyalar tek parçalı (447–583 bayt).
- Parça kayıtlarında dosya yolu metni görülüyor (ör. `fx\ground\1022el_s\el_s`, `fx\particle\0711ab_cast\0711ab_cast`) ve tür numarası
  (4 = zemin tahtası gibi görünüyor). Parçanın içinde onlarca ayar var (başlangıç/bitiş değerleri, anahtarlar); alan anlamları bilinmiyor.
- **Hangi efekt nerede:** `Data/fx.tbl` = `numara, ?, fxb yolu, ses numarası, 0, 0` (1092 satır). Skill tablosunda (`Skill_Magic_Main_us.tbl`) 7. sütun
  (kendinde efekt) bu numaraya bağlı: savaşçı skill'leri `2601` (`heal_cast.fxb`, 2612 bayt) ve `2701` (`Ability_cast0_1.fxb`, 583 bayt) kullanıyor.
- Yapılabilecek sıradaki adım: tek parçalı küçük dosyaları (`Ability_cast0_1`, `region_target_*`) karşılaştırmalı çözmek; parça türlerini (parçacık, tahta, ağ, zemin) ayırmak.

Not: Haritadaki **animasyonlu dokular** (ateş, duman, ışınlanma işareti) `.fxb` kullanmaz; nesne parçasının `doku listesi + fps` alanından gelir ve oyuna eklendi
(`araclar/harita/nesneler.ts`, `client/src/dunya/nesneler.ts`).

## Ek bulgu (2026-11-15, ikinci inceleme)
- Kayıtlar **hizasızdır** (4 bayta oturmaz). Tek parçalı dosyalarda (`Ability_cast0_1.fxb` 583 bayt, `ability_cast1_1.fxb` 459 bayt) 0x54 konumunda bir bayt (0x41) ve ardından **256 baytlık sabit uzunluklu yol tamponu** (`fx\particle\0711ab_cast\0711ab_cast`) başlıyor; tampon 0x155'te biter, sonra parçaya özgü sayılar (parçacık sayısı, ömür, hız, renk anahtarları…) gelir. Bu sayıların alan sırası ve anlamı (N3FXPartParticles/N3FXPartBase) kaynak olmadan doğrulanamadı; tahminle efekt çizmek "kural icat etmeme" ilkesine aykırı olacağından yapılmadı.
- Sonraki adım: aynı parçacık parçasının farklı efektlerde değişen sayılarını karşılaştırıp alanları tek tek eşlemek (ör. `Ability_cast0_1`…`ability_cast6_3` ailesi yalnızca renk/ölçekte farklı).

## Üçüncü inceleme (2026-11-16)
- `Myko_Source.rar` listesinde (10.174 dosya) `N3FX*`, `FXBundle`, `FXPart*` kaynağı **yok**; N3BASE klasöründe yalnızca arayüz/doku/animasyon-anahtarı ve `N3River.h` var. Bu yüzden `.fxb` parça alanları kaynaktan doğrulanamıyor.
- Yapı: `heal_cast.fxb` (sürüm 5, 2612 bayt) 5 parçadan oluşur (particle, mesh/`object`, billboard, particle…); her parça normal ve `_hdr` değişkenini art arda taşır (~280 bayt aralık). Parça yolları doku/ağ **adlarıdır**: ör. `fx\billboard\0724heal_tarcb\0724heal_tarcb` → arşivde `0724heal_tarcb0000..0009.dxt` kareleri; `fx\object\0725heal_mesh\heal_mesh.n3shape`.
- Çözülürse sıradaki iş: billboard parçalarını (doku kareleri + boyut/ömür) çizmek; ancak boyut/ömür/renk alanlarının yeri bilinmediği için başlanmadı. Orijinal `N3FXBundle.cpp`/`N3FXPart*.cpp` kaynağı ya da çalışan istemciden alınmış bir efekt kaydı bulunursa tamamlanabilir.

## Yardımcı Kaynak 2 incelemesi (2026-11-16): `Myko Patch` (1300–1308.zip)

**Sonuç: yeni efekt varlığı yok.** `1303.zip` ve `1305.zip` içindeki 15 `.fxb` örneğini mevcut `fx.src` arşivimizle bayt bayt karşılaştırdım:
12/15'i **birebir aynı** (ör. `marseu_gigaham_hammer_target.fxb`, `marse_corp_binder_target_alll.fxb`); 2'si bizim arşivimizde **daha büyük/daha yeni** sürümle var
(`070707_itemzone_2007_bill_fx_c01.fxb` 1031→1613 bayt, `mpn2007_venknigh_p.fxb` 1883→1431 bayt — yani elimizdeki istemci bu patch'ten sonraki bir sürüm);
yalnızca `OzkanOzdemir_YeniCz.fxb` (8 parçalı, hepsi `arena_sheild` dokusuna bağlı — kişi adına özel, muhtemelen bir yöneticinin tek seferlik test efekti)
bizde yok, ama kullandığı doku (`fx/particle/40303arena_sheilds/arena_sheild0000.dxt`) zaten elimizde. Ayrıca `1304.zip`'teki `Data/Fx.tbl` (RC4 şifreli, araçlarımızla
sorunsuz çözüldü, 649 satır — şu anki `Data/fx.tbl`'den [1092 satır] daha eski/eksik) eşya 2601→`fx/Heal_cast0_1.fxb` ve 2701→`fx/Ability_cast0_1.fxb` eşlemesini
doğruluyor, yeni bir şey eklemiyor. Kaynak kod da yine yok. **Savaşçının 6 temel skill'i için kullanılan `Heal_cast0_1.fxb`/`Ability_cast0_1.fxb` dosyalarının
daha eski ya da daha açıklayıcı bir biçimi bu pakette çıkmadı.**

**Yan bulgu (asıl değerli kısım, kaynağı bu patch değil — kendi `fx.src` arşivimizdeki dosyalarla da tekrarlanabilir):** Tek-parçacıklı küçük `.fxb` dosyalarında
(575 bayt; `marseu_gear_2007_dust.fxb`, `marse_corp_binder_foot.fxb`, `mpn2007_venknigh_p_s.fxb`) yol metninin **sabit 260 baytlık bir alanda** durduğu,
bu alanın her zaman dosyanın 85. baytında başlayıp 345. baytta bittiği doğrulandı (önceki incelemede bu sınır yanlış yerden okunduğu için sonrası çöp veri gibi
görünüyordu). 345. bayttan sonraki 230 baytlık kuyrukta üç dosya arasında **anlamlı ve temiz kayan noktalı sayılar** farklılaşıyor: 20. bayt tam sayı (40/30/15 —
parçacık sayısı gibi), 40–48 ile 52–60 aralıkları simetrik üçlüler (1.5,1.5,0 / −1.5,−1.5,0 gibi — hız konisi min/maks gibi), 76. bayt 360/360/30 (derece — yayılma
açısı gibi). Ancak bu yalnızca **tek parçalı, parçacık türü** için geçerli; çok parçalı dosyalarda (`heal_cast.fxb` gibi) parçalar arası uzunluk sabit değil
(456/452/860 bayt gibi değişken aralıklar görüldü), yani parça türüne göre kuyruk uzunluğu da değişiyor ve bu henüz genelleştirilemedi. Kısaca: tek parçacıklı
küçük efektlerin sayısal alanları artık okunabilir hâle geldi, ama çok parçalı (mesh+billboard+particle karışık) efektleri çizecek kadar değil.

## Deneme: toz efekti (2026-11-16) — ⚠️ DOĞRULANMAMIŞ TAHMİN, oyun kuralı DEĞİL

Tek parçalı parçacık türünü (yukarıdaki yan bulgu) 12 örnek dosyada (hem bu arşivde hem `Yardımcı Kaynak 2`'de bulunanlar) karşılaştırarak alan tahminini
genişlettim ve `fx\marseu_gear_2007_dust.fxb` ("toz" efekti) üzerinden deneysel bir görsel oluşturdum. 345. bayttan sonraki kuyrukta tahmin edilen düzen:

| Bayt (kuyruktan) | Tahmini anlam | Kanıt |
|---|---|---|
| +0 | parça türü (sabit `5` = parçacık) | 12/12 örnekte aynı |
| +8, +12 | ömür (sn), ömür rastgeleliği | değerler 0,1–2 sn arası, efekt adlarıyla tutarlı (toz 1 sn, ayak izi 0,2 sn, rüzgâr 2 sn) |
| +24, +28 | boyut: başlangıç/bitiş | duman efektlerinde büyüyor (2→4,5), toz taneciklerinde küçük kalıyor |
| +40/+52, +44/+56, +48/+60 | X/Y/Z hız kutusu: **maks/min** | +52 = −(+40) her örnekte **birebir** tutuyor (12/12); +56/+60 çoğunlukla ama değil her zaman −(+44/+48) |
| +64 | yukarı sürüklenme (duman için güçlü: 0,6–0,9; toz için zayıf: 0,01–0,1) | duman efektleri (`giga_chim`) ile toz/rüzgâr efektleri arasındaki fark anlamlı |
| +76 | yayılma açısı (derece; 360 = her yöne, 30 = dar huni) | yönlü rüzgâr efektlerinde 30–50°, patlama tarzı efektlerde 360° |

**Bu hâlâ bir tahmindir, kaynak kodla doğrulanmadı.** Bu yüzden gerçek bir skill'e BAĞLANMADI: `araclar/oyun/efekt-deneme.ts` (`npm run efekt-deneme`)
yalnızca `dust.json` + `dust.png` üretir; `client/src/dunya/efektDeneme.ts` bunu okuyup basit, billboard sprite tabanlı bir parçacık patlaması çizer;
oyunda yalnızca geliştirici konsolundan `window.ke.efektDene()` ile elle tetiklenir (`client/scripts/efektDenemeTesti.mjs` ile de denenebilir).
Sonuç gözle makul görünüyor (ayaklarının önünde büyüyüp sönen kum rengi bir toz bulutu, ~1 sn sürüyor) ama renk/dönüş gibi bazı alanlar (+80..+108 arası)
hâlâ belirsiz ve kullanılmadı; çok parçalı efektler (gerçek skill'lerin kullandığı `Heal_cast0_1.fxb`/`Ability_cast0_1.fxb`) bu yöntemle çizilemiyor.
