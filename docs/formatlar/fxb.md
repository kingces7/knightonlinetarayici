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
