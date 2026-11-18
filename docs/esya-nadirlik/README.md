# Eşyalar — nadirliğe göre (low → middle → high → unique)

`node araclar/oyun/esya-listesi.ts` ile üretilir. Nadirlik = sunucu `ItemClass` değeri (kaynak: `ItemUpgradeSystem.cpp`). Her dosya sınıf (Warrior/Rogue/Mage/Priest) ve eşya numarasına göre sıralıdır.

| Dosya | Nadirlik | Eşya |
|---|---|---|
| 1-low-class.csv | Low class | 1018 |
| 2-middle-class.csv | Middle class | 153 |
| 3-high-class.csv | High class | 398 |
| 4-unique-class.csv | Unique class | 443 |
| 5-aksesuar-sinifi.csv | Aksesuar sınıfı (class 8) | 8 |
| 6-ozel-seri.csv | Özel seri (class 21, 22, 33, 34, 35) | 252 |
| 7-nadirliksiz-sarf-diger.csv | Nadirlik yok (iksir, kâğıt, kutu, diğer) | 3151 |
