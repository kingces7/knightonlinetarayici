# Orijinal hareket mekaniği (OpenKO v1299 istemci kaynağından)

Kaynak: `OPENKO SRC - V1299/Client/WarFare/` — `GameProcMain.cpp` (girdi), `PlayerMySelf.cpp` (hareket), `PlayerBase.cpp` (dönüş), `GameEng.cpp` (kamera), `GameDef.h` (sabitler).

## 1. Hız
| Durum | Değer | Kaynak |
|---|---|---|
| Yürüme | **1,5 m/sn** | `MOVE_SPEED_WHEN_WALK` |
| Koşma | yürüme × **3,0** = **4,5 m/sn** | `MOVE_DELTA_WHEN_RUNNING` |
| Geri yürüme | **−1,5 m/sn** (koşuyor olsan bile hep yürüme hızı) | `MoveSpeedCalculationAndCheckCollision` |
| Buff/skill çarpanı | `m_fMoveDelta` (Sprint vb.) hız ve animasyon hızını çarpar | |
| Engele çarpma | hız 0 olur, durma paketi gider | |

## 2. Dönüş
- A/D (veya ←/→): karakter **60°/sn** döner (`RotAdd`; yaw anında uygulanır, yumuşatma yok).
- Hedefe yönelme (`RotateTo`): saniyede **270°** (`m_fRotRadianPerSec`) en kısa yoldan.
- Tıklayarak/hedefe yürürken (`TargetOrPosMove`): yön her kare **anında** hedefe çevrilir; hedefe < 0,5 m kalınca durur (canavara ise saldırı menziline girince durur ve otomatik saldırı başlar).
- Fare sol tuşu basılı tutulunca 0,1 sn sonra karakter imlecin yönüne döner ve oraya yürür.

## 3. Kamera
- Sağ tuş sürükleme: yatay `180° × dx × 0,02` kamera yaw'ı; dikey hareket zoom; imleç sürükleme sonunda eski yerine geri konur.
- Eğim (Home/End): **45°/sn**; sınır −50°…+70° (üçüncü şahısta alt sınır 10°).
- Zoom: 2 … 10 m arası (3. şahıs mesafesi `m_fOffsetVPGod`, varsayılan 7).
- Kameranın varsayılan eğimi 25°.

## 4. Sunucuya gönderim (`GameDef.h`)
- Hareket paketi (`WIZ_MOVE`): x·10, z·10, y·10 (**1,5 sn sonraki tahmini konum**), hız·10, bayrak (1 = hareket, 2 = sürekli).
- Hareket sürerken **her 1,5 sn** yeniden gönderilir; durunca ayrıca durma paketi.
- Dururken yön değiştiyse `WIZ_ROTATE` (yaw·100) **her 4 sn**.
- Hedef bilgi isteği her 2 sn.

## 5. Bizim uygulamayla fark (`client/src/main.ts`)
| Konu | Orijinal | Bizde | Durum |
|---|---|---|---|
| Koşma hızı | 4,5 | 4,5 | doğru |
| Yürüme hızı | **1,5** (koşunun 1/3'ü) | 2,25 (0,5×) | **yanlış** |
| Geri hız | 1,5 sabit | koşu×0,6 = 2,7 | **yanlış** |
| A/D dönüş hızı | **60°/sn** (1,05 rad/sn) | 2,4 rad/sn (≈137°/sn) | **yanlış, 2,3 kat hızlı** |
| Hedefe dönüş | 270°/sn | anında | küçük fark |
| Hareket paketi aralığı | 1,5 sn | 1,0 sn | küçük fark |
| `WIZ_ROTATE` | dururken 4 sn'de bir | gönderilmiyor | eksik |
| Hedefe varma | <0,5 m | tıklanan nokta | küçük fark |

Önerilen düzeltme sırası: (1) hızlar (yürüme 1,5, geri 1,5), (2) A/D 60°/sn, (3) paket aralığı 1,5 sn + tahmini konum, (4) `WIZ_ROTATE`. Hareket kodu bu rapor onaylanmadan değiştirilmedi.
