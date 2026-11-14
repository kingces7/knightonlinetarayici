# İstemci kodu (`KnightOnline.exe`) — erişemediğimiz kısım ve çıkarım bulguları

**Durum:** `KnightOnline.exe` hazır derlenmiş ve koruma yazılımıyla paketli (rastgele bölüm adları: `sktnlbpv`, `dnloxhju`, `.SCY`, `.newimp`…). Kaynak kodu yok.
Elimizde: tam **sunucu** kaynağı, tablolar, ve N3BASE'in yalnızca arayüz/doku/animasyon-anahtarı sınıfları (`N3Joint`, `N3Chr`, `N3AnimControl` yok).
Yöntem sırası: 1) veriden çıkarım, 2) `.exe` düz metin/sabit taraması, 3) paketi açıp tersine mühendislik (ancak gerekirse, kullanıcıya sorularak).

## Yöntem 2 — yapıldı (2026-11-14)
Araç: `araclar/exe/dizeler.ts` (52 153 dize). Çıkanlar:

**1. Motor:** 557 iç sınıf (RTTI): `CN3Chr`, `CN3Joint`, `CN3AnimControl`, `CN3Skin`, `CN3FXBundle(Game)`, `CN3SkyMng`, `CN3Terrain*`, `CN3River`, `CN3Pond`, `CKnightChrMgr`, `CMagicSkillMng`, `CPetMagicMng`, UI için `CUIHotKeyDlg`, `CUICommanderSkill`, `CUISkillTreeDlg`… Bilinen Knight Online motoru; yani format bilgisi doğru yönde.

**2. İstemcinin okuduğu tablolar (45):** `Player_experience`, `NewChrValue`, `NPC_Looks`, `UPC_DefaultLooks`, `ChrTypePartItem`, `Cloak(_PVP)`, `Move_Sound`, `sound`, `fx`, `guidefx`, `Skill_Magic_1…9`, `Zones`, `WarpInfo`, `itemsell_table`, `item_exchange`, `item_op`, `quest_helper`, `Quest_*`, `Achieve_*`, `movie_scene`, `Pet_exchange`, `NpcMon_Restriction`, `connect_image`, `Del`, … (+ `_us` / `_tk` eki kodda eklenir). Hepsi bizde mevcut ve okunuyor; yalnızca `Strike.tbl` (ve `CodePage_us`) dosyası yok (muhtemelen eski/kullanılmayan).

**3. Tablo olarak çıkan gerçek kurallar** (şu an elle uydurduğumuz değerlerin orijinali):
- `Player_experience.tbl`: seviye başına gereken deneyim (1→50, 2→100, 3→190, 4→342, 5→581, 6→929 … 84→12 362 501 484). Bizim `gerekenDeneyim` formülümüz yanlış.
- `NewChrValue.tbl`: sınıf başına başlangıç değerleri (ör. Human Warrior 65/65/60/50/50 + başlangıç eşyaları). Bizim STR 60 / STA 60 / DEX 30 / INT 30 yanlış.
- `Move_Sound.tbl`: zemin türüne göre adım sesi numaraları; `fx.tbl`/`sound.tbl`: efekt ve ses tabloları; `Skill_Magic_*`: skill verileri.

**4. Başvurulan diğer dosyalar:** `Data\DefaultCamera.N3Camera` (kamera ayarı, elimizde 453 bayt, henüz okunmadı), `Zones\Camera\Zone_%d.n3camera`, `monsize.txt`, `itemdrop.txt`, `TimeDelay.txt`, `SkillReport.txt` (bu dördü oyunda yok; isteğe bağlı olabilir), `Item\Cloak_%.3d.n3cplug`, at modelleri (`horse_*_w.n3cplug`).

**5. Bulunamayanlar (kodda sayı olarak gömülü, düz metin değil):** kısayol tuşu tablosu (yalnızca arayüz adları `Wnd_Hotkey`, `btn_hotkey` var), silah türüne göre animasyon seçimi (animasyon adları `.n3anim` dosyasından geliyor, eşleme kodda), hız/geçiş sabitleri, kamera kuralları. Bunlar için yöntem 1 (veri örüntüleri, ör. animasyon adı sıralarından) denenir; olmazsa yöntem 3 kullanıcıya sorulur.
