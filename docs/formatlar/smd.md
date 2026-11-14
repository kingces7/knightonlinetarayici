# `.smd` — server harita dosyası

Kaynak: server `shared/SMDFile.cpp` ve `N3BASE/N3ShapeMgr.cpp` (Myko_Source.rar). Dosyalar server paketinde
`Depo/Map/*.smd`. Okuyucu: `araclar/harita/smd.ts` (test: `smd.test.ts`). Hepsi little-endian.

| Bölüm | İçerik |
|---|---|
| Yükseklik | `int32 N`, `float birim`, `float yukseklik[N*N]` |
| Çarpışma | `float genislik, uzunluk`, `int32 yuzSayisi`, `float3 koseler[yuzSayisi*3]` (üçgenler) |
| Hücreler | 16 m'lik hücrelerde (z dış, x iç döngü) `uint32 var`; varsa `int32 sekilSayisi`, `uint16 sekil[]`, sonra 4×4 alt hücre (4 m) × `{int32 ucgenSayisi, uint32 koseIndeksi[ucgenSayisi*3]}` |
| Nesne olayları | `int32 adet`, 24 baytlık kayıtlar `{int32 sahip, int16 indeks, int16 tur, int16 npc, int16 durum, float x,y,z}` (kapılar, kollar…) |
| Karo olayları | `int16 olay[N*N]` — sunucuya göre `0` = yürünebilir, `>=2` = olay/kapı. Moradon'da hepsi 0 |
| Doğuş noktaları | `int32 adet`, 20 baytlık kayıtlar `{float x,y,z, alanZ, alanX}` (Moradon'da yok) |
| Işınlanma kapıları | `int32 adet`, 320 baytlık hizalamasız `_WARP_INFO`: `id@0 ad@2 duyuru@34 ücret@292 bölge@296 x,y,z,r@300 millet@316` |

## Bulgular
- Çarpışma üçgenlerinin ve olay konumlarının koordinatı **istemcinin `.gtd` arazisiyle aynı** dünya
  koordinatıdır (x, y yukarı, z). Sahnede `(x, y, -z)` olarak çizilir. Testle doğrulandı: köşelerin
  %70'i araziye 6 m içinde (x,z sırası); x/z yer değiştirseydi %30 olurdu.
- `.smd` içindeki yükseklik ızgarası `.gtd` ile **x/z yer değiştirmiş** saklanıyor (`smd[z*N+x] == gtd[x*N+z]`,
  %78 eşleşiyor, kalanı iki dosya arasındaki sürüm farkı). Oyunda arazi için `.gtd` kullanılır.
- İstemci harita adı ile sunucu dosyası eşleşmesi: `moradon` → `moradon_0826.smd` (kapı adları Moradon'a ait).
  Eşleşme `araclar/harita/cli.ts` içindeki `SUNUCU_HARITASI` tablosunda.
- Zemin/duvar ayrımı istemcide yapılır (`client/src/dunya/carpisma.ts`): normal.y > 0,55 → yürünebilir zemin
  (köprü, kat, merdiven), |normal.y| ≤ 0,55 → duvar.

## Dışa aktarım
`npm run harita -- moradon` artık `donusturulmus/web/harita/moradon/` altına şunları da yazar:
- `carpisma.bin` — ham float32, üçgen başına 9 sayı (Moradon: 31.077 üçgen, 1,1 MB)
- `sunucu.json` — ışınlanma kapıları, nesne olayları, doğuş noktaları

## Henüz kullanılmayan
`uint16 sekil[]` (hücredeki nesne numaraları), `karoOlay` (olay karoları), kapılar ve nesne olayları (kapı/kol işlevleri).
