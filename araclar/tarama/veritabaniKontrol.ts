// Sunucu veritabanı (LILITH_MYKO) kontrolleri: eşya, NPC/mob, doğuş noktaları, ganimet ve mağaza bağlantıları.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { sayVeOrnekle, sqlSayi, sqlSorgu } from './sql.ts';
import type { BolgeBilgisi } from './bolgeler.ts';
import { Toplayici, type KontrolTanimi } from './tur.ts';

/** ASCII dışı karakter içeriyor ("?" hariç). NBSP ve sekme ayrıca "kirli boşluk" kontrolünde ele alınır. */
const asciiDisi = (kolon: string) =>
  `PATINDEX('%[^ -~]%' COLLATE Latin1_General_BIN, REPLACE(REPLACE(${kolon}, CHAR(160), ' '), CHAR(9), ' ')) > 0`;
/** Adın içinde "?" var: kodlama bozulurken kaybolmuş karakter (ör. "Hunter??s Bow"). */
const soruIsareti = (kolon: string) => `${kolon} LIKE '%?%'`;
const bozuk = (kolon: string) => `(${asciiDisi(kolon)} OR ${soruIsareti(kolon)})`;

const ad = (kolon: string) => `ISNULL(${kolon}, '')`;

/** Haritada en az bir doğuş kaydı olan NPC/mob. */
const yerlesik = (sidKolonu: string) => `EXISTS (SELECT 1 FROM K_NPCPOS1098 p WHERE p.NpcID = ${sidKolonu})`;
/** Bir satış grubunu, haritada duran bir NPC kullanıyor. */
const grupKullaniliyor = (grupKolonu: string) => `EXISTS (SELECT 1 FROM K_NPC n WHERE n.iSellingGroup = ${grupKolonu} AND ${yerlesik('n.sSid')})`;

const GANIMET_KOLONLARI = Array.from({ length: 12 }, (_, i) => `(m.iItem${String(i + 1).padStart(2, '0')})`).join(',');
const SATIS_KOLONLARI = Array.from({ length: 24 }, (_, i) => `(s.Item${i + 1})`).join(',');

export function veritabaniKontrolleri(t: Toplayici, bolgeler: Map<number, BolgeBilgisi>): void {
  const kontrol = (k: KontrolTanimi, from: string, ornekSutun: string, toplam: number) => {
    const { sayi, ornekler } = sayVeOrnekle(from, ornekSutun);
    t.kaydet(k, sayi, toplam, ornekler);
  };

  // ---- ITEM ----
  const itemToplam = sqlSayi('SELECT COUNT(*) FROM ITEM');
  kontrol({
    kod: 'DB-ITEM-01', kategori: 'Eşya', onem: 'ORTA', baslik: 'ITEM tablosunda tamamen boş (NULL) satır',
    aciklama: 'Num dahil tüm alanları NULL olan satırlar var. Sunucu eşya listesini yüklerken bunları atlar ya da hatalı kayıt oluşturabilir.',
    oneri: 'Satırları sil (önce ITEM tablosunun yedeğini al). Silme işlemi veritabanını değiştirir, onay gerekir.',
  }, 'FROM ITEM WHERE Num IS NULL', `'NULL satir'`, itemToplam);

  const cakisan = '(SELECT Num, COUNT(*) c FROM (SELECT DISTINCT * FROM ITEM WHERE Num IS NOT NULL) d GROUP BY Num HAVING COUNT(*) > 1)';
  kontrol({
    kod: 'DB-ITEM-02', kategori: 'Eşya', onem: 'YUKSEK', baslik: 'Aynı Num ile birbirinden FARKLI birden çok eşya kaydı',
    aciklama: 'Sunucu eşyaları Num ile anahtarlar. Aynı Num\'lu kayıtlar farklı alanlar taşıyor; sunucu hangisini kullanacağını garanti etmez, oyuncular tutarsız eşya görür.',
    oneri: 'Yinelenen kayıtların alanlarını karşılaştır, doğru olanı bırakıp diğerini sil. Hangisinin doğru olduğu kullanıcıya sorulmalı.',
  }, `FROM ${cakisan} x`, `CAST(Num AS varchar(20)) + ' x' + CAST(c AS varchar(10))`, itemToplam);
  kontrol({
    kod: 'DB-ITEM-11', kategori: 'Eşya', onem: 'DUSUK', baslik: 'Aynı Num ile birebir aynı eşya kaydı (fazlalık)',
    aciklama: 'Kayıtlar tamamen aynı, çakışma yok; yalnızca fazladan satır.',
    oneri: 'Fazla satırları sil (yedekli).',
  }, `FROM (SELECT Num FROM ITEM WHERE Num IS NOT NULL GROUP BY Num HAVING COUNT(*) > 1) a WHERE NOT EXISTS (SELECT 1 FROM ${cakisan} c WHERE c.Num = a.Num)`, 'CAST(a.Num AS varchar(20))', itemToplam);

  kontrol({
    kod: 'DB-ITEM-03', kategori: 'Eşya', onem: 'DUSUK', baslik: 'Adı boş eşya (fiyatı ve simgesi olan)',
    aciklama: 'strName boş. Oyuncuya görünen ad client tablosundan (Item_Org_us) gelir, ama sunucu mesajları ve kayıtlar veritabanı adını kullanır.',
    oneri: 'Client tablosundaki adı veritabanına kopyala (bir betikle). Önce kaç tanesinin client\'ta karşılığı olduğuna bak (DB-ITEM-06).',
  }, `FROM ITEM WHERE Num IS NOT NULL AND LTRIM(RTRIM(${ad('strName')})) = '' AND BuyPrice > 0`, `CAST(Num AS varchar(20)) + ' (fiyat ' + CAST(BuyPrice AS varchar(20)) + ')'`, itemToplam);

  kontrol({
    kod: 'DB-ITEM-04', kategori: 'Eşya', onem: 'ORTA', baslik: 'Eşya adında kaybolmuş karakter ("?")',
    aciklama: 'strName içinde "?" var; kodlama bozulurken kesme işareti gibi karakterler kaybolmuş (ör. "Hunter??s Bow").',
    oneri: 'Doğru adı client tablosundan (Item_Org_us) al ve veritabanını güncelle. Adlar bir betikle listelenip tek tek doğrulanmalı.',
  }, `FROM ITEM WHERE Num IS NOT NULL AND ${soruIsareti('strName')}`, `CAST(Num AS varchar(20)) + ': ' + strName`, itemToplam);
  kontrol({
    kod: 'DB-ITEM-12', kategori: 'Eşya', onem: 'DUSUK', baslik: 'Eşya adında ASCII dışı karakter (örn. Türkçe harf)',
    aciklama: 'Oyun içeriği İngilizce olmalı; adda Türkçe/özel harf kalmış (ör. "[7 GÜNLÜK]"). Kayıp karakter değil, yalnızca dil karışıklığı.',
    oneri: 'İstenirse İngilizce karşılığıyla değiştir (ör. "7 DAYS").',
  }, `FROM ITEM WHERE Num IS NOT NULL AND ${asciiDisi('strName')} AND NOT ${soruIsareti('strName')}`, `CAST(Num AS varchar(20)) + ': ' + strName`, itemToplam);

  kontrol({
    kod: 'DB-ITEM-05', kategori: 'Eşya', onem: 'DUSUK', baslik: 'Eşya adında kirli boşluk (sekme, sondaki/baştaki boşluk, NBSP)',
    aciklama: 'Adın başında/sonunda boşluk, sekme ya da bölünmez boşluk (NBSP) var. Mesajlarda ve eşleştirmede sorun çıkarabilir.',
    oneri: 'strName\'i LTRIM/RTRIM yapıp sekme ve NBSP karakterlerini temizle (UPDATE, yedekli).',
  }, `FROM ITEM WHERE Num IS NOT NULL AND (strName <> LTRIM(RTRIM(strName)) OR strName LIKE '%' + CHAR(9) + '%' OR strName LIKE '%' + CHAR(160) + '%')`, `CAST(Num AS varchar(20)) + ': ' + REPLACE(REPLACE(strName, CHAR(160), '[NBSP]'), CHAR(9), '[TAB]')`, itemToplam);

  for (const [kod, baslik, kosul, aciklama] of [
    ['DB-ITEM-07', 'Eşyada minDamage > maxDamage', 'minDamage > maxDamage', 'Alt hasar üst hasardan büyük.'],
    ['DB-ITEM-08', 'Eşyada ReqLevel > ReqLevelMax', 'ReqLevelMax > 0 AND ReqLevel > ReqLevelMax', 'Gereken en düşük seviye en yüksek seviyeden büyük; kimse kullanamaz.'],
    ['DB-ITEM-09', 'Eşyada negatif fiyat', 'BuyPrice < 0 OR SellPrice < 0', 'Fiyat negatif.'],
    ['DB-ITEM-10', 'Satış fiyatı alış fiyatından yüksek (para çoğaltma açığı)', 'BuyPrice > 0 AND SellPrice > BuyPrice', 'Eşyayı alıp satan oyuncu para kazanır.'],
  ] as const) {
    kontrol({ kod, kategori: 'Eşya', onem: 'YUKSEK', baslik, aciklama, oneri: 'Kayıtların alanlarını düzelt.' },
      `FROM ITEM WHERE Num IS NOT NULL AND (${kosul})`, `CAST(Num AS varchar(20)) + ': ' + ${ad('strName')}`, itemToplam);
  }

  clientEsyaKontrolu(t);

  // ---- NPC / MOB ----
  const npcToplam = sqlSayi('SELECT COUNT(*) FROM K_NPC'), mobToplam = sqlSayi('SELECT COUNT(*) FROM K_MONSTER');
  for (const [tablo, toplam, etiket] of [['K_NPC', npcToplam, 'NPC'], ['K_MONSTER', mobToplam, 'Mob']] as const) {
    const kullanilan = `EXISTS (SELECT 1 FROM K_NPCPOS1098 p WHERE p.NpcID = n.sSid)`;
    kontrol({
      kod: `DB-${etiket.toUpperCase()}-01`, kategori: 'NPC/Mob', onem: 'ORTA', baslik: `${etiket} adında bozuk karakter (haritada kullanılan)`,
      aciklama: `${tablo}.strName ASCII dışı karakter ya da "?" içeriyor ve bu kayıt K_NPCPOS1098'de bir yere yerleştirilmiş. Oyuncu adı bozuk görür.`,
      oneri: 'Adı doğru İngilizce karşılığıyla güncelle (UPDATE, yedekli). Doğru ad kaynaklarda (client tabloları) aranmalı.',
    }, `FROM ${tablo} n WHERE ${bozuk('n.strName')} AND ${kullanilan}`, `CAST(n.sSid AS varchar(10)) + ': ' + n.strName`, toplam);
    kontrol({
      kod: `DB-${etiket.toUpperCase()}-02`, kategori: 'NPC/Mob', onem: 'DUSUK', baslik: `${etiket} adında bozuk karakter (hiçbir yere yerleştirilmemiş)`,
      aciklama: `Aynı bozulma, ama bu kayıt hiçbir haritada kullanılmıyor; oyunda görünmez.`,
      oneri: 'Acil değil. Kayıt ileride kullanılırsa adı düzelt.',
    }, `FROM ${tablo} n WHERE ${bozuk('n.strName')} AND NOT ${kullanilan}`, `CAST(n.sSid AS varchar(10)) + ': ' + n.strName`, toplam);
  }
  kontrol({
    kod: 'DB-MOB-03', kategori: 'NPC/Mob', onem: 'YUKSEK', baslik: 'Mob kaydında geçersiz değer (HP ≤ 0, seviye ≤ 0 ya da model 0)',
    aciklama: 'Böyle bir mob doğunca ya anında ölür ya da görünmez/tanımsız olur.',
    oneri: 'Kayıtların alanlarını düzelt.',
  }, 'FROM K_MONSTER WHERE iHpPoint <= 0 OR sLevel <= 0 OR sPid = 0', `CAST(sSid AS varchar(10)) + ': ' + ${ad('strName')}`, mobToplam);

  // ---- Doğuş kayıtları (K_NPCPOS1098) ----
  const posToplam = sqlSayi('SELECT COUNT(*) FROM K_NPCPOS1098');
  kontrol({
    kod: 'DB-POS-01', kategori: 'Doğuş', onem: 'YUKSEK', baslik: 'Doğuş kaydı tanımsız NPC/mob kimliğine bağlı',
    aciklama: 'K_NPCPOS1098.NpcID, ne K_NPC ne K_MONSTER içinde var. Sunucu bu kaydı yerleştiremez.',
    oneri: 'Kayıt yanlış kimlikse düzelt, gereksizse sil (yedekli).',
  }, 'FROM K_NPCPOS1098 p WHERE NOT EXISTS (SELECT 1 FROM K_NPC n WHERE n.sSid = p.NpcID) AND NOT EXISTS (SELECT 1 FROM K_MONSTER m WHERE m.sSid = p.NpcID)',
  `'bolge ' + CAST(p.ZoneID AS varchar(5)) + ', NpcID ' + CAST(p.NpcID AS varchar(10)) + ' (' + ${ad('p.strName')} + ')'`, posToplam);
  kontrol({
    kod: 'DB-POS-02', kategori: 'Doğuş', onem: 'DUSUK', baslik: 'Doğuş kaydı ZONE_INFO1098\'de olmayan bölgeye ait',
    aciklama: 'Böyle bir bölge sunucuda tanımlı değil; kayıt hiç kullanılmaz (oyunu etkilemez, yalnızca ölü veri).',
    oneri: 'Acil değil. İstenirse kayıtları sil (yedekli) ya da bölgeyi ZONE_INFO1098\'e ekle.',
  }, 'FROM K_NPCPOS1098 p WHERE NOT EXISTS (SELECT 1 FROM ZONE_INFO1098 z WHERE z.ZoneNo = p.ZoneID)', `'bolge ' + CAST(p.ZoneID AS varchar(5)) + ', NpcID ' + CAST(p.NpcID AS varchar(10))`, posToplam);
  kontrol({
    kod: 'DB-POS-03', kategori: 'Doğuş', onem: 'DUSUK', baslik: 'Doğuş kaydında adet ≤ 0',
    aciklama: 'NumNPC 0 ya da negatif; kayıt hiçbir şey doğurmaz. Bilinçli kapatılmış olabilir.',
    oneri: 'Kayıt gerekliyse adedi düzelt, değilse sil.',
  }, 'FROM K_NPCPOS1098 WHERE NumNPC <= 0', `'bolge ' + CAST(ZoneID AS varchar(5)) + ', NpcID ' + CAST(NpcID AS varchar(10))`, posToplam);

  dogusSinirKontrolu(t, bolgeler);

  // ---- Ganimet ve mağaza bağlantıları ----
  // Sunucu kaynağı (Npc.cpp ~6240): ganimet kodu 100.000.000'dan küçükse eşya değil, "<100 ItemProdution" ya da MAKE_ITEM_GROUP grup kodudur.
  const dropToplam = sqlSayi('SELECT COUNT(*) FROM K_MONSTER_ITEM');
  const ganimetIndeksiKullaniliyor = `EXISTS (SELECT 1 FROM K_MONSTER mo WHERE mo.sItem = m.sIndex AND ${yerlesik('mo.sSid')})`;
  kontrol({
    kod: 'DB-DROP-01', kategori: 'Ganimet', onem: 'ORTA', baslik: 'Ganimet tablosu ITEM\'da olmayan eşya düşürüyor',
    aciklama: 'K_MONSTER_ITEM içinde (kod ≥ 100.000.000, yani doğrudan eşya numarası), ITEM tablosunda bulunmayan bir eşya var. Düşme şansı gelince sunucu eşyayı oluşturamaz.',
    oneri: 'Eşya numarasını düzelt ya da ganimet satırını sil (yedekli).',
  }, `FROM K_MONSTER_ITEM m CROSS APPLY (VALUES ${GANIMET_KOLONLARI}) v(it) WHERE v.it >= 100000000 AND NOT EXISTS (SELECT 1 FROM ITEM i WHERE i.Num = v.it)`, `'sIndex ' + CAST(m.sIndex AS varchar(10)) + ': esya ' + CAST(v.it AS varchar(12))`, dropToplam);
  for (const [kod, onem, kullanilan, baslik] of [
    ['DB-DROP-03', 'ORTA', true, 'Ganimet tablosu olmayan grup koduna bağlı (haritada duran mobların)'],
    ['DB-DROP-04', 'DUSUK', false, 'Ganimet tablosu olmayan grup koduna bağlı (hiçbir yerleşik mobun kullanmadığı)'],
  ] as const) {
    kontrol({
      kod, kategori: 'Ganimet', onem, baslik,
      aciklama: 'K_MONSTER_ITEM içindeki 100–99.999.999 arası kod MAKE_ITEM_GROUP.iItemGroupNum olmalı. Grup yoksa sunucu bu slotu sessizce atlar (Npc.cpp: pGroup == nullptr → continue); mob o eşyayı hiç düşürmez.',
      oneri: 'Eksik grubu MAKE_ITEM_GROUP\'a ekle ya da ganimet slotunu doğru gruba çevir/boşalt. Grupların içeriği oyun dengesi kararıdır, kullanıcıya sorulmalı.',
    }, `FROM K_MONSTER_ITEM m CROSS APPLY (VALUES ${GANIMET_KOLONLARI}) v(it) WHERE v.it >= 100 AND v.it < 100000000 AND NOT EXISTS (SELECT 1 FROM MAKE_ITEM_GROUP g WHERE g.iItemGroupNum = v.it) AND ${kullanilan ? '' : 'NOT '}${ganimetIndeksiKullaniliyor}`,
    `'sIndex ' + CAST(m.sIndex AS varchar(10)) + ': grup ' + CAST(v.it AS varchar(12))`, dropToplam);
  }
  for (const [kod, onem, kullanilan, baslik] of [
    ['DB-DROP-02', 'ORTA', true, 'Haritada duran mob, olmayan bir ganimet tablosuna bağlı'],
    ['DB-DROP-05', 'DUSUK', false, 'Haritada durmayan mob, olmayan bir ganimet tablosuna bağlı'],
  ] as const) {
    kontrol({
      kod, kategori: 'Ganimet', onem, baslik,
      aciklama: 'K_MONSTER.sItem > 0 ama K_MONSTER_ITEM içinde o sIndex yok; mob hiçbir şey düşürmez (görev mobu ise bilinçli olabilir).',
      oneri: 'sItem değerini doğru ganimet satırına çevir ya da 0 yap.',
    }, `FROM K_MONSTER m WHERE m.sItem > 0 AND NOT EXISTS (SELECT 1 FROM K_MONSTER_ITEM d WHERE d.sIndex = m.sItem) AND ${kullanilan ? '' : 'NOT '}${yerlesik('m.sSid')}`,
    `CAST(m.sSid AS varchar(10)) + ': ' + ${ad('m.strName')} + ' (sItem ' + CAST(m.sItem AS varchar(10)) + ')'`, mobToplam);
  }
  for (const [kod, onem, kullanilan, baslik] of [
    ['DB-SHOP-01', 'ORTA', true, 'Haritada duran NPC, olmayan bir satış grubuna bağlı'],
    ['DB-SHOP-03', 'DUSUK', false, 'Haritada durmayan NPC, olmayan bir satış grubuna bağlı'],
  ] as const) {
    kontrol({
      kod, kategori: 'Mağaza', onem, baslik,
      aciklama: 'K_NPC.iSellingGroup > 0 ama ITEM_SELLTABLE içinde o grup yok; esnaf boş mağaza gösterir.',
      oneri: 'Satış grubunu oluştur ya da NPC\'nin grubunu düzelt.',
    }, `FROM K_NPC n WHERE n.iSellingGroup > 0 AND NOT EXISTS (SELECT 1 FROM ITEM_SELLTABLE s WHERE s.iSellingGroup = n.iSellingGroup) AND ${kullanilan ? '' : 'NOT '}${yerlesik('n.sSid')}`,
    `CAST(n.sSid AS varchar(10)) + ': ' + ${ad('n.strName')} + ' (grup ' + CAST(n.iSellingGroup AS varchar(10)) + ')'`, npcToplam);
  }
  const satisToplam = sqlSayi('SELECT COUNT(*) FROM ITEM_SELLTABLE');
  for (const [kod, onem, kullanilan, baslik] of [
    ['DB-SHOP-02', 'ORTA', true, 'Satış tablosu ITEM\'da olmayan eşya satıyor (haritada duran esnafın grubu)'],
    ['DB-SHOP-04', 'DUSUK', false, 'Satış tablosu ITEM\'da olmayan eşya satıyor (hiçbir yerleşik esnafın kullanmadığı grup)'],
  ] as const) {
    kontrol({
      kod, kategori: 'Mağaza', onem, baslik,
      aciklama: 'ITEM_SELLTABLE içinde ITEM tablosunda bulunmayan eşya numarası var; esnaf listesinde boş/hatalı slot çıkar.',
      oneri: 'Eşya numarasını düzelt ya da slotu boşalt.',
    }, `FROM ITEM_SELLTABLE s CROSS APPLY (VALUES ${SATIS_KOLONLARI}) v(it) WHERE v.it > 0 AND NOT EXISTS (SELECT 1 FROM ITEM i WHERE i.Num = v.it) AND ${kullanilan ? '' : 'NOT '}${grupKullaniliyor('s.iSellingGroup')}`,
    `'grup ' + CAST(s.iSellingGroup AS varchar(10)) + ': esya ' + CAST(v.it AS varchar(12))`, satisToplam);
  }

  // ---- Bölgeler ----
  const eksikSmd = [...bolgeler.values()].filter((b) => b.durum !== 0 && !b.smdVar);
  t.kaydet({
    kod: 'DB-ZONE-01', kategori: 'Sunucu', onem: 'YUKSEK', baslik: 'Açık bölgenin harita dosyası (.smd) bulunamadı',
    aciklama: 'ZONE_INFO1098\'de Status ≠ 0 olan bölgenin strZoneSmdName dosyası sunucu harita klasöründe yok; bölgeye girilemez.',
    oneri: 'Dosya adını düzelt ya da bölgeyi kapat (Status = 0).',
  }, eksikSmd.length, bolgeler.size, eksikSmd.map((b) => `bölge ${b.no} ${b.ad}: ${b.smd}`));
}

/** Client'ın Item_Org_us tablosunda karşılığı olmayan sunucu eşyaları. Karşılık: Num ya da Num - Num%1000. */
function clientEsyaKontrolu(t: Toplayici): void {
  const yol = path.join(CIKTI_DIZINI, 'tablolar', 'Data', 'Item_Org_us.csv');
  const k = { kod: 'DB-ITEM-06', kategori: 'Eşya', onem: 'ORTA' as const, baslik: 'Sunucu eşyasının client tablosunda (Item_Org_us) karşılığı yok',
    aciklama: 'Client bu eşyanın adını/simgesini/modelini bilmez; oyuncuda bozuk ya da boş görünür.',
    oneri: 'Eşyayı client tablosuna ekle (CSV) ya da sunucudan kaldır. Hangisinin doğru olduğu eşya bazında karar ister.' };
  if (!fs.existsSync(yol)) { t.atla(k.kod, k.baslik, `${yol} yok (npm run tbl-coz ile üretilir)`); return; }
  const clientNum = new Set(fs.readFileSync(yol, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((s) => Number(s.slice(0, s.indexOf(',')))));
  const satirlar = sqlSorgu('SELECT Num, ISNULL(strName, \'\') FROM ITEM WHERE Num IS NOT NULL');
  const eksik = satirlar.filter(([n]) => { const num = Number(n); return !clientNum.has(num) && !clientNum.has(num - (num % 1000)); });
  t.kaydet(k, eksik.length, satirlar.length, eksik.map(([n, a]) => `${n}: ${a}`));
}

/** Doğuş noktalarının bölgenin gerçek harita sınırı içinde olması. */
function dogusSinirKontrolu(t: Toplayici, bolgeler: Map<number, BolgeBilgisi>): void {
  const satirlar = sqlSorgu('SELECT ZoneID, NpcID, ISNULL(strName,\'\'), LeftX, TopZ, iRange FROM K_NPCPOS1098');
  const disarida: string[] = [];
  const sifir: string[] = [];
  let kontrolEdilen = 0, atlanan = 0;
  for (const [zone, npc, ad, x, z, alan] of satirlar) {
    const b = bolgeler.get(Number(zone));
    if (!b) continue; // tanımsız bölge: DB-POS-02'de raporlandı
    if (b.kenar === null) { atlanan++; continue; }
    kontrolEdilen++;
    const X = Number(x), Z = Number(z), R = Number(alan);
    const etiket = `bölge ${zone} ${ad} (NpcID ${npc}) x=${X} z=${Z} alan=${R}, harita ${b.kenar} m`;
    if (X < 0 || Z < 0 || X > b.kenar || Z > b.kenar) disarida.push(etiket);
    else if (X === 0 && Z === 0) sifir.push(etiket);
  }
  t.kaydet({
    kod: 'DB-POS-04', kategori: 'Doğuş', onem: 'YUKSEK', baslik: 'Doğuş noktası haritanın sınırı dışında',
    aciklama: 'K_NPCPOS1098 koordinatı, bölgenin .smd haritasının (N-1)×birim sınırının dışında; mob/NPC haritada doğamaz.',
    oneri: 'Koordinatı düzelt. Genellikle başka bir bölgeden kopyalanmış kayıttır.',
  }, disarida.length, kontrolEdilen, disarida);
  t.kaydet({
    kod: 'DB-POS-05', kategori: 'Doğuş', onem: 'ORTA', baslik: 'Doğuş noktası (0, 0) — ayarlanmamış',
    aciklama: 'Koordinat 0,0: büyük olasılıkla doldurulmamış kayıt; mob haritanın köşesinde doğar.',
    oneri: 'Doğru koordinatı gir ya da kaydı sil.',
  }, sifir.length, kontrolEdilen, sifir);
  if (atlanan > 0) t.atla('DB-POS-04', 'Doğuş sınır kontrolü (kısmen)', `${atlanan} kayıt için bölgenin .smd dosyası yok/okunamadı, bunların sınırı denetlenemedi`);
}
