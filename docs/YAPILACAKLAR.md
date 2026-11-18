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
- [~] NPC mağazaları: tüccar NPC'ye tıklayınca orijinal `re_tradeinventory` penceresi açılır; satış grupları sunucu `ITEM_SELLTABLE`'dan (7 grup, 287 eşya, sayfa değiştirme: sayfa yazısına tık), fiyat eşya tablosundan, tıklayınca satın alma (Noah/çanta kontrolü) — `araclar/sunucu/magaza-disa-aktar.ps1` + `npm run magaza`. Banka (Inn Hostess → orijinal `re_el_warehouse`: 8 sayfa × 24 yuva, tıkla-taşı, Noah yatır/çek) yapıldı, depo yalnızca oturum boyunca saklanır (kalıcı değil), Clan Bank yok. Eşya SATMA da yapıldı (mağaza açıkken çanta eşyasına tıkla; fiyat = alış/6, sunucu `NPCHandler.cpp`; "tam fiyat" bayrağı olan eşyalar ayrıştırılmadı). Kalan: adetli eşyalar (iksir/ok yığını; envanterde yığın yok), onay/adet penceresi (`re_tradecount`), tamir, mağaza açıkken uzaklaşınca kapanma; banka, konuşma/görev (`.lua`), Sanctuary.
- [x] NPC bakış yönü (`byDirection`, derece; 0 = yön verilmemiş): 751 dost NPC içinden yönü verilmiş 170'i ve 17 haritanın çarpışma verisiyle 8 yorum sınandı; bakış vektörü (cos θ, −sin θ) en iyi çıktı (önü arkasından açık: 19'a 4; eski yorum 3'e 9). Güven orta (çarpışma verisi seyrek, ±90° belirsizliği tam kapanmadı). Araçlar: `client/scripts/npcyonAnaliz.mjs`, `araclar/sunucu/npc-tum-disa-aktar.ps1`.
- [x] Moradon canavarları sunucu yerleşiminden: 84 kayıt / 436 canavar (K_NPCPOS1098 bölge 21 + K_MONSTER), her kayıt kendi alanında doğar, sunucu RegTime ile yeniden doğar, oyuncu 90 m yaklaşınca doğurulur / 130 m uzaklaşınca kaldırılır (`client/src/oyun/yerlesim.ts`, `araclar/sunucu/canavar-disa-aktar.ps1`). Pasif canavarlar (ActType 1) yalnız saldırılınca kovalar; izleme menzili sunucudan. Kalan: ActType 3-4 yardımlaşma, saldırgan canavar arama menzili test edilmedi (Moradon'da hepsi pasif), yer/duvar içine doğma kontrolü yok.
- [ ] Zemin geçişlerinin birebir karışım kuralı bilinmiyor (şimdi: renk haritası + parlaklığa göre karo katmanları).
- [ ] Işınlanma kapıları (Delos, Luferson Castle, El Morad Castle, Ardream, Ronark Land…; `old_moradon.smd` kapıları x=506,z=249 çevresinde, ücret 17000 Noah) okunuyor ama işlevsiz: hedef haritalar dönüştürülmedi (bölge → istemci harita adı eşleşmesi gerek; `npm run harita -- <ad>`), kapı/kol nesne olayları da kullanılmıyor.
- [x] Kamera duvar/tavan çarpışması: kamera ile oyuncu başı arasındaki doğru parçası sunucu `.smd` üçgenleriyle kesiştirilir; engelde kamera anında yaklaşır, engel kalkınca yavaşça açılır (`Carpisma.dogruKesisimi`, kontrol: `client/scripts/kameraduvar.mjs`). Görünmez çarpışma yüzeyleri varsa kamera beklenmedik yaklaşabilir.

**Hareket ve karakter (2026-11-14, ikinci oturum)**
- [x] **Oyuncu görünümü:** `upc_el_rm` iskeleti artık çalışıyor (sorun: bağlanma pozu 0. anahtar karesi olmalıydı — [formatlar/model.md](formatlar/model.md)); oyuncu modeli 31137 (155 animasyon). Kalan: oyuncu zırhı/silahı seçimi (look/Complete setleri), silah türüne göre saldırı/bekleme animasyonları (şimdilik kılıç: `attack_sword0_A/B`), `.n3cplug` ile silah gösterimi.
- [x] **Oturma** artık oyunun gerçek `SitDown` / `SitDown_Breath` / `StandUp` animasyonlarıyla. Kemik pozu yalnızca bu animasyonları olmayan modeller için yedek.
- [ ] Oturma yenilenme oranları (can %4, mana %5 / sn) ve "savaştan 4 sn sonra otur" kuralı ilk tahmin; ayarlanacak (`main.ts` sabitleri).
- [x] Hız sabitleri sunucudan: oyuncu koşusu 4,5 m/sn (sunucu hız sınırı 45 → savaşçıda 67 = 45×1,5 Sprint; birim 0,1 m/sn), canavar gezinme/kovalama hızı `bySpeed1/2` (m/sn). Kalan belirsizlik: yürüme hızı (şimdi koşunun yarısı) orijinalden doğrulanmadı; bazı canavarlarda `bySpeed2` (kovalama) `bySpeed1`'den küçük (veri böyle, aynen uygulandı).
- [ ] Sohbet kutusu yalnızca yerel yankı yapıyor (sunucu yok); sekmeler (Normal/Private/Shout/Party/Knights) işlevsiz, kullanıcı listesi gizli.
- [ ] Bilgi penceresinin "Merchant Chat" / "Recent Notices" sekmeleri işlevsiz; kaydırma çubukları gizli (fare tekerleği çalışıyor).
- [ ] Hasar bilgisi mesajları yalnızca bilgi penceresinde; ganimet penceresi eski arayüzde.
- [x] Hedef çerçevesi orijinal `re_target_framebar` ile (isim, can çubuğu/yazısı, seviye farkı rengi). Kalan: `frame_N` hedef türüne göre çerçeve seçimi ve renk eşikleri orijinalden bilinmiyor (şimdi sade çerçeve + tahmin eşikleri).
- [ ] `animAdi` artık özgün animasyon adlarına bakıyor; 155 animasyonlu modellerde saldırı animasyonları `attack_sword0_A` gibi adlarla duruyor (`saldir0/1` olarak eşlenmedi).

**Orijinal arayüz — eksikler**
- [x] Ganimet penceresi orijinal `re_droppeditem` ile (12 yuva, ilk yuva Noah). Kalan: Noah simgesi (şimdi sarı kare), "hepsini al" kısayolu.
- [x] Otur (C) ve yürü/koş (T): tuşlar ve görev çubuğundaki düğmeler çalışıyor (ayrı bir düğme yapılmayacak).
- [ ] Görev çubuğunun çoğu düğmesi işlevsiz (Map, Control, Invite, Option, Exit); ortadaki 4 simge (`re_el_hotkey` hızlı çubuk) bağlı değil.
- [ ] Skill penceresi: yalnızca "Basic Skill" sekmesi ve El Morad Savaşçı temel skilleri listeleniyor; skill **kullanılamıyor** (MP harcama, hasar, etki yok). Sınıf sekmeleri ve skill puanı harcama yok; üstteki "P" (premium) düğmeleri gizlenemedi.
- [ ] Durum penceresi: Myko'nun "perk" paneli gizli; direnç ve silah savunma değerleri 0; ağırlık yalnızca yuva sayısı; Knight Cash / TL bakiyesi 0.
- [ ] Envanter: yalnızca silah (yuva 6) ve zırh (yuva 4) ekipman olarak çiziliyor; diğer 13 ekipman yuvası, çanta kilidi/kozmetik paneli, eşya yok etme çalışmıyor. Sürükle-bırak yok (tıkla-kuşan).
- [x] Pencere ölçeği: durum/skill/envanter pencereleri görev çubuğunun üstünde kalacak şekilde otomatik küçülür (en az 0,45; CSS `scale`), dar ekranda sohbet + skill çubuğu + bilgi penceresi birlikte küçülür, yeniden boyutlandırmada konumlar ekran içinde tutulur; ölçekli pencere sürüklenebilir. Kullanıcıdan ayarlanan ölçek seçeneği yok (otomatik).
- [ ] `.lilith` arayüz geri yazıcısı (pencere düzenleyip tekrar şifreleme).
- [ ] U / K / I kısayol tuşları istek üzerine verildi; oyunun kendi varsayılan kısayol tablosu (KnightOnline.exe) çözülmedi.

## 🔒 Erişemediğimiz istemci kodu (`KnightOnline.exe`, paketli, kaynağı yok)

Veri dosyaları açık; kapalı olan, veriyi **nasıl kullanacağını** söyleyen istemci kuralları. Elimizde: tam sunucu kaynağı, tablolar ve N3BASE'in yalnızca arayüz/doku/animasyon-anahtarı parçası (`N3Joint`, `N3Chr`, `N3AnimControl` yok). Yöntem sırası: **1)** veriden çıkarım, **2)** `.exe` içindeki düz metin/sabit arama, **3)** paketi açıp tersine mühendislik (ancak 1-2 yetmezse; önce kullanıcıya sorulur). İlke: oyunu uyarlıyoruz, kural icat etmiyoruz.

Bilinmeyenler (bulunca işaretle):
- [x] Varsayılan **kısayol tuşu tablosu** — OpenKO 1299 istemci kaynağından (`GameDef.h` eKeyMap, `GameProcMain.cpp`) alındı: 1-8 skill, F1-F8 sayfa, PageUp/PageDown sayfa ±1 (uçlarda durur), T koş/yürü, E otomatik ilerleme, R sürekli saldırı aç/kapa, C otur, I/K/U pencereler, M mini harita, H komut listesi, F10 yardım, Home/End kamera eğimi (45°/sn), Z en yakın düşman (ona döner). Sınama: `client/scripts/kisayolTesti.mjs`. Kalan: F9 bakış değiştirme (birinci şahıs kamerası yok), X en yakın partili (parti yok); Q/Tab hedef seçimi ve P/F/L/N pencere tuşları orijinalde yok, istek üzerine duruyor; ses aç/kapa artık Shift+M; A/D dönüş hızı bizde 2,4 rad/sn (orijinal 60°/sn) — kullanıcı kararı bekliyor.
- [ ] **Silah türüne göre** bekleme/saldırı/skill animasyon seçimi (`breath_sword0`, `attack_sword0_A`… hangi eşya türü hangisini kullanıyor)
- [ ] Animasyon **hız/geçiş/vuruş anı** kuralları, hareket ve koşma **hız sabitleri**, yürüme↔koşma geçişi
- [ ] **Kamera** kuralları (mesafe, açı sınırları, çarpışma)
- [~] **Skill efekti:** `.fxb` okuyucu (OpenKO kaynağından, %96) + oynatıcı yapıldı, skill kullanımına bağlı (Sprint, Defense, vuruş efekti çalışıyor). Kalan: 17 dosya, mesh parçaları, uçan efekt, ses — bkz. [formatlar/fxb.md](formatlar/fxb.md).
- [ ] Dokuların/ışığın **render ayarları** (zemin karışım kuralı, gökyüzü, su, sis değerleri)
- [ ] `.n3joint`, `.n3chr`, `.n3anim` okuyucu sınıflarının **gerçek kodu** (formatlar şimdilik hex incelemeyle çözüldü; bazı alanların anlamı belirsiz)
- [ ] Arayüz **olay mantığı** (hangi düğme ne yapar: Map, Control, Invite, Option, hızlı çubuk…)
- [ ] `modify_us.tbl` gibi okunamayan dosyaların istemcide nasıl çözüldüğü
- [ ] Ağ paketi **istemci tarafı** düzeni (sunucu kaynağından çıkarılacak; istemci doğrulaması için `.exe`)

İlerleme:
- [ ] **Yöntem 1** (veriden çıkarım) — sürekli uygulanır
- [x] **Yöntem 2** (`.exe` düz metin taraması) yapıldı: bulgular [istemci-kodu.md](istemci-kodu.md). Çıkan en önemli sonuç: istemcinin okuduğu 45 tablo, kuralların çoğunu veri olarak taşıyor.
- [x] **Oyuncu kuralları orijinale çevrildi:** deneyim eğrisi (sunucu `LEVEL_UP`), başlangıç statüleri/puanı (`NewChrValue.tbl`), can/mana formülü ve seviye atlama (sunucu kaynağı). Ayrıntı: [istemci-kodu.md](istemci-kodu.md).
- [x] **Savaş formülleri sunucudan:** normal vuruş, canavar vuruşu, isabet tablosu, silah gecikmesi, canavar değerleri (`K_MONSTER`), deneyim ödülü — [istemci-kodu.md](istemci-kodu.md). Kritik vuruş ve eski uydurma formüller kaldırıldı.
- [ ] **Hâlâ tahmin olanlar:** canavar yerleşimi (`K_NPCPOS1098` konumları; şimdi başlangıç çevresine halka), altın/eşya düşme kuralları (`K_MONSTER_ITEM`, `iMoney`), oturunca yenilenme oranı, normal HP/MP yenilenmesi (sunucu), saldırı menzili.
- [x] **Başlangıç eşyaları** (`NewChrValue.tbl`): Hepa's Exceptional Raptor + 5 parça Chitin Shell zırhı artık ekipmanda; tam ekipman yuvaları (15) ve çıkarma (yuvaya tıkla). Kalan: eşyaların karakter modelinde görünmesi; eşya eklenti kodları (numaranın son 3 hanesi: 048); sol el/yüzük/küpe gibi yuvalar için eşya yok.
- [x] **Skill çubuğu ve skill kullanımı:** `re_el_hotkey` penceresi (1-8 tuşları, skill penceresinden sürükle-bırak, sağ tık siler, çift tıkla skill kullan, bekleme sayacı); sunucu kuralları: MP harcama, tekrar kullanım (ReCastTime×90 ms), Type1 hasar (ıskalamaz), Type4 buff (Sprint hızı, Defense savunması, süre).
- [ ] **Skill eksikleri:** skill efektleri (`fx.tbl`, `.fxb`) ve sesleri yok; skill animasyonları gerçeği bilinmiyor (şimdi saldırı/`magic_heal` kullanılıyor, `MAGIC.t_1` alanı anlamı); aktif buff simgesi yok (yalnızca sohbet mesajı); silah min/maks hasarının skill'e eklenmesi; diğer sınıfların skill sayfaları ve skill puanı harcama; menzil kontrolü sunucuda kapalı (biz yakın dövüş menzili kullanıyoruz).
- [x] Statü sıfırlama (`btn_reset_stat`): harcanan puanları geri verir (ücretsiz). Sunucuda eşya/altın gerekebilir, bakılacak.
- [x] Karar: yeni karakter **0 serbest statü puanıyla** başlar (sunucu NewChrValue 10 puan verir; kullanıcı kararıyla kaldırıldı). Seviye atlayınca 3 puan (60'tan sonra 5).
- [x] W+A / W+D basılıyken 360° sürekli dönüş (direksiyon); tuş bırakılınca yön korunur.
- [x] Envanterde karakter alanında animasyonlu oyuncu önizlemesi (sürükleyerek döner). Kalan: giyilen eşyaların önizlemede görünmesi.
- [x] `Data/DefaultCamera.N3Camera` okundu (`npm run kamera`, testli): göz (15,5,−15), bakış (0,0,0), görüş açısı tam 55°, yakın 0,7, uzak 512. İstemci görüş açısı/yakın/uzak düzlemi ve sis bitişini bundan alır. `Zones/Camera/*.n3camera` dosyalarının kullanımı (bölgeye özel kamera) bilinmiyor.
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
- [x] Canavarların gerçek yerleşimi (Moradon): bkz. yukarıda. Diğer haritalar için `canavar-disa-aktar.ps1 -Bolge N -Harita ad` çalıştırılır.
- [~] Kuşanılan eşyanın karakter üzerinde görünmesi: oyuncu artık başlangıç eşyalarının görünümüyle (savaşçı Chitin Shell seti = `Chr/upc_el_rm_chitin_w.n3chr`, model 931137) çiziliyor (`npm run karakter -- 931137=31137:Chr/upc_el_rm_chitin_w.n3chr`). Eşya değişince görünümün değişmesi yapılmadı. Bulgu: klasik zırh eşyalarında parça adı eşya tablosu sütun 7'den (`20010121` → `item/2_0010_12_1.n3cpart`) türüyor görünüyor; Myko'nun özel setlerinde (Chitin) tek tek parça dosyası yok, komple `.n3chr` var. Silah: eşya tablosu sütun 7 → `item/A_BBBB_CC_D.n3cplug`; `.n3cplug` biçimi çözüldü (ad, tür, eklem no, konum, 4×4 yönelim, ağ ve doku yolu) ve 121 silah elde görünüyor: sağ el = eklem 12, sol el/kalkan = eklem 7 (`npm run silahlar`, `client/src/dunya/karakter.ts` plugTak); envanter önizlemesinde de görünür. Kalan: elde duruş animasyonları silah türüne göre (`breath_sword0`…), kalkanlar/çift silah denenmedi, yönelim bazı silahlarda yanlış olabilir.
- [ ] Skill'ler, iksirler, NPC'ler, mağaza
- [x] Sesler: karakter/canavar saldırı-darbe-ölüm sesleri (NPC_Looks sütun 23-27 → sound.tbl), oyuncu adım sesleri (Move_Sound), bölge müziği (`Snd/21_moradon.ogg`), M tuşu ile kapat/aç — `araclar/oyun/ses.ts` (`npm run ses`), `client/src/oyun/ses.ts`. Kalan: yürüme sesi canavar/NPC için, zemin türüne göre adım, skill/eşya/arayüz sesleri, NPC sesleri, adım aralığı (orijinal değer bilinmiyor).
- [~] Gökyüzü: `.n3sky` biçimi çözüldü (10 doku yolu + 43 anahtarlı gün döngüsü: şafak/öğle/gün batımı/gece × gökyüzü, sis, güneş, parıltı, bulut, ışık renkleri; testli, `npm run gokyuzu`). Oyunda gökyüzü kubbesi, sis, ışıklar ve güneş yönü gün saatine göre değişir; oyun saati = gerçek yerel saat (sunucu `m_sHour` gibi), `?saat=12` ile zorlanır. Kalan: güneş/ay diski, parıltı, bulut katmanları ve yıldız dokuları (`misc/sky/*.bmp/tga`), anahtar zamanlarının (öğle=06:00?) yorumu doğrulanmadı, hava hep açık.
- [~] Efektler ve su: **su yapıldı** (nehir, kanal, deniz; `.gtd` kuyruğu, kostik animasyonu — bkz. formatlar/model.md). **Animasyonlu dokular** (ateş, duman, işaret) çalışıyor. Beceri efektleri (`.fxb`, 1219 dosya) çözülmedi: bulgular [formatlar/fxb.md](formatlar/fxb.md).
- [x] Ufukta uzun yeşil şeritler: incelendi, hata değil görünüyor — kaynak `obj_el_treea` ağaç modeli (52 örnek, ölçekler normal 0,4–1,2; ağ kenarları ≤17 m); kameraya yakın büyük bir ağacın yaprak kartları kenardan görününce ince şerit gibi duruyor. Düzeltme gerekmez.
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
- [ ] `LILITH_MYKO.bak` geri yüklenince `VERSION` tablosundaki **2401 / 2450** kayıtlarının gerçek olup olmadığı kontrol edilecek.
- [ ] `LILITH_LOG.bak` içeriği incelenecek.
- [ ] Veritabanındaki eşya / NPC / görev adlarının dili kontrol edilecek — **oyun İngilizce** olacak.
- [ ] Server'daki görünen adlar (**MykoNetwork → KnightEmpire**) server kurulurken güncellenecek (kullanıcıya sorularak).
- [ ] `LogInServer.ini` içindeki eski yama adresi ve client `Server.ini` içindeki eski sunucu adresi (`lilith-acs.diabloko.com`) değiştirilecek.
- [ ] Server'ın **anti-cheat** (LilithACS / Pearl Guard) bekleyip beklemediği kontrol edilecek. Tarayıcıda bu program olmayacak.

**Araçlar ve depo**
- [x] `araclar/` için TypeScript tür denetimi: `npm run kontrol` (araclar klasöründe), 37 dosya hatasız.
- [x] `.gitattributes` eklendi (LF); satır sonu uyarıları kalktı.
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
  - [x] Protokol incelemesi (kaynaktan): `docs/protokol.md` (çerçeve, JvCryption, login ve oyun sunucusu akışı, XSafe notu)
  - [x] Karar: önce hazır `.exe` sunucuyla (Knight All in one + JPKO yedeği) denenecek, sonra Myko'ya geçilecek
  - [x] Köprü (`kopru/`): çerçeve + JvCryption + WebSocket↔TCP köprüsü, 16 test (sahte login server ile uçtan uca)
  - [x] Gerçek sunucu denemesi (resmî 1298 `.exe`'ler): login + oyun sunucusu giriş akışı çalıştı (`docs/protokol.md` §11). SQL'de `KN_online` veritabanı ve kullanıcıya özel ODBC kaydı `KN_online` duruyor (silmek istenirse: `DROP DATABASE KN_online`, `HKCU:\Software\ODBC\ODBC.INI\KN_online`)
  - [x] **Myko sunucusu kaynaktan derlendi ve çalıştırıldı** (VS 2022 Build Tools; `docs/sunucu-derleme.md`, `kopru/myko-baslat.ps1`). Defender derlenen dosyalarda bir şey bulmadı, istisna eklenmedi
  - [x] Myko'ya karşı tam akış doğrulandı: giriş (şifreli) → sunucu listesi → oyun sunucusu giriş → karakter listesi → karakter seç → oyun başlat (`docs/protokol.md` §12, `kopru/src/deneme-myko.ts`)
  - [x] `WIZ_MYINFO` (0x0E) tam çözüldü (1596 bayt, envanter dahil, veritabanıyla birebir doğrulandı), karakter listesi/seçimi, saat, hava (`kopru/protokol/paketler.ts`, gerçek yakalamalı testler)
  - [x] Tarayıcı client'ı sunucuya bağlandı (`client/src/ag/sunucu.ts`): konsoldan `await ke.sunucuyaBaglan(hesap, sifre)` → giriş → karakter → oyuna giriş; seviye/stat/can/mana/altın/eşya/konum/ad oyuncuya uygulanır (`client/scripts/sunucuTesti.mjs`)
  - [x] **Giriş ve karakter seçim ekranı:** oyunun kendi `re_login_intro` (ID/Password, Remember Me, hata iletileri) ve `re_characterselect` (karakter adı/seviye/sınıf, ok düğmeleri, Start Game, Back) pencereleriyle tam ekran (`client/src/arayuz/girisEkrani.ts`). Sayfa açılınca varsayılan olarak gelir; `?giris=0` kapatır, otomatik tarayıcılarda (testler) kapalıdır. Giriş ekranındaki "Play offline (single player)" bağlantısı tek oyunculu moda geçirir. Sınama: `client/scripts/girisAkisTesti.mjs` (gerçek sunucuyla giriş → Back → yeniden giriş → Start Game). Kalan: **karakter oluşturma** (`re_charactercreate` + sunucu paketi) ve 3B karakter sahnesi yok; sunucu listesi penceresi gizli (sunucu tek, adı girişten sonra gelir); Option düğmesi boş; hesap ve şifre uzunluk sınırı orijinalden bilinmiyor (30).
  - [ ] İstemci eşya listesi sunucudaki tüm eşyaları kapsamıyor (6 eşyadan 1'i eşleşmedi): `Item_Org_us.tbl` tamamından üret
  - [x] **Karakter modeli ırka göre** (kendimiz ve diğer oyuncular): 1-4 Karus ırkları, 11 Barbar, 12 Erkek, 13 Kadın → `client/src/oyun/veri.ts` `IRK_MODELLERI` (zırhlı hazır görünümler; Lilith artık kadın El Morad). Kalan: sınıfa/eşyaya göre giydirme (diğer oyuncuların `WIZ_USER_INOUT` eşya listesi hazır, çizilmiyor), yüz/saç; klan üyesi karakterlerin `WIZ_MYINFO` klan bloğu
  - [x] **Aşama 5 başlangıcı:** canlı dünya — sunucudan canavarlar (giriş/çıkış/hareket), diğer oyuncular (liste/giriş/çıkış/hareket) görünür ve yürür; kendi hareketimiz sunucuya bildirilir (kurallara uygun, testli) — gerçek sunucuda ve tarayıcıda doğrulandı (docs/protokol.md §14)
  - [x] **Savaş sunucuya bağlandı:** saldırı isteği, isabet/ıska, hasar, canavar canı, canavarın karşı vuruşu, ölüm, deneyim, seviye atlama, yeniden doğma (docs/protokol.md §15; tarayıcıda doğrulandı)
  - [x] Envanter: sağ tık ile giy/çıkar, sol tuşla sürükle-bırak (çanta ↔ çanta ↔ ekipman); sol+sağ tuşla dönüşte karakter kamerayla birlikte döner (kullanıcı isteği, 2026-11-17)
  - [ ] Sunucu modunda eşya taşıma/giyme sunucuya bildirilsin (WIZ_ITEM_MOVE 0x1F); şimdilik yalnızca istemcide (sunucuya yansımaz)
  - [ ] Ganimet: ölen canavarın torbasını aç/al (0x23, 0x24, 0x26), altın (0x4a); sunucu skill'leri (0x31 WIZ_MAGIC_PROCESS); oyuncu-oyuncu savaşı
  - [x] Sohbet (0x10 gönder/al), NPC etkileşimi (0x20, diyalog 0x55 + görev 0x64), envanter/eşya (0x1F, 0x21, 0x32…), skill (0x31) paketleri — hepsi gerçek sunucuyla çalışıyor (`kopru/protokol/`, `docs/protokol.md`).
  - [ ] Diğer oyuncuların eşyaları/modeli görünsün (şimdi hepsi aynı model); ırk/sınıfa göre model
  - [ ] Dost NPC'ler (tür 2) sunucudan gelsin (şimdi yerel npc.json); bölge/harita değişimi (WIZ_ZONE_CHANGE)
  - [ ] Test için ikinci hesap/karakter (kotest1/KoTest) yerel veritabanında; GitHub'a girmeyen yerel veri
  - [ ] Eski 1298 `.exe` sunucuları (Defender: Trojan) çalıştırılmayacak; `kopru/sunucu-baslat.ps1` varsayılan olarak reddeder
  - [ ] Client'ın (KnightOnLine.exe) gerçek paket sırasını bir bağlantı kaydıyla doğrula (şimdiye kadar yalnızca sunucu tarafı doğrulandı)
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


**Arayüz — tüm pencereler (2026-11-15)**
- [x] Oyundaki bütün arayüz pencereleri dışa aktarıldı (`npm run arayuz -- hepsi`: 980 dosya; 25'i eski sürüm biçiminde olduğu için okunamadı: `ka_*` ırk-eski seti, `co_login`, `re_auction_register`, `re_powerup_store`). Oyun `re_*`/`re_el_*` pencerelerini kullanıyor; 289'unun hepsi hatasız açılıyor (`client/scripts/pencereTesti.mjs`).
- [x] Genel pencere yöneticisi (`client/src/arayuz/genelPencereler.ts`): sürükleme, öne gelme, kapatma düğmesi, sekme düğmeleri, Esc. Görev çubuğu düğmeleri ve kısayollar (P parti, F dost, Q görev, L klan, N duyuru, O çerçeve, Esc çıkış menüsü) bağlandı. Eşleşmeler pencere metinlerinden tahmin edildi.
- [~] Pencere içerikleri (2026-11-17): mini harita (gerçek harita + oyuncu noktası), skill/envanter/karakter/mağaza/banka/diyalog dolu; **görev sayfası** artık sunucudaki görev durumlarını ve oyunun görev adlarını gösterir (sürüyor önce, tamamlananlar sonda; tekerlekle sayfa). Kalan kabuklar: görev ayrıntıları (av hedefi/ödüller), parti üye listesi, dost listesi, klan, mektup, komut listesi içeriği, çıkış menüsü "Run option after exiting".
- [ ] `ka_*` ve `co_login` için eski UIF sürümü okuyucusu (şimdilik gerekmiyor).

**İstemci düzenlemeleri (2026-11-15, 2. tur)**
- [x] Skill çubuğu: üstteki topla sürüklenip taşınıyor (konum kaydediliyor), çift tıklama dikey/yatay değiştiriyor; 8 sayfa × 8 yuva (sunucu en çok 64 kısayol), sayfa okları işlevli; altındaki kilit düğmesi çubuğun taşınmasını kilitliyor (sayfa değişimi serbest).
- [x] Klavye: A/D karakteri döndürür (kamera birlikte döner), W karakterin baktığı yöne gider, S geri gider; ilerlerken kamera yavaşça arkaya geçer.
- [x] Ganimet kutusu 4 kareli; yürümeye başlayınca / hedef değişince kapanır.
- [x] Sohbet ve bilgi pencereleri: köşelerden büyütülür, üst kenardan taşınır, sağ alttaki top kilitler (\`serbestPencere.ts\`).
- [x] Durum penceresi üstünde Character / Clan / Friends sekmeleri; dost listesi yerel (kırmızı partide, yeşil çevrimiçi, gri çevrimdışı). Sunucu olmadığı için eklenen dostlar çevrimdışı (gri) görünür; durum sunucudan gelecek. Klan sekmesi şimdilik boş ("No Clan").
- [x] Canavar/NPC adları oyunun kendi yazı tipiyle (\`fonts/mg basic.ttf\`, \`npm run yazitipi\`), can çubukları kaldırıldı.
- [ ] Dost listesindeki renk açıklamasının yanındaki küçük nokta simgeleri hâlâ orijinal renkte (mavi/yeşil/gri); yazı renkleri düzeltildi.

**İstemci düzenlemeleri (2026-11-15, 3. tur)**
- [x] Skill çubuğu: top yalnızca sürükleme; yön düğmesi (►►►) ve kilit düğmesi oyunun \`knight1.dxt\` simgelerinden, iki yönde de görünür; F1–F8 sayfa tuşları, sayfa numarası gizli.
- [x] Sohbet penceresi oyunun \`el_chat_us\` düzeniyle (Chat/Normal/Private/Shout/Party/Clan/Ally), iletiler 14 px, sistem iletileri sarı. Bilgi penceresi arka planı sohbetle aynı saydamlıkta (0,55 elle ayarlandı, orijinal değer ölçülmedi), köşe tutamağı görünür, kilit topu sol altta.
- [x] Z (en yakın) / Q / Tab hedef seçer, R temel saldırıyı başlatır (fareyle tıklama eskisi gibi saldırtır). Q artık görev penceresi kısayolu değil. A/D kamerayı döndürmez.
- [x] Canavar adları 16 px aşağıda, hepsi seçili-renk (#ff8a7a). Orijinal client kaynağı olmadığından orijinal ad rengi/konumu doğrulanamadı.
- [x] Düşen kutu oyunun \`Misc/itembox.n3shape\` modeli, Noah simgesi eşya tablosundaki "Coin" (90001000) (\`npm run itembox\`). Düşen paranın ayrı bir yer modeli bulunamadı; tek kutu kullanılıyor.

**İstemci düzenlemeleri (2026-11-15, 4. tur)**
- [x] Hedef halkası: oyunun \`Misc/target_symbol_plane.dxt\` (yeşil halka) resmi, seçili canavarın ayağında (toplamalı karışım); \`npm run itembox\` resimleri üretir. Baş üstü işareti (\`target_symbol.dxt\`) henüz çizilmiyor.
- [x] Kamera uzaklığı 3 m ile varsayılan kamera mesafesi arasında (≈21,8 m, \`DefaultCamera.N3Camera\`). Orijinalin gerçek yakınlaştırma sınırları okunabilir veride bulunamadı; bu değer türetilmiştir.
- [x] Düşen kutu yerde sabit (zıplama/dönme kaldırıldı), orijinal boyutta.
- [x] Karakter adı başın üstünde (partideyse sarı, değilse beyaz: \`re_el_hpbar\` ad rengi). O tuşu oyuncu adlarını açıp kapatır (O artık çerçeve penceresi kısayolu değil). Parti sistemi henüz yok (\`oyuncu.partide\`).
- [x] Canavar adı seçim kutusunun hemen üstünde (kutu üstü + 4 px).
- [x] Sohbet/bilgi pencereleri sekme yazısından (Chat / Information) tutulup taşınır; kilit topu sohbette solda, bilgide sağda. Durum penceresi sekmeleri 4 eşit parçalı (Character/Clan/Friends/Title) ve pencere genişliğine oturuyor.

**Orijinal savaş kuralları (2026-11-15)**
- [x] Ölüm: bölgede ExpLost varsa ve seviye ≥ 6 ise seviyenin en çok deneyiminin 1/20'si kaybolur; deneyim sıfırın altına inerse seviye düşer (sunucudaki hesapla). Yeniden doğma: START_POSITION (264..267, 302..305), can tam dolar (mana değişmez), 10 sn göz kırpma (canavarlar fark etmez, skill kullanılamaz, saldırınca biter). Kaynak: `Npc.cpp`, `UserHealtMagicSpSystem.cpp`, `AttackHandler.cpp` (Regene), `User.cpp` (BlinkStart).
- [x] Ganimet: canavar başına sunucu tablosu (K_MONSTER_ITEM + MAKE_ITEM_GROUP) ve para (iMoney × %70–100, en çok 32000); `npm run ganimet`. Ölçümle doğrulandı (Worm: para 15–22, eşya oranları tablodaki yüzdelere uygun).
- [ ] Ganimette yığın adedi (ok 20 adet, iksir) yok; her eşya bir yuva. Ganimet yalnızca son vuran/en çok hasar veren içindir (tek oyuncuda fark yok).
- [ ] Sıradaki: skill türleri (MAGIC_TYPE 2-9), buff/direnç, canavar yapay zekâsı.

**Animasyon, kamera, pencere (2026-11-15, 5. tur)**
- [x] Oyuncu animasyonları silah türüne göre (bekleme, saldırı A/B, skill A/B; silahsızken yumruk); S = geri yürüme (`geri`); canavar/oyuncu darbe ve ölüm animasyon çeşitleri rastgele. Silah türü → animasyon eşleşmesi adlardan çıkarıldı (varsayım): `client/src/dunya/karakter.ts SILAH_AILESI`. İki silahlı (dual) ve oyuncu skill'lerinde silah dışı hareketler (selamlama, savaş çığlığı, balık tutma, kanat…) henüz tetiklenmiyor.
- [x] Kamera: varsayılan açı ve mesafe `DefaultCamera.N3Camera` dosyasından (eğim ≈ 13°, mesafe ≈ 21,8 m). Bu dosyanın oyun içi takip kamerası olduğu doğrulanamadı.
- [x] Sohbet/bilgi pencereleri: alt sekme şeridi esnemez; yalnızca yazı alanı büyür (`serbestPencere.ts` seritY).

**Skill çubuğu, imleç, skill animasyonu (2026-11-15, 6. tur)**
- [x] Skill animasyonu skill tablosundaki iSelfAnimID1 numarasından (oyuncu iskeletinde doğrudan animasyon numarası: 153 dribble, 154 shoot, 24 magic4…). 26 (yakın dövüş skill'lerinde yazılı, adı Shoot_Arrow_A) yay animasyonu olduğundan silahın saldırı animasyonu kullanılıyor (varsayım). Skill efektleri (`fx.tbl`/.fxb) hâlâ yok.
- [x] Oyunun fare imleci (cursorel01/02 normal/tıklanmış, cursorattack canavar üstünde). Karus imleçleri ve tamir imleci kullanılmıyor.
- [x] Çubuk: seviyesi yetmeyen skill konamaz; skill penceresinde sağ tık = ilk boş yuvaya koy; çubukta sol tuşla sürükleyip bırakmak yuvaları değiştirir; çubukta sağ tık skill'i kaldırır.

**Savaş/arayüz iyileştirmeleri (2026-11-15, 7. tur)**
- [x] Sol+sağ tuş birlikte: karakter baktığı yönde düz ilerler (A/D ile çevrilir); çubuktan dışarı sürüklenen skill atılır.
- [x] Skill penceresindeki P kutuları kaldırıldı. Canavar: doğduğu yere dönüş ve 200 m sınırı. Yığınlanan eşyalar (adet, ok 20, satış). Kamera açısı PageUp/PageDown. Mini harita (oyunun kendi resmi, oyuncu noktası, yakınlaştırma).
- [ ] Skill efektleri (.fxb): çözülemedi, bulgular `formatlar/fxb.md`. Mini harita: NPC listesi/ışınlanma işaretleri yok. Boş kalan pencereler (parti, dost listesi sunucusu, klan, görev…) sunucu ile gelecek.

- [ ] **Parti sistemi (devam):** Party düğmesi ve davet gönderme/alma yapıldı (`kopru/protokol/parti.ts`), ama canlı sunucuda iki oyuncuyla denenmedi. Eksikler: parti üye listesi/can çubukları (PARTY_INSERT üye paketi), partiden çıkma/dağıtma, lider devri; gelen davet şimdilik tarayıcı onay kutusuyla soruluyor (özel pencere yapılabilir). Alış-veriş (Trade) düğmesi Party'ye dönüştüğü için yok.
- [ ] **Bilgi penceresi taşması:** Kullanıcı yazıların taştığını bildirdi; geliştirme ortamında yeniden üretilemedi (1280×800 ve 1920×1080'de yazı pencerede kırpılıyor, köşeden büyütünce açılıyor). Uzun sözcükler artık satır kırıyor. Sürerse kullanıcıdan ekran görüntüsü iste.

- [ ] **Skill combo (orijinal):** `MagicSkillMng.cpp` — yakın dövüş skill'i (`CastTime == 0`) tablodaki `iNumCombo` kadar animasyon adımı (`iAct[0..2]`) oynatır; her adım `saldırıHızı × 1,2 sn`; adımlar sürerken (`m_iSkillStep > 0`) sürekli saldırı (R) bekler, bitince kendiliğinden devam eder; son adımdan sonra `iReCastTime / 10` sn skill bekleme başlar. Bizde şimdilik skill tek animasyon; "R beklemesi/devamı" yapıldı, çok adımlı combo ve `SkillMagicTable Type1` (iNumCombo, iAct) henüz okunmuyor.

## Sunucu bağlantısı: kalanlar (2026-11-17)
- [ ] Parti tam: üye listesi, ayrılma, lider, üye canı (0x2F alt komutları; şimdilik yalnız davet/kabul)
- [ ] NPC konuşmaları ve görevler (WIZ_NPC_EVENT 0x20, SELECT_MSG, Lua görevleri): NPC'lere tıklayınca sunucu diyalogu
- [ ] Diğer oyuncuların ekipmanı/görünümü (WIZ_USER_LOOK_CHANGE) ve kendi giysi değişimimizin başkalarına görünmesi
- [ ] Eşya kullanma (iksir, kâğıt…): WIZ_ITEM_USE; eşya yere atma (0x1F tür 5)
- [ ] Takas (0x30), pazar/mağaza açma, klan, dost listesi
- [ ] Parti/klan dışındaki küçük paketler: WIZ_ROTATE (0x09), emote (0x29 tür 4), hava/saat
- [ ] İstemcide tanımı olmayan canavar/NPC modelleri (`bilinmeyenTurler`): tüm K_MONSTER (2.169) için model + tür tablosu
- [ ] Eşyalarda 413 simge yok (genel simge yer tutucu), yükseltme/ek kod gösterimi

## Veritabanı düzenlemeleri (2026-11-17, yedekleri `*_YEDEK` tablolarında)
- Yeni karakter eşyasız başlar (`CREATE_NEW_CHAR_SET` boşaltıldı; eski hali `CREATE_NEW_CHAR_SET_YEDEK`).
- Moradon (bölge 21) canavar slotları: her slot 5 canavar, yarıçap en çok 5 (`K_NPCPOS1098`). Çakışan 9 slot 13–17 m kaydırıldı; geri kalan koordinatlar orijinal. Tek canavarlık 2 özel slot (Glyptodont, Chaotic generator) dokunulmadı.
- Worm / Earth Worm / Blood worm (750–752) ganimeti: %20 düşük seviye silah (grup 9001), %25 dört sınıfın başlangıç zırhı (grup 9002).
- Sunucu veritabanı değişikliklerini yalnız açılışta yükler: değişiklikten sonra GameServer yeniden başlatılmalı.
- [ ] Su: kullanıcının işaretlediği kıyı şeritlerinin su olup olmadığı netleşmeli (nehir şeridini genişletme denemesi sonuç vermedi).

**NPC diyalogları ve 10. seviye sonrası (2026-11-17, kullanıcı isteği)**
- [x] **NPC diyalog sistemi (temel):** NPC'ye sağ tıkla `WIZ_NPC_EVENT 0x20` → sunucu Lua (`Quests/<sid>_*.lua`) `SelectMsg` ile `WIZ_SELECT_MSG 0x55` yollar (başlık/düğme metin numaraları + olay numaraları); düğmeye basınca olay numarası geri gider. Metinler client'ta `NpcMenu_us`/quest metin tablolarından çözülmeli. Sunucu: `oyun-dosyalari/kaynak/.../NPCHandler.cpp` (`CUser::SelectMsg`, satır 570), `lua_bindings.cpp`.
- [~] **Grand Merchant (Kaishan, sid 18004, tür 46):** terfi çalışıyor (seviye ≥ 10, 3000 Noah, sınıf 205); kalan: stat/skill sıfırlama, ırk değişimi, geri satın alma (3000 Noah, `PromoteUserNovice`), stat/skill sıfırlama, ırk/millet değişimi, geri satın alma. Betik: `Quests/18004_Kaisan.lua`.
- [ ] **10. seviye üstü skill'ler:** terfi sonrası (Novice/Master) skill tabloları, iş sınıfına göre skill penceresi ve kullanım.
- [ ] Diğer Moradon NPC'leri (Priest Iris, Blacksmith Heppa, Operator Moira, Coliseum Artes, Hepa Pupil Shozin, Manager Vilbore, Peddler Hemes, Sanctuary): hepsi aynı diyalog sistemine bağlanacak.

**Novice/Master skill'leri (2026-11-17)**
- [x] Skill verisi: 1328 skill (temel + terfi sayfaları 1050–1129, 2050–2129; `npm run beceriler`), sunucu kuralları 1216 skill (`araclar/sunucu/oyuncu-disa-aktar.ps1`; tür 0–9).
- [x] Skill penceresi: sekmeler (Basic / 3 ağaç / Master), sayfalama (6 yuva), boş skill puanı ve ağaç puanları, `P` düğmesiyle puan verme (`WIZ_SKILLPT_CHANGE 0x32`, sunucu yalnız reddederken cevap verir), ağaç puanı yetmeyen skill soluk.
- [~] Novice/Master skill'lerinin **kullanımı**: Warrior ve Rogue ağaçları sunucuda denendi (Rogue: yakın dövüş, tüm okçuluk skill'leri, Blood drain/Vampiric touch, gizlenme ve buff'lar; Illusion, Safety, Cure curse, Strength of wolf "failed") (saldırı skill'leri animasyon + vuruş efekti, buff'lar, Binding, Provoke alan skill'i); kalan: Rogue/Mage/Priest ağaçları, Master sekmesi, Kurian, parti skill'leri (Descent, Sacrifice) ve bazı iyileştirmelerin (Rise, Frenzy, Regeneration) sunucuda "failed" vermesinin nedeni.
- [ ] Skill puanı sıfırlama (Kaishan, `btn_reset_skill`), Karus tarafı testi.

**PvP**
- [x] Öldürme sayacı (üst orta plaka + "TRIPLE KILL" gibi bildirim), sunucunun `WIZ_KILLASSIST 0xC8` paketini kullanır (`client/src/arayuz/oldurmeSayaci.ts`). Sunucu bu paketi yalnızca PK bölgelerinde (Ardream, Ronark Land, özel etkinlik) yollar; şu an oynanan Moradon'da çıkmaz. **Gerçek PvP ile denenmedi** (önizleme: `client/scripts/oldurmeGorunum.mjs`).
- [ ] Client'ta oyuncuya saldırı/skill hedeflemesi yok (yalnız canavar hedeflenir): PvP için diğer oyuncuyu hedef alıp saldırma gerekir.


**Henüz boş kalan pencere içerikleri (2026-11-17, kullanıcı isteği)**
- [ ] Görev ayrıntıları (av hedefi ve ödüller), parti üye listesi, dost listesi, klan, mektup, komut listesi ve çıkış menüsündeki "Run option after exiting".
**Skill ve parti (2026-11-17)**
- [x] Sunucuda tanımı olmayan 88 skill sunucuya tanıtıldı (`araclar/sunucu/skill-tanit.ts` + `sql-calistir.ps1`; Wink, Cutting, Shock, Wind, Rage, Blade of hate… Warrior'da sunucuda denendi). Dribble/Shoot (tür 8 etkinlik skill'leri) gizlendi; tür 8'li skill'ler (ışınlanma/diriltme) sunucuya eklenmedi.
- [x] Pasif skill'ler: sunucu bunları skill puanı eşiklerine göre `UserAbilityHandler.cpp` içinde uygular. Warrior Defense ağacı 55+ puanda savunmaya +13 verdiği doğrulandı. Diğer sınıfların pasifleri ve direnç bonusları ayrıca denenmedi.
- [x] PvP skill'i: seçili başka oyuncuya (düşman skill'i) atılabilir; sunucu Moradon'da karşıt ulus oyuncularının birbirine saldırmasına izin verir (`yamalar/moradon-pvp.patch`). Temel saldırı (R) ve oyuncu seçip otomatik vurma yok, yalnızca skill. Öldürme sayacı Moradon'da istemci tarafında sayılır.
- [~] Parti: üye listesi, kabul/davet, ayrılma/dağıtma/lider devri paketleri ve orijinal `re_el_party` penceresi (can/mana çubukları) yapıldı; iki hesapla denendi. Eksik: partiden çıkma paketine sunucu 2 kişilik partide cevap vermedi (dağıtma çalışıyor), parti skill'leri (Descent, Sacrifice…), parti sohbeti, üye can yazısı, parti HP'si HUD'da, parti aranıyor panosu.

## Moradon paketi, PvP robotu, Kecoon Boss
- [x] `moradon/` klasörü: `node araclar/oyun/moradon-paketi.ts` ile üretilir (canavar, drop, NPC, boss listeleri + görünüm paketi listesi).
- [x] PvP robotu: `kopru/pvp-robotu-baslat.ps1` / `pvp-robotu-durdur.ps1` (PvPRobot, Moradon 272,300, can 1501, savunma 600).
- [ ] Kecoon Boss (K_MONSTER 32601, Moradon 158,462, 60 sn doğuş) veritabanında; sunucu yeniden başlatılınca oyunda görünür (kullanıcı oyundayken yeniden başlatılmadı). Doğuş süresini ben seçtim, istenirse değişir.

## PvP temel saldırı, parti, sunucu güncellemesi (2026-11-18)
- [x] R ile seçili oyuncuya sürekli temel saldırı (yakın dövüş silahıyla; yayla sunucu R saldırısını reddeder — orijinal kural). Seçili oyuncunun canı hedef çerçevesinde (saniyede bir istenir).
- [x] Parti: üye oluşunca parti penceresi kendiliğinden açılır; pencerede üyeye tıklamak onu seçer (buff/iyileştirme ona gider).
- [ ] Kecoon Boss sunucuda yüklü değil: kullanıcı oyundan çıkınca `araclar\sunucu\sunucu-guncelle.ps1` (veritabanı + yeniden başlatma) çalıştırılacak.
- [ ] Yay ile R temel saldırısı (PvP/canavar) — orijinalde ok atma ayrı yol; bakılacak.

## NPC konuşma menüleri, boss ganimeti (2026-11-18)
- [x] Inn Hostess ve [Sundries] için orijinal görünümlü konuşma menüsü (`client/src/arayuz/duzDiyalog.ts`): koyu panel, altın çerçeve, beyaz konuşma, sarı seçenekler. Test: `client/scripts/npcDiyalogTesti.mjs`.
- [ ] Inn Hostess: "Create a Clan" ve "Power Up Store" henüz işlevsiz (mesaj verir). Sundries: "I want to exchange." gri (işlevsiz). Diğer tüccarlar (Armor/Weapon/Potion…) hâlâ mağazayı doğrudan açar; istenirse aynı menü verilir.
- [x] Dragon tooth Mentor ganimeti oyunda doğrulandı (`client/scripts/bossGanimetTesti.mjs`; test için geçici HP=1 ve %100 oran kullanıldı, sonra geri alındı).

## Işınlanma kapıları (2026-11-18)
- [x] Luferson (`karus2004`) ve El Morad (`elmo2004`) haritaları dönüştürüldü (harita, gökyüzü, NPC, canavar, modeller); `?harita=karus2004` / `?harita=elmo2004`.
- [x] Moradon'daki iki ışınlanma kapısı (Karus 4014, El Morad 4013) sağ tıkla kullanılır; kapı listesi orijinal görünümlü menüyle açılır; seçim → bölge değişimi → harita yeniden yüklenir (kayıtlı girişle otomatik). Protokol: `kopru/protokol/isinlanma.ts` (+ test).
- [x] Kök neden: sunucu Moradon için `1098moradon_0826.smd` kullanıyordu; kapılar client'ta olmayan x≈800-840'taydı (seçim "kapıya yakın değil" diye reddediliyordu). `ZONE_INFO1098` bölge 21 → `old_moradon.smd` yapıldı (`araclar/sunucu/moradon-smd.sql`, özgün değer yedekli). **Sunucu yeniden başlatılınca geçerli olur.**
- [x] Işınlanma uçtan uca doğrulandı (2026-11-18): El Morad kapısı (kotestkar → El Morad Castle 1594,411) ve Karus kapısı (PvPRobot → Luferson 441,1622); `client/scripts/isinlanmaTesti.mjs`.
- [ ] Haritası olmayan bölgeler (Delos, Ronark Land, Ardream) kapı listesinde gri.
- [ ] `Town` komutu Moradon koordinatına ışınlar (Luferson/El Morad'da yanlış yer).

## Büyük haritalarda performans (2026-11-18, El Morad / Luferson)
- [x] Kök neden: arazi tek geometriydi (513×513 → ≈526 bin üçgen) ve aynı dokulu nesneler tüm harita boyunca tek geometride birleşiyordu; ikisi de görüş alanı kırpmasına takılmadan hep çiziliyordu (El Morad ≈797 bin üçgen/kare; Moradon ≈200 bin).
- [x] Çözüm: arazi 32×32 karelik parçalara (`dunya/arazi.ts`), nesneler 256 m'lik hücrelere (`dunya/nesneler.ts`, `?hucre=0` eski davranış) bölündü: El Morad ≈126 bin, Luferson ≈140 bin üçgen. Görüntü piksel piksel aynı. Ölçüm: `client/scripts/fpsOlcum.mjs`.
- [ ] Test makinesinde (güçlü GPU) kare süresi değişmedi (≈8-9 ms, çizim çağrısı sınırlı: ≈385); asıl kazanç zayıf ekran kartlarında beklenir. Daha fazlası için dokuları atlasa birleştirmek (çizim çağrısını düşürür) gerekir.
- [ ] Zemin geçiş karolarının (yol kenarındaki turuncu lekeler) birebir karışım kuralı hâlâ bilinmiyor.

## GM esya dukkani, GM kapi yetkisi (2026-11-18)
- [x] `[Item Master] Aurora` (K_NPC 29990, satis grubu 999000): ITEM tablosundaki 3005 esya (126 sayfa), Moradon (268,308), Luferson (447,1630), El Morad (1601,417). Yalniz GM ucretsiz ve agirliksiz alir (`araclar/sunucu/yamalar/gm-esya-dukkani.patch`; sunucu normalde sayfa<12 sinirini uygular, bu grupta 255). SQL: `araclar/sunucu/gm-dukkani.sql`. Test: `client/scripts/gmDukkanTesti.mjs`.
- [x] GM kapi yetkisi: irk ayrimi yok (`gm-isinlanma-kapilari.patch`) ve rakip irkin sehrinde yeniden giriste Moradon'a atilmaz (`gm-giriste-rakip-bolge.patch`). El Morad GM test hesabi Karus kapisindan Luferson'a gidip orada kaldi (dogrulandi).
- [ ] Dukkanda 56 sunucuya ozel esyanin simge/bilgisi yok (Item_Org_us.tbl'de yok): gorunmuyor.
- [ ] Magaza listesinde esya sirasi yalnizca numaraya gore (silah/zirh/taki ayrimi yok); istenirse kategori sayfalari.

## Luferson tüccarları (2026-11-18)
- [x] Luferson ana şehrine Accessory Merchant Hera (13001, grup 203002) ve Scrolls Charon (22301, 254000) / Amon (23400, 281000) eklendi: (421,1644), (428,1651), (435,1644). `araclar/sunucu/luferson-tuccarlar.sql`; sunucuda doğrulandı (alım çalışıyor).
- [ ] Luferson'un diğer iki yerleşiminde (Linate ~ (361,673), Bellua ~ (1752,816)) ve El Morad'da bu üç tüccar yok.
- [ ] Test notu: sunucu bölgesi ile client haritası eşleşmeli; testte `?harita=karus2004` için karakterin bölgesi de 1 olmalı (aksi halde NPC/canavar gelmez).

## Güncelleme (2026-11-18, ikinci)
- [x] Blessed Item Upgrade Scroll (379152000) simgesi: Myko/client tablosunda 37907900 (mavi parşömen) idi; oyunun Blessed Upgrade Scroll ailesi simgesi 37902100 → veritabanı (`araclar/sunucu/blessed-ikon.sql`) ve tarayıcı client'ı (`araclar/oyun/simge-duzeltme.json`) düzeltildi.
- [x] Simgesi olmayan sunucuya özel eşyalar: 57 eşyadan madalyalar (ItemIconID2 kullanılmalıydı) bulundu; 17'sinin simgesi **hiçbir** kaynakta yok (KnightEmpire UI/Item arşivleri, 9 Myko yama zip'i, resmî 1298 client, Homeko client arşivi — ikisi aynı boyutta/aynı, Item arşivi birebir aynı): Certificate ×3, Bronze Box, Gold Box, UTC Chest, Team Hazir Paket, VIP Package, AryaOnlineWorld ×2, 6 adet [Box] (Dark Knight/Holy Knight/Rosetta/Secret/Krowaz/Dragon). Geçici simge: Red Treasure Chest. İstenirse bu 17 için yeni simge çizilebilir/seçilebilir.
- [x] Mağaza çıktısı artık tabloda olmayan sunucu eşyalarını da içerir (GM dükkânında 3178 eşya görünür).
- [x] El Morad merkezine Accessory/Scrolls tüccarları eklendi (1636-1648, 430); Linate/Bellua gibi uzak köylere eklenmeyecek (ces kararı).
- [ ] **Bosslar:** Kekurikekukaka doğma süresi 5 sn yapıldı (sunucu yeniden başlatınca geçerli). **Tüm boss sürelerini ayarla** (Dragon tooth Mentor 5 sn, Kekurikekukaka 5 sn; diğer bosslar sonra).
- [ ] **Moradon canavar donması** (kullanıcı bildirdi, 2026-11-18): test makinemde yeniden üretilemedi (54 canavardan 49'u 12 sn'de hareket etti; 3,5×/7× hızda koşup ikinci bir client'la karşılaştırınca canavar konumları aynı). Ayrıntı için kullanıcıdan nerede/ne zaman olduğu istenecek; olası sebepler: bölge değişimi paketleri, sunucu Moradon haritasının old_moradon.smd olması.

## Arazi dokusu ve diğerleri (2026-11-18, üçüncü)
- [x] Arazi dokusu: orijinal client kaynağından (N3Terrain.cpp m_fTileDirU/V, N3TerrainPatch.cpp Render) alındı: 8 yön için köşe UV tablosu (eskiden 5 yön yanlıştı) ve iki katman D3DTOP_ADD (doku1+doku2). Yamaç gölgesi azaltıldı (orijinalde arazi normali sabit). **Görsel doğrulama yetersiz:** yol kenarları net, ama yamaçlarda koyu şeritler duruyor; `git revert` ile eski hale dönülebilir. Eski sürüm: `E:/tmp/arazi.ts.bak`.
- [ ] .tlt / .glo (lightmap?) dosyaları ve karo "tam_karo" biti client'ta kullanılmıyor (orijinalde lightmap katmanı ve renk haritası×Terrain_Base.bmp var). Fast'in Görev B belgesine göre yapılacak.
- [x] Town komutu yalnız Moradon'da çalışır (başka bölgede sunucu bölgesiyle uyuşmuyordu: admin karakter "boyuta" takıldı). Admin karakter (kingces) Moradon town'a (305,342, bölge 21) alındı.
- [x] Mağazası olan her NPC'ye konuşma menüsü (trade/repair/exchange/walk away); Skeleton orijinal değerler; Luferson'a 5 orijinal canavar eklendi (sunucu yeniden başlatınca).

## Güncelleme (2026-11-18, dördüncü)
- [x] **Arazi dokusu bulanıklığı (kullanıcının UI.png'si):** kök neden benim hatamdı: yeni shader'da "geçerli karo" denetiminde ızgara boyutunu (128) karo sayısı (226/275/181) yerine kullanmıştım; 128'den büyük numaralı karolar renk haritasına düşüp bulanık görünüyordu. Düzeltildi (`karoAdedi`). Orijinal yön tablosu + iki katman ADD artık varsayılan; `?dokuv=0` eski çizimi gösterir (karşılaştırma). `tam_karo` biti `yon1` bit 7'ye yazılıyor (henüz kullanılmıyor).
- [x] NPC diyalogları ve ışınlanma menüsü: oyunun UI dokusundan süslü çerçeve, NPC adı başlıkta, ekranın ortasında; sunucu Lua konuşma penceresi de dikey ortalanır.
- [x] Eşya listesi sınıfa göre: `docs/esya-siniflar/` (herkes, savasci, rogue, buyucu, rahip, ozel).
- [x] El Morad (982,664) attila (Lv85), 5 sn doğma (`araclar/sunucu/elmorad-attila.sql`) — sunucu yeniden başlayınca.
- [x] Buff şeridi: solda süslü tutaç, sol tıkla sürüklenir, konum hatırlanır (`ke.buffKonum`).
- [ ] **Warrior skill vuruş animasyonları:** animasyon numaraları orijinal kaynakla (GameDef.h ANI_SKILL_*) tutarlı (iAct[0], NumCombo hepsinde 1); hangi skill'in neresinin yanlış göründüğü kullanıcıdan istenecek (vuruş anı, hedefin tepkisi, efekt?).
- [ ] Orijinalde yakın dövüş skill'inde `iSelfAnimID1` (başlangıç) ve `iSelfAnimID2` (bitiş) ayrı oynar; büyülerde uygulanıyor, melee için kombo yoksa tek animasyon.

## Güncelleme (2026-11-19)
- [x] Command → Town her haritanın kendi noktasına: Moradon (305,342), emc (1600,408), lufer (başlangıç 441,1625).
- [x] Arazi karo yönü: `araclar/harita/karo-yon-arastirma.ts` komşu karo dikişlerinden yön→dönüşüm eşlemesini ölçer (Moradon/lufer/emc'te aynı sonuç, eski tablodan %5–12 daha sürekli); orijinal N3Terrain tablosunun döndürme yönü D3D v-tersi yüzünden çevrilmişti. Shader güncellendi (yol kenarları artık doğal).
- [x] Eşya nadirliği: `docs/esya-nadirlik/` (low/middle/high/unique/aksesuar/özel); sınıf listesi `docs/esya-siniflar/`.
- [x] Eşya statları: resmî 1298 veritabanıyla karşılaştırma: ortak 56 280 satırdan yalnız **152**'si farklıydı (Dark Vane +7…+10 hasar, Tooth/Sword of Beast serisi gecikme 114→108) → orijinale döndürüldü (`araclar/sunucu/esya-stat-orijinal.sql`, yedek `ITEM_STAT_YEDEK`). Myko'ya özel 48 755 satır (resmî tabloda olmayan) olduğu gibi kaldı.
- [x] **Kekuri Ring**: oyundaki gerçek eşya 330310014 (Dex +8, ateş/buz/şimşek direnci 15; Kekurikekukaka'nın özgün ganimeti %20). Kekurikekukaka boss'una yanlış eşya (810864000, fiyatı 100 olan etkinlik eşyası) konmuştu; düzeltildi (oran %15 kaldı).
- [ ] Sword dancing / Howling Sword vuruş animasyonu: tablo iAct = 113 (skill_axe01_B), 135, 150 (NumCombo 1); "bir ayağı havaya kalkan vuruş" için hangi klibin doğru olduğu görsel karşılaştırma ister (adaylar: 135 twoH_sword_B, 143 attack_Kick0_A, 150 attack_jamadar_B).
- [ ] Item tooltip'te canavar ganimetindeki yükseltmeli eşyaların (+bonus) değerleri client tablosunda yok (tum.json'da bonus alanları tutulmuyor).

## Harita klasörü ve diğerleri (2026-11-19)
- [x] `harita/<harita adı>/` (77 bölge): canavarlar, drop, npc, mağaza, kapılar/olaylar, bölge bilgisi, istemci dosyaları; `harita/README.md` + `_tum-haritalar.csv`. Üretici: `node araclar/oyun/harita-klasoru.ts` (CSV'ler yenilenir, `NOTLAR.md` yenilenmez). Fast'in okuma erişimi var.
- [x] Dragon tooth Mentor: 62 kağıtları tek gruba (900062): %15 tutarsa 4 kağıttan **yalnız biri** düşer; Blessed Item Upgrade Scroll %50 (`araclar/sunucu/dragon-62-grubu.sql`).
- [x] Simgesiz 17 eşya oyundan kaldırıldı (ITEM'den; `ITEM_SILINEN_YEDEK` tablosunda ve `docs/esya-silinen.csv`'de saklı; drop/mağaza kayıtlarından da çıkarıldı; hiçbir oyuncuda yoktu). Geri almak için yedek tablodan ITEM'e kopyala. Sunucu yeniden başlayınca geçerli.

## Güncelleme (2026-11-19, ikinci)
- [x] NPC diyalogları (ışınlanma dahil) artık opak (şeffaf kısım kaldırıldı).
- [x] PvP hedefi: seçili oyuncunun ayağında yeşil halka; can çubuğunun yavaş akan "geriden gelen" animasyonu oyuncu hedefinde de çalışır (hedef nesnesi kare kare yeniden yaratılıyordu).
- [x] GM komutları: sohbete `/statsıfırla` ve `/skillsıfırla` (yalnız GM; ücretsiz, giyili eşya olsa da). Sunucu yaması `araclar/sunucu/yamalar/gm-stat-skill-sifirla.patch` (`+statsifirla`, `+skillsifirla`); client komuttan sonra karakteri yeniden yükler. **Sunucu yeniden başlatılınca geçerli.**
- [x] Klasik Knight Online yükleme ekranı (`ka_loading_us` / `el_loading_us`: sanat + ilerleme çubuğu): harita açılışında ve haritalar arası geçişte; ulus son girişten.
- [x] Giriş ekranı: Myko'nun Lilith arka planı kaldırıldı; resmî 1298 giriş görseli (KNIGHT ONLINE logolu) — `araclar/arayuz/giris-orijinal.ts` (npm run arayuz sonrası yeniden çalıştırılmalı). Orijinal 3D giriş sahnesi (`Intro/intro.n3chr` orc + ay animasyonu) henüz yok.
- [x] Eşya nadirliği: `docs/esya-nadirlik/` (low/middle/high/unique; iksir/kâğıt/kutu "nadirliksiz").

## Veri tarayıcı ve bulgular (tarama-2026-11-18)
- [x] **Veri tarayıcı:** `npm run tara` (araclar klasöründe, `araclar/tarama/`). Eşya/NPC/mob/doğuş/ganimet/mağaza tabloları, harita dosyaları, kapılar ve `haritalar.ts` ayarını kontrol eder; salt okunur. Rapor: `docs/raporlar/tarama-<tarih>.md/.json`. Ajan: `.claude/agents/hata-tarayici.md` (bulur, doğrular, raporlar; düzeltme için onay ister).
- [x] Kapı adları: `sunucu.json` üretilirken İngilizceye çevrilir (özgün Korece `adKorece`). Tek kaynak `client/src/oyun/kapiAdlari.ts` (client menüsü de bunu kullanır). Yalnız sunucu.json'u yenilemek: `node harita/cli.ts <harita> --sadece-sunucu`.
- [x] `moradon` haritası (yeni Moradon, 1024 m): sunucuda **bölge 18 (Kecoon Valley)** bu haritayı kullanır; `npc.json` (4 dost NPC) ve `canavar.json` (21 kayıt) bölge 18'den aktarıldı, `haritalar.ts` ayarı bölge 21'den 18'e düzeltildi. `?harita=moradon` artık müziksiz (bölge 18'in müziği yok) ve canavar kapalı (`canavar: false`).
- [x] **`moradon_xmas` gereksiz olarak işaretlendi:** sunucuda `moradon_xmas.smd` yok, hiçbir `ZONE_INFO1098` bölgesi ona bağlı değil, `haritalar.ts`'te tanımlı değil, NPC/mob verisi üretilemez. Oyunda kullanılamaz; klasör `donusturulmus/` içinde durur (git'e girmez), silinebilir. İstenirse yalnız görsel kış Moradon'u olarak bakılabilir.
- [ ] **Karar bekleyen (tarama bulguları):**
  - [ ] ITEM'da aynı `Num` ile **farklı** 12 kayıt: `Wood Staff(+11)` / `(+1)` (hasar 62 / 40, Num 180130061 vb. 4 çift), `Premium Potion MP (5000)` (389400000; fiyat 15.000 / 3.000.000, süre 1000 / 5000); geri kalanı yalnız ad farkı (Felankor yüzükleri, Mage/Messenger Pendant). Hangisi doğru? + 4 birebir aynı fazlalık satır, 3 tamamen boş satır.
  - [ ] Haritada duran 44 ganimet satırı olmayan `MAKE_ITEM_GROUP` kodlarına bağlı (ör. grup 8888): bu mobların o slotu hiçbir şey düşürmez. Grup içerikleri oyun dengesi kararı. Ayrıca haritada duran 19 mobun ganimet tablosu hiç yok (`DB-DROP-02`).
  - [ ] 284 eşya adında `?` (kayıp karakter, ör. `Hunter??s Bow`), 43 sunucu eşyasının client tablosunda karşılığı yok (ör. `Cospre Box`, `Mugwort Rice Cake`).
  - [ ] Düşük öncelik: 940 eşya adında NBSP/sekme, 184 adsız eşya, 25 adda Türkçe harf, 80 ölü doğuş kaydı (tanımsız bölgeler 26, 91…), kullanılmayan 20 mob adı bozuk.
