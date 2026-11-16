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
- Kullanıcı kod yazmıyor. Kodu Claude yazar, çalıştırır ve test eder. Kullanıcıdan sadece
  karar ve gerekirse basit işlemler (program kurmak, oyunu açıp bakmak gibi) iste; bunları adım adım anlat.

## Kararlar
- **Myko** sürümüyle çalışılıyor: veritabanı `Myko Database/LILITH_MYKO.bak` (+ `LILITH_LOG.bak`),
  server kaynağı `Source Files/Myko_Source.rar`, client `KnightEmpire/` (Myko arşivindeki `DiabloKO` klasöründen çıkarılıp yeniden adlandırıldı).
  Homeko'ya ait her şey (veritabanı, kaynak kodu, `SpecialKO` client'ı) silindi; yedeği `knight online ham proje.rar` içinde.
- **Oyunun adı: KnightEmpire.** Tarayıcı client'ında (başlık, giriş ekranı vb.) bu ad kullanılır.
  Orijinal dosyalardaki eski adlar (DiabloKO, MykoNetwork, Lilith) değiştirilmez; server ayarlarındaki
  görünen adlar server kurulurken kullanıcıya sorularak güncellenebilir.
- Proje **bu bilgisayarda** geliştirilir. GitHub yedek ve bulut oturumu ile paylaşım içindir.
- **Tam kontrol hedefi:** Oyunun okunamayan bütün dosya türleri için "çöz + geri yaz" aracı yapılacak
  (kayıpsız, testli). Güncel durum ve sıra: `docs/formatlar/README.md`.
- **Oyun içeriği İngilizce.** Eşya, harita, NPC, skill adları orijinal İngilizce halleriyle kalır
  (ör. "Raptor", "Iron Bow", "Moradon", "Luferson"); çevrilmez. Client `_us` tablolarını kullanır,
  `_tk`/`_tr` tabloları kullanılmaz. Arayüzdeki konuşma dili (kullanıcıyla iletişim) Türkçe kalır.
- **Tablolar CSV olarak düzenlenir** (VS Code + "Edit CSV" eklentisi; bilgisayarda Excel yok).
- **Yapılacaklar listesi: `docs/YAPILACAKLAR.md`.** "Sonra bakılacak" her konu, açık soru ve
  kullanıcı kararı bekleyen iş buraya eklenir; biten iş `[x]` yapılır.

## Kesin kurallar
1. **Orijinal oyun dosyaları asla depoya girmez.** Oyun dosyaları depo klasörünün **dışında**,
   bir üst klasörde (`E:\Knight Online Browser Project\`) durur — aşağıdaki "Klasör yapısı"na bak.
   Commit atmadan önce `git status` ile kontrol et.
2. GitHub 100 MB üstü dosyayı kabul etmez. Büyük dosya, build çıktısı ve dönüştürülmüş
   asset'ler (`build/`, `donusturulmus/`) commit edilmez.
3. Oyun dosyalarını **sadece oku**, değiştirme. Arşivlerden (`.rar`) çıkarılan dosyalar ve
   üretilen çıktılar depo içinde `.gitignore` ile dışarıda tutulan klasörlere yazılır.
4. Git akışı: Çalışmaya başlamadan önce `git pull` yap (bulut oturumundan gelen değişiklikleri çekmek için).
   Commit'ler yerelde atılır. **GitHub'a göndermek (`git push`) gerektiğinde kullanıcıya ne
   göndereceğini kısaca söyle**, sonra gönder. Commit mesajları Türkçe ve kısa olsun.

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

- [x] **Aşama 0 — Keşif:** Oyun dosyalarını tara. Klasör yapısını, dosya türlerini,
      kaynak kodu (.cpp/.h) olup olmadığını, server türünü ve veritabanını belirle.
      Sonucu `docs/KESIF.md` dosyasına yaz. Neyin elde olduğunu ve neyin eksik olduğunu kullanıcıya özetle.
- [x] **Aşama 1 — Tablolar:** `.tbl` okuyucu yaz (item, mob, NPC, skill) ve JSON'a çevir.
      Formatı `docs/formatlar/` altında belgele.
- [x] **Aşama 2 — Harita ve model:** Arazi (terrain), nesne ve karakter modeli okuyucuları ile glTF çıktısı.
- [x] **Aşama 3 — İlk görüntü:** Tarayıcıda bir harita, üzerinde yürüyen bir karakter ve kamera kontrolü.
- [ ] **Aşama 4 — Sunucu bağlantısı:** WebSocket köprüsü, paket şifreleme/sıkıştırma, login,
      karakter seçimi, oyuna giriş. Paketleri `docs/protokol.md` dosyasında belgele.
- [ ] **Aşama 5 — Oyun sistemleri:** Diğer oyuncuları ve mob'ları gösterme, hareket senkronu,
      chat, envanter, savaş, skill'ler. Her biri ayrı ve küçük adımlarla.

## Çalışma biçimi
- Kaynak kod varsa dosya formatlarını ve protokolü önce koddan öğren. Tahmin yürütme.
- Kaynak kod yoksa ikili dosyaları hex inceleme ile çöz ve bulguları belgele.
- Her yeni okuyucu için küçük bir test yaz (örnek dosyayı açıp beklenen alanları kontrol eden).
- Büyük işleri küçük, çalışan adımlara böl. Her adım sonunda bir şey çalıştırılabilir olsun.

## Klasör yapısı
```
E:\Knight Online Browser Project\
├── KnightEmpire           # Myko client'ı, Myko_Source.rar'dan çıkarıldı (sadece oku)
├── Myko Database\          # LILITH_MYKO.bak, LILITH_LOG.bak (SQL Server 2022 yedeği)
├── Source Files\           # Myko_Source.rar, libcurl (DXSDK silindi)
├── Knight All in one\      # resmî USKO 1298 istemcisi (Myko'da olmayan intro/kamera/tablolar için), 1298 sunucu .exe'leri, JPKO_0.1a.bak
├── Knight-Online-Project-master\  # GPLv3 açık kaynak 1299 sunucu kaynağı (GameServer/AIServer/LogIn, Lua görevleri) — Aşama 4 için "okuyup öğrenme" kaynağı
├── Yardımcı Kaynak 2\Myko Patch\  # 1300-1308 yama zip'leri (yeni efekt içermiyor)
├── Masaustu DB incele\     # .bak'lerden çıkarılan json'lar ve çözücü betikler
├── Noah-System\            # yalnızca UIE ve StudPE (diğer topluluk araçları silindi)
├── *.rar                   # ham proje arşivi (Homeko yedeği), panel
└── knightonlinetarayici\   # BU DEPO
    ├── araclar\            # dönüştürücüler
    ├── client\             # tarayıcı oyunu
    ├── kopru\              # WebSocket <-> TCP proxy
    ├── docs\               # KESIF.md, ILERLEME.md, protokol.md, formatlar/
    ├── oyun-dosyalari\     # .rar'lardan çıkarılan dosyalar (git'e girmez)
    └── donusturulmus\      # dönüştürülmüş asset'ler (git'e girmez)
```
Kodda oyun dosyalarına giden yol tek bir ayardan okunmalı (ör. `../KnightEmpire`), sabit yazılmamalı.
