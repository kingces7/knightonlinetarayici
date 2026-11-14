# KnightEmpire — Yapılacaklar Listesi

Son güncelleme: 2026-11-14 · Biten işler `[x]` ile işaretlenir. Görmek için: dosyaya sağ tık → **Open Preview** (Ctrl+Shift+V).

---

## 🟢 Şu an sıradaki

- [x] **Sürüm 7 (şifreli) dokuların çözülmesi** — çözüldü (RC4, parola `KnightOnline.exe` içinde); 588 `.dxt`/`.tct` ve `.gtt` içindeki 960 karo dokusu okunuyor. Ayrıntı ve kanıtlar: [formatlar/model.md](formatlar/model.md).
- [x] **Harita dönüştürücüyü Moradon için yeniden çalıştırmak** — yapıldı (430 doku, şifreli/gri doku kalmadı).
- [x] **Zeminde gerçek renk haritası (`.tct`)** — yerleşim düzeni ölçülerek bulundu (r=0,83/0,86) ve istemci zemini artık bununla çiziyor. Kalan: geçiş karolarının birebir karışım kuralı (şimdi: renk haritası + parlaklığa göre karo katmanları).
- [x] **Görüntü kalitesi ("yırtık" görünüm)** — kök neden: `.n3pmesh` kademeli ağ verisi yanlış okunuyordu (çökmeler uygulanmıyordu). Düzeltildi; ayrıca anizotropik filtre. Ayrıntı: [formatlar/model.md](formatlar/model.md).
- [x] **Moradon'u oynanabilir yapmak** — `?harita=moradon`: şehir meydanında doğma, çarpışma, köprü/kat zemini, güvenli şehir (canavar yok). Ayar: `client/src/oyun/haritalar.ts`. Gerçek başlangıç noktası ve NPC/canavar yerleşimi sunucu veritabanından gelecek.
- [ ] **Zeminin birebir görünümü:** geçiş karolarının gerçek karışım kuralı ve karo yön kodlarının anlamı (renk haritası artık okunabiliyor, kural araştırılacak).
- [x] **Çarpışma** — sunucu `.smd` çarpışma üçgenleriyle duvarlar, zemin yüksekliği ve dik yamaç sınırı uygulanıyor (Moradon). Belge: [formatlar/smd.md](formatlar/smd.md). Kalan: `new_runawar` için sunucu `.smd` eşleşmesi, kapıların/kolların işlevi, kameranın duvardan geçmesi.

## 🧩 Eksikler ve sonraki işler (2026-11-14 oturumundan)

**NPC ve dünya**
- [ ] NPC konuşmaları ve işlevleri: `Depo/Quests/*.lua` görev/konuşma dosyaları, mağaza (K_NPC `iSellingGroup` → ITEM_SELLTABLE), banka, Sanctuary. Şimdi tıklayınca "(conversation is not available yet)" yazıyor.
- [ ] NPC bakış yönü (`byDirection`) tahminle ayarlandı; bazıları yanlış yöne bakıyor olabilir, doğrulanacak.
- [ ] Moradon şehir dışı canavarları: K_NPCPOS1098 bölge 21'de ~90 canavar kaydı (Bandicoot, Kecoon, Bulcan, Werewolf…) gerçek değerlerle (K_NPC) eklenecek.
- [ ] Zemin geçişlerinin birebir karışım kuralı bilinmiyor (şimdi: renk haritası + parlaklığa göre karo katmanları).
- [ ] Işınlanma kapıları (Delos, Luferson Castle, El Morad Castle…) okunuyor ama işlevsiz; kapı/kol nesne olayları kullanılmıyor.
- [ ] Kamera binaların/duvarların içinden geçebiliyor.

**Hareket ve karakter (2026-11-14, ikinci oturum)**
- [x] **Oyuncu görünümü:** `upc_el_rm` iskeleti artık çalışıyor (sorun: bağlanma pozu 0. anahtar karesi olmalıydı — [formatlar/model.md](formatlar/model.md)); oyuncu modeli 31137 (155 animasyon). Kalan: oyuncu zırhı/silahı seçimi (look/Complete setleri), silah türüne göre saldırı/bekleme animasyonları (şimdilik kılıç: `attack_sword0_A/B`), `.n3cplug` ile silah gösterimi.
- [x] **Oturma** artık oyunun gerçek `SitDown` / `SitDown_Breath` / `StandUp` animasyonlarıyla. Kemik pozu yalnızca bu animasyonları olmayan modeller için yedek.
- [ ] Oturma yenilenme oranları (can %4, mana %5 / sn) ve "savaştan 4 sn sonra otur" kuralı ilk tahmin; ayarlanacak (`main.ts` sabitleri).
- [ ] Yürüme hızı koşmanın yarısı (3,25 m/sn); orijinal oyundaki değer bilinmiyor.
- [ ] Sohbet kutusu yalnızca yerel yankı yapıyor (sunucu yok); sekmeler (Normal/Private/Shout/Party/Knights) işlevsiz, kullanıcı listesi gizli.
- [ ] Bilgi penceresinin "Merchant Chat" / "Recent Notices" sekmeleri işlevsiz; kaydırma çubukları gizli (fare tekerleği çalışıyor).
- [ ] Hasar bilgisi mesajları yalnızca bilgi penceresinde; hedef çerçevesi ve ganimet penceresi eski arayüzde.
- [ ] `animAdi` artık özgün animasyon adlarına bakıyor; 155 animasyonlu modellerde saldırı animasyonları `attack_sword0_A` gibi adlarla duruyor (`saldir0/1` olarak eşlenmedi).

**Orijinal arayüz — eksikler**
- [ ] Sohbet kutusu (`re_el_chatting_box`), hedef çerçevesi (`re_target_framebar`: 14'ten büyük yeni öğe türleri nedeniyle okunamıyor) ve ganimet penceresi hâlâ eski basit arayüzde.
- [x] Otur (C) ve yürü/koş (T): tuşlar ve görev çubuğundaki düğmeler çalışıyor (ayrı bir düğme yapılmayacak).
- [ ] Görev çubuğunun çoğu düğmesi işlevsiz (Map, Control, Invite, Option, Exit); ortadaki 4 simge (`re_el_hotkey` hızlı çubuk) bağlı değil.
- [ ] Skill penceresi: yalnızca "Basic Skill" sekmesi ve El Morad Savaşçı temel skilleri listeleniyor; skill **kullanılamıyor** (MP harcama, hasar, etki yok). Sınıf sekmeleri ve skill puanı harcama yok; üstteki "P" (premium) düğmeleri gizlenemedi.
- [ ] Durum penceresi: Myko'nun "perk" paneli gizli; direnç ve silah savunma değerleri 0; ağırlık yalnızca yuva sayısı; Knight Cash / TL bakiyesi 0.
- [ ] Envanter: yalnızca silah (yuva 6) ve zırh (yuva 4) ekipman olarak çiziliyor; diğer 13 ekipman yuvası, çanta kilidi/kozmetik paneli, eşya yok etme çalışmıyor. Sürükle-bırak yok (tıkla-kuşan).
- [ ] Pencereler 1:1 piksel; çok küçük ekranda taşabilir, ölçek ayarı yok.
- [ ] `.lilith` arayüz geri yazıcısı (pencere düzenleyip tekrar şifreleme).
- [ ] U / K / I kısayol tuşları istek üzerine verildi; oyunun kendi varsayılan kısayol tablosu (KnightOnline.exe) çözülmedi.

## 🔒 Erişemediğimiz istemci kodu (`KnightOnline.exe`, paketli, kaynağı yok)

Veri dosyaları açık; kapalı olan, veriyi **nasıl kullanacağını** söyleyen istemci kuralları. Elimizde: tam sunucu kaynağı, tablolar ve N3BASE'in yalnızca arayüz/doku/animasyon-anahtarı parçası (`N3Joint`, `N3Chr`, `N3AnimControl` yok). Yöntem sırası: **1)** veriden çıkarım, **2)** `.exe` içindeki düz metin/sabit arama, **3)** paketi açıp tersine mühendislik (ancak 1-2 yetmezse; önce kullanıcıya sorulur). İlke: oyunu uyarlıyoruz, kural icat etmiyoruz.

Bilinmeyenler (bulunca işaretle):
- [ ] Varsayılan **kısayol tuşu tablosu** (şimdilik U/K/I/C/T istek üzerine verildi)
- [ ] **Silah türüne göre** bekleme/saldırı/skill animasyon seçimi (`breath_sword0`, `attack_sword0_A`… hangi eşya türü hangisini kullanıyor)
- [ ] Animasyon **hız/geçiş/vuruş anı** kuralları, hareket ve koşma **hız sabitleri**, yürüme↔koşma geçişi
- [ ] **Kamera** kuralları (mesafe, açı sınırları, çarpışma)
- [ ] **Skill efekti** tetikleme (`.fxb`, `.n3fxplug`), ses çalma kuralları
- [ ] Dokuların/ışığın **render ayarları** (zemin karışım kuralı, gökyüzü, su, sis değerleri)
- [ ] `.n3joint`, `.n3chr`, `.n3anim` okuyucu sınıflarının **gerçek kodu** (formatlar şimdilik hex incelemeyle çözüldü; bazı alanların anlamı belirsiz)
- [ ] Arayüz **olay mantığı** (hangi düğme ne yapar: Map, Control, Invite, Option, hızlı çubuk…)
- [ ] `modify_us.tbl` gibi okunamayan dosyaların istemcide nasıl çözüldüğü
- [ ] Ağ paketi **istemci tarafı** düzeni (sunucu kaynağından çıkarılacak; istemci doğrulaması için `.exe`)

İlerleme:
- [ ] **Yöntem 1** (veriden çıkarım) — sürekli uygulanır
- [x] **Yöntem 2** (`.exe` düz metin taraması) yapıldı: bulgular [istemci-kodu.md](istemci-kodu.md). Çıkan en önemli sonuç: istemcinin okuduğu 45 tablo, kuralların çoğunu veri olarak taşıyor.
- [ ] **Uydurma değerleri orijinal tablolarla değiştir:** deneyim eğrisi → `Player_experience.tbl` (şimdi yanlış formül), başlangıç statüleri/eşyaları → `NewChrValue.tbl`, adım sesleri → `Move_Sound.tbl`, skill verileri → `Skill_Magic_*`.
- [ ] `Data/DefaultCamera.N3Camera` (453 bayt) ve `Zones/Camera/*.n3camera` okuyucusu: kamera ayarlarını orijinalden al.
- [ ] **Yöntem 3** (paket açma + tersine mühendislik) — yalnızca gerekirse, kullanıcıya sorarak

---

## 🎮 Tek oyunculu mod (tarayıcı oyunu)

- [x] Harita: arazi + karo dokuları + binalar/ağaçlar
- [x] Kamera: takip, döndürme, yakınlaştırma
- [x] Oyuncu karakteri (El Morad şövalyesi modeli, animasyonlu), WASD ve tıklayarak yürüme
- [x] Canavarlar: Worm, Bandicoot, Kecoon, Bulcan, Gavolt, Werewolf — gezinme, kovalama, saldırı, ölüm, yeniden doğma
- [x] Savaş, deneyim, seviye atlama, ölüm ve yeniden doğma
- [x] Ganimet sandıkları, Noah (altın), eşyalar (oyunun İngilizce adları ve simgeleri), envanter, silah/zırh kuşanma
- [ ] Canavar değerleri (can, hasar, seviye) şu an elle verildi → sunucu veritabanındaki gerçek değerler kullanılacak
- [ ] Canavarların harita üzerindeki gerçek yerleşimi (`.mob` / sunucu `K_NPCPOS`) kullanılacak
- [ ] Kuşanılan eşyanın karakter üzerinde görünmesi (`.n3cplug`, `.n3cpart` değişimi)
- [ ] Skill'ler, iksirler, NPC'ler, mağaza
- [ ] Gökyüzü (`.n3sky`), efektler (`.fxb`), sesler (`.ogg`), su
- [x] Oyunun orijinal arayüzü: HP çubuğu, görev çubuğu, durum (U), skill (K), envanter (I) pencereleri oyunun kendi UIF/doku dosyalarından ([formatlar/uif.md](formatlar/uif.md)). Kalanlar: "Eksikler ve sonraki işler".
- [ ] Performans: dokuların sıkıştırılması (KTX2), uzak nesnelerin sadeleştirilmesi, büyük haritaların parça parça yüklenmesi

## 📦 Dosya formatlarını çözme (tam kontrol hedefi)

Ayrıntılı durum: [formatlar/README.md](formatlar/README.md)

- [x] `.tbl` oyun tabloları → CSV/JSON ve geri (244/246, bayt bayt kayıpsız)
- [x] `.hdr` + `.src` paket arşivleri (okuma + yeniden paketleme)
- [x] `.dxt` / `.gtt` / `.tct` dokular → PNG (sürüm 7 şifreli olanlar dahil; 39 `.dxt` dosyasında "NTF" imzası yok, doku değil)
- [ ] `.dxt` geri yazıcı (PNG → .dxt)
- [x] `.n3pmesh`, `.n3shape` statik modeller → glTF
- [x] `.n3joint`, `.n3cskins`, `.n3cpart`, `.n3anim` karakterler ve animasyonlar → glTF
- [ ] `.n3chr`, `.n3cplug`, `.n3chrplug`, `.n3vmesh`, `.n3mesh`
- [x] `.gtd` arazi (çoğu harita; bazı haritaların başlığı farklı, okunamıyor)
- [x] `.opd` harita nesneleri (kayıtlar arasındaki bilinmeyen ek alan atlanıyor)
- [ ] `.tct` (renk haritası, şifreli), `.tlt` (ışık haritası), `.glo`, `.gmd`, `.gev`, `.gfo`, `.ens`, `.flag`, `.brd`
- [ ] `.opdext`, `.opdsub`, `.evt`, `.evtsub` harita nesne ekleri ve olayları
- [x] `.uif` / `.lilith` arayüz dosyaları — okunuyor (185/187). Geri yazıcı (düzenleyip tekrar şifreleme) henüz yok.
- [ ] `.n3scene`, `.n3camera`, `.n3light`, `.n3sky`, `.n3fxplug`, `.fxb` sahne, ışık, gökyüzü, efektler
- [ ] `.mob` yaratık yerleşimleri
- [ ] Diğer küçük harita dosyaları (`.navimesh`, `.rvr`, `.wap`, `.wal`, `.tsd`, `.trn`, `.tld`, `.tcm`, `.sdt`, `.pvr`, `.grs`, `.tgx`, `.swal`, `.dtx`, `.mcn`, `.gea`, `.n3m`, `.n3pp`, `.n3me_lightmap`)
- [ ] Server tarafı formatlar: `.smd` ✅ okunuyor ([formatlar/smd.md](formatlar/smd.md)); Lua script'leri ⬜

## 🔍 Sonra dönüp bakılacaklar (açık sorular)

**Tablolar**
- [ ] `Data/modify_us.tbl` hiçbir bilinen yöntemle açılmıyor — sunucuya özel şifre olabilir. Oyunun bu dosyayı kullanıp kullanmadığı da kontrol edilecek.
- [ ] Çift şifreli tabloların başındaki **5 baytlık önekin** anlamı bilinmiyor (şimdilik aynen korunuyor).
- [ ] CSV başlıklarında sadece sütun türü var (`1:DWORD`…). **Gerçek sütun adları** kaynak koddaki yapılardan (`GameDef.h` → `TABLE_ITEM_BASIC` vb.) çıkarılıp eklenecek.
- [ ] `Item_Org_us.tbl` içinde **tekrar eden ID'ler** var (261001000, 261002000… — oyun sadece ilkini kullanıyor). İncelenecek.
- [ ] Tablolardaki **Korece iç adlar** anlamsız karakterler olarak görünüyor. Zararsız (baytlar korunuyor).
- [ ] Oyunun hangi tabloyu okuduğu netleştirilecek: `_us` olmayan 82 tablonun hangileri doğrudan kullanılıyor.
- [ ] `Slander_us.tbl` boş (0 bayt) — oyunun buna ihtiyacı var mı?
- [ ] Edit CSV eklentisi çok büyük tablolarda yavaşlarsa alternatif düzenleyici düşünülecek.

**Modeller ve haritalar**
- [ ] `.n3anim` kayıtlarının başındaki 2 bayt ve bazı float alanların anlamı (şimdilik başlangıç/bitiş/hız/vuruş kullanılıyor).
- [ ] `.opd` nesne listesinde kayıt işareti (1051 / 5147) ve nadir ek alanın anlamı.
- [ ] Bazı `.gtd` dosyaları farklı başlıkta (ör. `clanfight`, `freezone`, `war_a`). `moradon_xmas` çözüldü (4096 baytlık blok yok); diğerleri aynı yedek düzenle denenecek.
- [ ] 30 deri ve 11 iskelet dosyası özel durumlar nedeniyle okunamıyor (çok kemikli / çok çocuklu).
- [ ] `misc\river\caust36_*.dxt` (39 dosya) anti-cheat'in oyun çalışırken bıraktığı geçici dosyalar; silinebilir.

**Server ve veritabanı**
- [x] **SQL Server 2022** — bilgisayarda zaten kuruluydu (Express, örnek `.\SQLEXPRESS`, Windows girişi). `LILITH_MYKO.bak` **2026-11-14'te `LILITH_MYKO` adıyla geri yüklendi** (229 tablo; dosyalar `C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\`). `LILITH_LOG.bak` henüz geri yüklenmedi (4,5 GB veri; oyun için gerekmiyor).
- [x] **Moradon haritası kararı:** sunucu NPC dizilimi (K_NPCPOS1098 bölge 21), başlangıç noktası (264, 302) ve kapılar **eski Moradon**a (`14th_oldmoradon.gtd`, 512 m) uyuyor; Sanctuary kristali tam NPC bölgesinde çıktı. Oyunda Moradon = `?harita=14th_oldmoradon`, sunucu eşi `old_moradon.smd` (1098moradon_0826.smd 1024 m'lik başka bir haritadır, NPC'ler ona uymuyor). `moradon_xmas` aynı yeni Moradon'un kış sürümü.
- [x] **Eski Moradon'da NPC'leri göstermek** — veritabanındaki 26 dost NPC (esnaf, rahip, Sanctuary, Clan Bank, Iron Scarecrow…) modelleriyle yerlerinde. Dışa aktarma: `araclar/sunucu/npc-disa-aktar.ps1` (SQL Server'dan `npc.json`). Tıklayınca yürür ve adını yazar.
- [ ] **NPC konuşmaları ve işlevleri:** `.lua` görev/konuşma dosyaları (`Depo/Quests`), mağaza (K_NPC `iSellingGroup` → ITEM_SELLTABLE), banka, Sanctuary. NPC'lerin bakış yönü (`byDirection`) kabaca ayarlandı; doğrulanacak.
- [ ] **Moradon'daki canavarlar:** K_NPCPOS1098 bölge 21'de ~90 canavar kaydı (Bandicoot, Kecoon, Bulcan, Werewolf…) şehir dışı bölgelerde; gerçek değerlerle (K_NPC) eklenecek.
- [ ] `LILITH_MYKO.bak` geri yüklenince `VERSION` tablosundaki **2401 / 2450** kayıtlarının gerçek olup olmadığı kontrol edilecek.
- [ ] `LILITH_LOG.bak` içeriği incelenecek.
- [ ] Veritabanındaki eşya / NPC / görev adlarının dili kontrol edilecek — **oyun İngilizce** olacak.
- [ ] Server'daki görünen adlar (**MykoNetwork → KnightEmpire**) server kurulurken güncellenecek (kullanıcıya sorularak).
- [ ] `LogInServer.ini` içindeki eski yama adresi ve client `Server.ini` içindeki eski sunucu adresi (`lilith-acs.diabloko.com`) değiştirilecek.
- [ ] Server'ın **anti-cheat** (LilithACS / Pearl Guard) bekleyip beklemediği kontrol edilecek. Tarayıcıda bu program olmayacak.

**Araçlar ve depo**
- [ ] `araclar/` için TypeScript **tür denetimi** (`tsc`) eklenecek (istemcide var: `npm run kontrol`).
- [ ] Git satır sonu uyarıları (LF/CRLF) için `.gitattributes` eklenecek.
- [ ] `KnightOnline.exe` bir koruma yazılımıyla paketlenmiş; ancak sürüm 7 doku parolası paketli dosyada düz metin olarak bulundu (çalıştırmaya gerek kalmadı). Başka bilgiler için gerekirse yine önce düz metin aranmalı.
- [ ] Çözülmüş/dönüştürülmüş veriler (`donusturulmus/`) sadece bu bilgisayarda; bulut oturumu bunlara erişemez.

**Hukuki**
- [ ] Knight Online'ın hak sahibi Mgame, 10 Kasım 2026'da GitHub'daki açık kaynak KO projesini (OpenKO) telif şikâyetiyle kaldırttı. Oyunu herkese açmadan önce telif durumu değerlendirilmeli. Depo şu an orijinal oyun dosyası içermiyor; sadece kendi kodumuz ve belgeler var.

## 🙋 Kararı sizde olanlar

- [ ] `knight online ham proje.rar` (8,3 GB) silinsin mi? İçinde her şeyin (Homeko dahil) yedeği var. Şimdilik **tutuluyor**.
- [ ] Server sahibinin değiştirdiği oyun içi adlar (MykoNetwork vb.) yerine ne yazılacak?

## 🗺️ Yol haritası (CLAUDE.md)

- [x] Aşama 0 — Keşif
- [x] Aşama 1 — Tablolar
- [x] Aşama 2 — Harita ve model okuyucuları, glTF çıktısı (sürüm 7 şifreli dokular sonradan çözüldü)
- [x] Aşama 3 — İlk görüntü: tarayıcıda harita + yürüyen karakter + kamera (+ tek oyunculu av modu)
- [ ] Aşama 4 — Sunucu bağlantısı: WebSocket köprüsü, şifreleme, login, karakter seçimi
- [ ] Aşama 5 — Oyun sistemleri (çok oyunculu): oyuncular, mob'lar, chat, envanter, savaş, skill'ler

---

## ✅ Tamamlananlar

- [x] Keşif raporu ([KESIF.md](KESIF.md))
- [x] Myko seçildi, Homeko dosyaları silindi
- [x] Client klasörü `KnightEmpire` olarak adlandırıldı
- [x] Node.js kuruldu
- [x] `.tbl` şifresi çözüldü (USKO çift şifre + iki XOR çeşidi) — [formatlar/tbl.md](formatlar/tbl.md)
- [x] Tablolar CSV olarak VS Code'da düzenlenebilir (Edit CSV eklentisi kuruldu)
- [x] Oyun dili İngilizce kararı: `_us` tabloları kullanılıyor
- [x] Paket arşivleri, dokular, arazi, nesneler, karakterler ve animasyonlar çözüldü — [formatlar/model.md](formatlar/model.md)
- [x] Tarayıcıda tek oyunculu av modu (harita, karakter, canavar, savaş, ganimet, envanter) — nasıl açılacağı [README](../README.md)'de
