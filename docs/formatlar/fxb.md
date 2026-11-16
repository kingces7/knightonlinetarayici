# `.fxb` efekt paketleri — kısmi bulgular (çözülmedi ⬜)

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
