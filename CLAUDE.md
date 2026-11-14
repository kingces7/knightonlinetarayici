# Knight Online Tarayıcı — Proje Talimatları

## Amaç
Knight Online'ı tarayıcıda (masaüstü Chrome/Edge/Firefox) oynanır hale getirmek.
Orijinal client Windows'a özel DirectX/C++ programıdır ve tarayıcıda çalışamaz.
Client tarafı web teknolojileriyle yeniden yazılacak. Mevcut server mümkün olduğunca
değiştirilmeden kullanılacak.

## İletişim
- Kullanıcıyla her zaman **Türkçe** konuş.
- Kullanıcı yazılımda yeni. Kısa, sade açıklamalar yap ve teknik terimleri ilk geçtiği yerde açıkla.
- Büyük bir değişiklikten önce ne yapacağını 2-3 cümleyle söyle.

## Kesin kurallar
1. **Orijinal oyun dosyaları asla depoya girmez.** Client/server dosyaları, `.tbl`,
   harita, model, doku ve ses dosyaları `oyun-dosyalari/` klasöründe durur. Bu klasör
   `.gitignore` ile dışarıda tutulur. Commit atmadan önce `git status` ile kontrol et.
2. GitHub 100 MB üstü dosyayı kabul etmez. Büyük dosya, build çıktısı ve dönüştürülmüş
   asset'ler (`build/`, `donusturulmus/`) commit edilmez.
3. `oyun-dosyalari/` içindeki dosyaları **sadece oku**, değiştirme. Çıktıları ayrı klasöre yaz.
4. Bu depo hem bu bilgisayardan hem de bir bulut oturumundan (claude.ai) düzenleniyor.
   Çalışmaya başlamadan önce `git pull`, iş bitince commit + `git push` yap.
   Commit mesajları Türkçe ve kısa olsun.

## Mimari
| Parça | Yaklaşım |
|---|---|
| Asset dönüştürücü (`araclar/`) | Orijinal formatları okuyup web formatlarına çevirir: model → glTF, doku → PNG/KTX2, tablolar (`.tbl`) → JSON, harita → yükseklik haritası + nesne listesi (JSON) |
| Web client (`client/`) | TypeScript + Vite. Grafik için Three.js (WebGL). Arayüz için HTML/CSS katmanı |
| Ağ köprüsü (`kopru/`) | Tarayıcı TCP açamaz. Node.js ile WebSocket ↔ TCP proxy yazılır. Paketler client'ta ikili (binary) olarak kodlanır ve çözülür |
| Server | Mevcut server dosyaları. Sadece zorunlu düzenlemeler yapılır ve belgelenir |

Önerilen dil/araçlar: TypeScript (client + köprü), Python veya TypeScript (dönüştürücü araçlar).
Başka bir seçim yapılacaksa önce kullanıcıya sor.

## Yol haritası
Her aşama bitince `docs/ILERLEME.md` dosyasını güncelle.

- [ ] **Aşama 0 — Keşif:** `oyun-dosyalari/` klasörünü tara. Klasör yapısını, dosya türlerini,
      kaynak kodu (.cpp/.h) olup olmadığını, server türünü ve veritabanını belirle.
      Sonucu `docs/KESIF.md` dosyasına yaz. Neyin elde olduğunu ve neyin eksik olduğunu kullanıcıya özetle.
- [ ] **Aşama 1 — Tablolar:** `.tbl` okuyucu yaz (item, mob, NPC, skill) ve JSON'a çevir.
      Formatı `docs/formatlar/` altında belgele.
- [ ] **Aşama 2 — Harita ve model:** Arazi (terrain), nesne ve karakter modeli okuyucuları ile glTF çıktısı.
- [ ] **Aşama 3 — İlk görüntü:** Tarayıcıda bir harita, üzerinde yürüyen bir karakter ve kamera kontrolü.
- [ ] **Aşama 4 — Sunucu bağlantısı:** WebSocket köprüsü, paket şifreleme/sıkıştırma, login,
      karakter seçimi, oyuna giriş. Paketleri `docs/protokol.md` dosyasında belgele.
- [ ] **Aşama 5 — Oyun sistemleri:** Diğer oyuncuları ve mob'ları gösterme, hareket senkronu,
      chat, envanter, savaş, skill'ler. Her biri ayrı ve küçük adımlarla.

## Çalışma biçimi
- Kaynak kod varsa dosya formatlarını ve protokolü önce koddan öğren. Tahmin yürütme.
- Kaynak kod yoksa ikili dosyaları hex inceleme ile çöz ve bulguları belgele.
- Her yeni okuyucu için küçük bir test yaz (örnek dosyayı açıp beklenen alanları kontrol eden).
- Büyük işleri küçük, çalışan adımlara böl. Her adım sonunda bir şey çalıştırılabilir olsun.

## Klasör yapısı (hedef)
```
oyun-dosyalari/   # orijinal dosyalar (git'e girmez)
araclar/          # dönüştürücüler
client/           # tarayıcı oyunu
kopru/            # WebSocket <-> TCP proxy
docs/             # KESIF.md, ILERLEME.md, protokol.md, formatlar/
```
