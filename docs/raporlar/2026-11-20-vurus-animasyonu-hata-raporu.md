# Karakter vuruş animasyonları hata raporu (bugger, 2026-11-20)

Müdür için. **Hiçbir dosya değiştirilmedi.** Yöntem: client kodu (`client/src`), orijinal client kaynağı (`OPENKO SRC - V1299/Client/WarFare`: `PlayerBase.cpp`, `PlayerMySelf.cpp`, `GameDef.h`) ve dönüştürülmüş veri (`donusturulmus/web/karakter/31137.glb`, `karakterler.json`, `esya/tum.json`, `oyun/oyuncu.json`) ayrı ayrı okunup karşılaştırıldı. Oyunu çalıştırıp gözle bakmadım; aşağıdaki her bulgu kod + veri kanıtıdır. "Doğrulanmadı" yazanlar tahmindir.

Terim: **breath (soluma/bekleme)** = karakterin silah tutarken durduğu duruş animasyonu. **Saldırı A0/A1** = o silah ailesinin iki saldırı animasyonu (dosyada `_A` ve `_B` sonekli). **Vuruş anı** = animasyonda silahın hedefe değdiği an.

## 1. Özet

| Kod | Bulgu | Önem | Kimi etkiler |
|---|---|---|---|
| A1 | **Asa (staff) kullanan karakterler kalkan animasyonuyla saldırıyor** | ORTA | Büyücü ve rahip (160 asa, DB'de 6.912 kayıt) |
| A2 | Ağır silahlar için "B" animasyonları (ağırlığa göre) hiç kullanılmıyor | ORTA | Tek el kılıçların %61'i, baltaların %75'i, çift silah |
| A3 | Yayla temel saldırı yakın dövüş animasyonuyla (96/97) oynuyor; orijinalde Archery skill'i + ok atma animasyonu (26) | ORTA | Okçu |
| A4 | Canavar saldırı animasyonu 0,8 sn sonra "bekle" ile kesiliyor | ORTA | Bütün canavar savaşı (saldırı klipinin %85'i bundan uzun) |
| A5 | Vuruş anı sabit %55; gerçek vuruş anı verisi kullanılmıyor | DÜŞÜK | Oyuncu vuruşlarının görünümü |
| A6 | Silahsız hareket ederken saldırıda yanlış animasyon (14 yerine 15 olmalı) | DÜŞÜK | Silahsız oyuncu |
| A7 | Kind 61/62 eşyalar kılıç animasyonu alıyor (orijinal: silahsız) | DÜŞÜK | 6 eşya |
| A8 | Başka oyuncuların saldırı/skill/darbe animasyonu yok (hata değil, eksik) | BİLGİ | Çok oyunculu görünüm |

Doğrulananlar (hata değil): silah türü → animasyon numarası eşlemesi, A0/A1 seçimi, skill animasyon sütunları (aşağıda §4).

---

## 2. Bulgular

### A1 — Asa kalkan animasyonu kullanıyor (ORTA)
- **Kanıt (kod):** `client/src/dunya/karakter.ts:163-168` `SILAH_AILESI` tablosunda anahtar `110` = `[98, 99, 100, 0, 0]` yani **kalkan** (`ANI_SHIELD_BREATH_A = 98`, `ANI_SHIELD_ATTACK_A0/A1 = 99/100`; kalkan duruşu için `silahAyarla` satır 248-256 bu girişi anahtar 1060 üzerinden kullanıyor). Ama eşya tablosunda **asanın türü de 110'dur**: `tum.json` `tip: 110` → 160 eşya, hepsi `tur: silah` ("Candy Cane", "Hepa's Salamander Staff", "Elixir Staff"…); DB'de `Kind = 110` 6.912 satır; kalkan ise 60. `silahAyarla(110)` → `SILAH_AILESI[110]` → kalkan seti.
- **Orijinal kural (`PlayerBase.cpp`):** `JudgeAnimationAttack`: sağ elde `ITEM_CLASS_STAFF` (= 110) ise saldırı **her zaman `ANI_DAGGER_ATTACK_A0` (39)**; `JudgeAnimationBreath`: asa için `ANI_BREATH` (0, özel silah duruşu yok).
- **Oyuna etkisi:** Asalı büyücü ya da rahip temel saldırı yaptığında kalkan vuruşu ("Bash") oynar; savaş duruşu da kalkan duruşu olur.
- **Çözüm (fast/müdür):** `silahAyarla`'da asa için ayrı giriş: `[0, 39, 39, 0, 0]` (duruş yok → normal soluma kalır, saldırı hep 39). Kalkan girişini adıyla ayır (110 anahtarı kalkana kalmasın).
- **Risk:** düşük. **Karar:** hayır.

### A2 — Ağır silahlar B animasyonlarını kullanmıyor (ORTA)
- **Orijinal kural (`PlayerBase.cpp` `JudgeAnimationBreath`/`Attack`):** saldırı animasyonu = `breath + 1 + rand()%2`; breath, silah **ağırlığına** (`siWeight / 10`) göre A ya da B ailesidir: tek el kılıç `<5,0` → A, değilse B; tek el balta `<5,0` → A, değilse B; tek el gürz `<8,0` → A, değilse B. Çift silah (kılıç/balta kombinasyonları): sağ elin ağırlığına göre `DUAL_A` ya da `DUAL_B`. (Hançer, iki el kılıç/gürz/balta, mızrak, polearm: tek aile.)
- **Client:** `SILAH_AILESI` her tür için yalnız A ailesini veriyor (kılıç `[32,33,34]`, balta `[68,69,70]`, gürz `[56,57,58]`, çift `[44,45,46]`); `silahAyarla(tip, solTip)` ağırlık almıyor. B klipleri oyuncu modelinde **var** (35 `breath_sword1`, 36/37 saldırı; 47-49 `dual1`; Axe1 71-73; blunt1 59-61).
- **Veri (kaç silah B olmalı):** `tum.json` (`agirlik` = orijinal `siWeight`, birim 0,1): tek el kılıç **43/70 (%61)** ≥ 5,0 (örn. Scimitar 6,0, Flame Sword 7,0); tek el balta **21/28 (%75)** (Bipennis, Warrior Axe 5,0); gürz 0/43 (eşiğe girmiyor).
- **Oyuna etkisi:** Bu silahlarda yanlış animasyon ailesi oynar (daha hafif/hızlı duruş ve vuruşlar). Çift silahlı karakterlerde de aynı.
- **Çözüm:** `silahAyarla`'ya sağ el ağırlığını geç; kılıç/balta ≥ 50, gürz ≥ 80 (0,1 birimiyle) ise A yerine B ailesi seç; çift silahta sağ elin türüne göre aynı eşik. **Risk:** düşük-orta (eşik alanı doğru `agirlik` sütunu mu: tum.json alanı tablo sütunundan geliyor, ama birimi orijinalle birebir karşılaştırılmadı → **doğrulanmadı**, birkaç silahla görsel kontrol önerilir).
- **Karar:** hayır.

### A3 — Yaylı temel saldırı yanlış animasyonla (ORTA)
- **Orijinal (`PlayerMySelf.cpp:197-217`):** yay/arbalet takılıyken sürekli saldırı, yakın dövüş saldırısı yollamaz; **skill tablosundaki "Archery" (102003) skill'ini** çalıştırır (ok atma animasyonu `ANI_SHOOT_ARROW_A` = 26, bekleme aralığı `iCastTime/10 + 0,15 sn`, ok tüketir). `ANI_BOW_ATTACK_B0/B1` (96, 97) orijinalde temel saldırıda **hiç seçilmez** (`JudgeAnimationAttack` yay için `92+1+rand` = 93/94 verir ve bu yol yay için kullanılmaz).
- **Client:** temel saldırı `main.ts` `saldirTik` yakın dövüş yolundan geçer: `SILAH_AILESI[70] = [92, 96, 97, …]` → `oynat('saldir0/1')` = klip 96/97 (`attack_Bow0_A/B`), menzil `SALDIRI_MENZILI = 5 m`. Yay ve ok kontrolü yalnız elle skill basılınca (`main.ts:381-382`).
- **Veri:** klip 96 vuruş verisi 1,5 sn (bizim sabit 0,8 sn), klip 97 vuruş verisi yok (`null`), süreleri 1,6 / 2,9 sn.
- **Oyuna etkisi:** Okçu, yayı "kılıç gibi" yakında sallıyormuş gibi görünür; ok çıkmaz. `102003 Archery` skill'i var (`tip 2`, menzil 45); temel yay saldırısının sunucuda geçerli olup olmadığı **doğrulanmadı**.
- **Çözüm önerisi:** yay takılıyken temel saldırı Archery skill'ini (102003) tetiklesin (animasyon 26, ok tüketimi, 45 m menzil). Büyük değişiklik, **karar gerektirir**: yay temel saldırısı orijinalde böyle çalışıyor; bizdeki durumun bilinçli bir sadeleştirme olup olmadığı belgelenmemiş.

### A4 — Canavar saldırısı 0,8 sn'de kesiliyor (ORTA)
- **Kanıt:** `client/src/oyun/varliklar.ts:278`: canavar saldırı animasyonu başladıktan 0,8 sn sonra (`saldiriSayaci < gecikme/1000 − 0,8`) `oynat('bekle')` zorlanır (0,15 sn geçişle). `karakterler.json` 42 canavar modelinde 84 saldırı klibinin **71'i (%85)** 0,8 sn'den uzun (model 100: 1,53 sn; model 300: 1,20 sn; model 500: 1,43 sn).
- **Oyuna etkisi:** Çoğu canavarın vuruş hareketi yarıda kesilir. Aynı yerdeki darbe animasyonu zamanlayıcısı (0,4 sn) sorunsuz (122 klipten yalnız 3'ü 0,4 sn'den uzun).
- **Çözüm:** `bekle`'ye dönüş süresi sabit 0,8 yerine oynayan klibin süresi olsun (`oynatRastgele`'nin döndürdüğü süre; satır 275'te zaten çağrılıyor). **Risk:** çok düşük. **Karar:** hayır.

### A5 — Vuruş anı sabit %55 (DÜŞÜK)
- **Kanıt:** `main.ts:1156` darbe zamanı `animSüresi × 0,55`, 0,2-0,8 sn arasına sıkıştırılıyor. `karakterler.json`'daki gerçek vuruş verisiyle 43 saldırı klibi karşılaştırıldı: medyan sapma **0,16 sn**, **23 klipte 0,15 sn'den fazla**. Uzun "B" klipler 0,8 sn tavanına takılıyor (örn. `attack_Dagger0_B`: biz 0,74 sn, veri 0,33 sn → 0,41 sn geç; `attack_blunt1_B` 0,35 sn geç; `Kick0_A` 0,31 sn geç). Bazı klipler erken: `Twoblunt0_A` 0,14 sn erken.
- **Not:** `vurus` alanının birimi (saniye varsayıldı) ve gerçekten "silahın değdiği an" olduğu **doğrulanmadı** (`docs/YAPILACAKLAR.md` satır 153: n3anim alanlarının anlamı tam bilinmiyor). Bu yüzden DÜŞÜK.
- **Çözüm:** denenebilir: `vurus / hız` kullan, veri yoksa %55'e dön. Görsel karşılaştırma ister.

### A6 — Silahsız hareketli saldırı (DÜŞÜK)
- **Orijinal (`PlayerBase.cpp:1159-1160`):** hareket ederken saldırıda sağ elde silah varsa `ANI_ATTACK_WITH_WEAPON_WHEN_MOVE` (14), yoksa `ANI_ATTACK_WITH_NAKED_WHEN_MOVE` (15).
- **Client:** `karakter.ts` `ustSaldiri` her zaman 14 (`[...klipler.values()][14]`). Klip 15 modelde var (adı `konus3`, dışa aktarımdaki yanlış ad; sıra numarası doğru).
- **Çözüm:** silahsızken 15. **Risk:** çok düşük. Not: klip adları 0-17 arası Türkçe/NPC adlarıyla yeniden adlandırılmış (`konus2`/`konus3` aslında oyuncu için "hareketli saldırı"); kod sıra numarasıyla çalıştığı için bozuk değil, ama okunurluğu zayıf.

### A7 — Kind 61/62 eşyalar (DÜŞÜK)
`tum.json`'da `tip 61` (örn. Mattock, 2 eşya) ve `tip 62` (Bamboo, 4 eşya) `silah` türünde ama `SILAH_AILESI`'nde yok; `?? SILAH_AILESI[21]` ile kılıç animasyonu alıyorlar. Orijinalde tanımsız sağ el sınıfı "silahsız" (`ANI_NAKED_*`, 86-88) sayılır. Doğrulanmadı: bu eşyaların silah olarak giyilip giyilmediği. Etki 6 eşya.

### A8 — Diğer oyuncuların saldırı/skill/darbe animasyonları yok (BİLGİ)
`client/src/oyun/varliklar.ts` `DigerOyuncu` yalnız `bekle`/`yuru`/`kos`/`olum` oynatıyor; `sunucuDunyasi.ts:266-281` `saldiri()` yalnız bizim saldırımızı ve canavarın bize saldırısını işliyor; `WIZ_MAGIC_PROCESS` paketi (skill) `sunucuDunyasi.ts`'te hiç işlenmiyor. Yani başka oyuncu saldırınca, skill kullanınca ya da vurulunca ekranda animasyon yok. Hata değil, eksik (çok oyunculu kısmı henüz yapılmadı).

---

## 3. Bakılmayan / doğrulanmayan
- Gerçek ekranda görsel doğrulama (özellikle A2 ve A5): animasyon klibinin "doğru" göründüğüne dair kanıt yalnız numara/isim/veri.
- Skill animasyonları (iAct, combo, `Sword dancing`/`Howling Sword` gibi): `docs/YAPILACAKLAR.md` satır 285/390/399'da zaten açık madde; tekrar etmedim.
- Hasar alma (darbe) ve ölüm animasyonlarının oyuncu için seçimi: orijinal kuralla (`STRUCK0 + rand%3`, `DEAD_NEATLY + rand%3`) uyumlu görünüyor (kod okundu, çalıştırılmadı).
- Saldırı hızı değiştiren buff'lar: orijinalde animasyon hızı ve saldırı aralığı `m_fAttackDelta` ile ölçeklenir (`PlayerBase.cpp:643`, `PlayerMySelf.cpp:242`). Client bunu uygulamıyor, ama skill tablosunda bunu etkileyen yalnız 4 skill var ("Slow", saldırı hızı %70, oyuncuya uygulanan düşman buff'ı); pratik etkisi küçük, ayrı madde yazmadım.

## 4. Doğru çıkanlar (hata saymadım)
- **Silah türü → animasyon numaraları:** hançer 38, kılıç 32, iki el kılıç 50, balta 68, iki el balta/gürz 62, gürz 56, mızrak 74, polearm 80, silahsız 86-88, çift 44, kalkan 98-100 (orijinal `GameDef.h` enum'uyla birebir).
- **Skill animasyon sütunları:** hançer 116/117, çift 118/119, gürz 120/121, polearm 124/125, mızrak 126/127, kılıç 128/129, iki el balta 132/133, iki el kılıç 134/135, balta 112/113 (orijinal `ANI_SKILL_*` ile aynı).
- **Saldırı seçimi:** A0/A1'in eşit olasılıkla rastgele seçilmesi (`Math.random() < 0,5`), orijinal `rand()%2` ile aynı.
- **Savaş duruşu:** silaha özgü duruş yalnız düşman hedef seçiliyken (orijinal: hedef var ve ulus farklı); hedef yokken normal soluma.
- **Canavar animasyon numaraları:** saldırı 2 çeşit (4/5), darbe 3 çeşit (6/7/8), ölüm 2 çeşit (NPC düzeni).
- **Hareket ederken üst gövde saldırısı:** orijinal mantığa uygun (yalnız üst gövde, 14 numaralı klip); A6 yalnız silahsız durumu.

## 5. Önerilen sonraki adım (önem sırasıyla)
1. **A1 + A4:** ikisi küçük, düşük riskli ve çok oyuncunun gördüğü kusurlar (asa → kalkan animasyonu; canavar saldırısı 0,8 sn'de kesiliyor).
2. **A2:** ağırlığa göre B ailesi; birkaç silahla görsel kontrol.
3. **A3 (yay):** karar: yay temel saldırısı orijinalde Archery skill'i; yapılacak mı?
