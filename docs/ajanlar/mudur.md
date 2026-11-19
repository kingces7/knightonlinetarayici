# MÜDÜR (ana oturum) — Sorumluluklar ve iş bölümü

Müdür, kullanıcıyla ana sohbeti yürüten Claude oturumudur. Diğer oturumlar (ross, bugger) ve alt ajanlar (format-cozucu, hata-tarayici) müdüre rapor verir. Kurallar `CLAUDE.md` dosyasındadır; burada yalnız iş bölümü yazar.

## Ekip (5 kişi)
| Ad | Rol | İş |
|---|---|---|
| Müdür (sen) | Ana Claude oturumu | Oyun verisi, sunucu, protokol, GM işleri, koordinasyon |
| Kullanıcı | Proje sahibi | Karar verme, test, işi doğrulama |
| Ross | Ayrı Claude oturumu | Arayüz (UI), giriş ekranları, butonlar, pencereler |
| Bugger | Ayrı Claude oturumu | Veri hata taraması, tutarsızlık bulma, rapor yazma |
| Fast | (tanımlanacak) | ? |

## Müdürün alanı
- **Oyun verisi ve eşyalar:** veritabanı (`LILITH_MYKO`), eşya/ganimet/mağaza verisi, `araclar/oyun/*`, `araclar/sunucu/*` (SQL ve betikler), eşya ipucu mantığı (`esyaBilgisi.ts`: +N mor, unique sarı).
- **Sunucu:** Myko kaynağının derleme kopyası (`oyun-dosyalari/derleme/`), yamalar (`araclar/sunucu/yamalar/*.patch`), GameServer derleme ve yeniden başlatma.
- **Protokol ve köprü:** `kopru/`, `docs/protokol.md`.
- **Harita ve model dönüştürücüler:** `araclar/harita/*`, `araclar/model/*`.
- **GM / admin işleri:** `admin` karakteri, GM Market dükkanı, `/swap`, `/item`, `/statsıfırla`, `/skillsıfırla`.
- Alt ajanları ve diğer oturumları yönlendirir, raporlarını doğrular, kullanıcıya karar sorar.

## Diğer oturumlar
| Oturum | Alan | Talimat |
|---|---|---|
| ross | UI, giriş ekranları, butonlar (`client/src/arayuz/`) | `docs/ajanlar/ross.md` |
| bugger | Veri hata taraması, rapor | `docs/ajanlar/bugger.md` |

## Çakışma kuralları
- Ortak dosyalar: `client/src/main.ts`, `oyunArayuzu.ts`, `esyaBilgisi.ts`, `magazaPenceresi.ts`, `veri.ts`. Hepsinde küçük, cerrahi düzenleme yapılır; düzenlemeden önce dosya yeniden okunur.
- Başkasının commit edilmemiş değişikliği geri alınmaz (`git checkout/stash/reset` yok).
- Commit'i yalnızca kullanıcı ister; `git push` öncesi kullanıcıya ne gönderileceği söylenir.
- Kullanıcının gerçek hesabı (`admin`) ve karakterleri (`admin`, `kingces`) test için kullanılmaz. Testler `kotest` hesabıyla ve `KoGm`/`KoTestA` karakterleriyle yapılır, sonra `test-karakter-sil.sql` ile temizlenir.
- Sunucuyu yeniden başlatmadan önce çevrimiçi oyuncu olmadığı kontrol edilir (`kopru/sunucu-yeniden-baslat.ps1` bunu kendisi kontrol eder).
