SET NOCOUNT ON;
-- Kullanici karari (2026-11-19): ganimet tablosu olmayan 19 mobun (hepsi K_MONSTER.sItem = sSid) her birine seviyesine uygun ganimet tablosu yazilir.
-- Kurallar: 1) Ayni adli, ayni seviyeli "kardes" mobun tablosu varsa aynen kopyalanir (Dark eyes, Dire wolf, Felankor).
--           2) Digerleri sunucunun kendi seviye bandi kaliplarindan kurulur (kullanilan gruplar/esyalar ayni bantta zaten mobda duruyor).
-- Yuzdeler 10000 uzerinden (10000 = %100). Eklenen satirlar K_MONSTER_ITEM_YEDEK_20261119'de yedeklenen tablonun ustune eklenir; geri almak icin:
--   DELETE FROM K_MONSTER_ITEM WHERE sIndex IN (<asagidaki 19 sIndex>)
IF OBJECT_ID('K_MONSTER_ITEM_YEDEK_20261119') IS NULL SELECT * INTO K_MONSTER_ITEM_YEDEK_20261119 FROM K_MONSTER_ITEM;
BEGIN TRAN;

DECLARE @hedef TABLE (sIndex int);
INSERT INTO @hedef VALUES (7001),(7002),(504),(505),(8011),(8014),(506),(8617),(5701),(5552),(5651),(7018),(7019),(7021),(7022),(5702),(8615),(8608),(8634);

-- Her hedef mobun sItem'i kendi sSid'ine esit ve K_MONSTER_ITEM'da henuz satiri yok mu?
IF EXISTS (SELECT 1 FROM @hedef h WHERE NOT EXISTS (SELECT 1 FROM K_MONSTER m WHERE m.sSid = h.sIndex AND m.sItem = h.sIndex))
BEGIN RAISERROR('Bir hedef mobun sItem degeri sSid ile ayni degil', 16, 1); ROLLBACK TRAN; RETURN; END
DELETE h FROM @hedef h WHERE EXISTS (SELECT 1 FROM K_MONSTER_ITEM d WHERE d.sIndex = h.sIndex);   -- zaten satiri olan atlanir (betik tekrar calisinca bir sey yapmaz)

-- 1) Kardes tablolardan kopya
INSERT INTO K_MONSTER_ITEM (sIndex, iItem01, sPersent01, iItem02, sPersent02, iItem03, sPersent03, iItem04, sPersent04, iItem05, sPersent05, iItem06, sPersent06, iItem07, sPersent07, iItem08, sPersent08, iItem09, sPersent09, iItem10, sPersent10, iItem11, sPersent11, iItem12, sPersent12)
SELECT k.n, d.iItem01, d.sPersent01, d.iItem02, d.sPersent02, d.iItem03, d.sPersent03, d.iItem04, d.sPersent04, d.iItem05, d.sPersent05, d.iItem06, d.sPersent06, d.iItem07, d.sPersent07, d.iItem08, d.sPersent08, d.iItem09, d.sPersent09, d.iItem10, d.sPersent10, d.iItem11, d.sPersent11, d.iItem12, d.sPersent12
FROM (VALUES (504, 554), (505, 555), (5702, 7035)) k(n, kaynak)
JOIN K_MONSTER_ITEM d ON d.sIndex = k.kaynak
WHERE k.n IN (SELECT sIndex FROM @hedef);
DELETE FROM @hedef WHERE sIndex IN (504, 505, 5702);

-- 2) Bant kaliplarindan kurulanlar: (sIndex, yuva, esya ya da grup kodu, yuzde)
DECLARE @plan TABLE (sIndex int, yuva int, it int, pct int);
-- Orc bandit / Orc bandit archer (Lv10): dusuk seviye bandi (Lv1-30) + kendi esyalari (Bracelet of orc bandit)
INSERT INTO @plan VALUES (7001,1,120,300),(7001,2,389016000,4000),(7001,3,389017000,2500),(7001,4,910042000,2000),
                         (7002,1,120,300),(7002,2,389016000,4000),(7002,3,910042000,2000);
-- Dragon Tooth commander (Lv68, Lv51-70 bandi)
INSERT INTO @plan VALUES (8011,1,2000,1300),(8011,2,3408,500),(8011,3,1914,300),(8011,4,389020000,500),(8011,5,300144036,5);
-- Apostle of Piercing Cold (Lv84, Lv81-100 bandi)
INSERT INTO @plan VALUES (8014,1,1626,360),(8014,2,3408,580),(8014,3,1914,450),(8014,4,389020000,1500),(8014,5,300144036,9);
-- Lobo (Lv96)
INSERT INTO @plan VALUES (506,1,389020000,2000),(506,2,3408,500),(506,3,379154000,850),(506,4,379155000,380),(506,5,300144036,9);
-- Ashiton (Lv100, Krowaz Domion): sandik agirlikli
INSERT INTO @plan VALUES (8617,1,379154000,850),(8617,2,379155000,390),(8617,3,379156000,90),(8617,4,1626,360),(8617,5,389020000,2000),(8617,6,300144036,9);
-- Isiloon (Lv120, boss; Lv170 kardesinin hafifletilmisi)
INSERT INTO @plan VALUES (5701,1,550,4000),(5701,2,1626,600),(5701,3,389020000,3000),(5701,4,5551,50),(5701,5,300144036,3);
-- Servant of Isiloon (Lv130, Lv101-130 bandi)
INSERT INTO @plan VALUES (5552,1,308,300),(5552,2,1626,300),(5552,3,389020000,800),(5552,4,300144036,3),
                         (5651,1,308,300),(5651,2,1626,300),(5651,3,389020000,800),(5651,4,300144036,3);
-- [Quest] mobları (Lv150, Eslant): Lv131+ bandinin hafif hali (gorev esyalari ayrica gorev betiginden gelir)
INSERT INTO @plan VALUES (7018,1,389020000,1500),(7018,2,550,600),(7018,3,1914,400),(7018,4,300144036,9),
                         (7019,1,389020000,1500),(7019,2,550,600),(7019,3,1914,400),(7019,4,300144036,9),
                         (7021,1,389020000,1500),(7021,2,550,600),(7021,3,1914,400),(7021,4,300144036,9),
                         (7022,1,389020000,1500),(7022,2,550,600),(7022,3,1914,400),(7022,4,300144036,9);
-- Lirimu (Lv170) ve Giga Hammer (Lv210), Krowaz Domion: Lv131+ bandi
INSERT INTO @plan VALUES (8615,1,550,1700),(8615,2,389020000,3500),(8615,3,1914,450),(8615,4,379067000,8),(8615,5,300144036,7),(8615,6,1951,5),
                         (8608,1,550,1700),(8608,2,389020000,3500),(8608,3,1914,450),(8608,4,379067000,8),(8608,5,300144036,7),(8608,6,1951,5);
-- Treasure Chest (Lv1, Krowaz Domion)
INSERT INTO @plan VALUES (8634,1,1914,2000),(8634,2,389020000,1500),(8634,3,3408,1500),(8634,4,300144036,50);

-- Dogrulama: esya numaralari ITEM'da, grup kodlari MAKE_ITEM_GROUP'ta olmali
IF EXISTS (SELECT 1 FROM @plan p WHERE p.it >= 100000000 AND NOT EXISTS (SELECT 1 FROM ITEM i WHERE i.Num = p.it))
   OR EXISTS (SELECT 1 FROM @plan p WHERE p.it >= 100 AND p.it < 100000000 AND NOT EXISTS (SELECT 1 FROM MAKE_ITEM_GROUP g WHERE g.iItemGroupNum = p.it))
BEGIN RAISERROR('Plandaki bir esya ITEM''da ya da bir grup MAKE_ITEM_GROUP''ta yok', 16, 1); ROLLBACK TRAN; RETURN; END

INSERT INTO K_MONSTER_ITEM (sIndex, iItem01, sPersent01, iItem02, sPersent02, iItem03, sPersent03, iItem04, sPersent04, iItem05, sPersent05, iItem06, sPersent06, iItem07, sPersent07, iItem08, sPersent08, iItem09, sPersent09, iItem10, sPersent10, iItem11, sPersent11, iItem12, sPersent12)
SELECT p.sIndex,
  ISNULL(MAX(CASE WHEN yuva = 1 THEN it END), 0), ISNULL(MAX(CASE WHEN yuva = 1 THEN pct END), 0),
  ISNULL(MAX(CASE WHEN yuva = 2 THEN it END), 0), ISNULL(MAX(CASE WHEN yuva = 2 THEN pct END), 0),
  ISNULL(MAX(CASE WHEN yuva = 3 THEN it END), 0), ISNULL(MAX(CASE WHEN yuva = 3 THEN pct END), 0),
  ISNULL(MAX(CASE WHEN yuva = 4 THEN it END), 0), ISNULL(MAX(CASE WHEN yuva = 4 THEN pct END), 0),
  ISNULL(MAX(CASE WHEN yuva = 5 THEN it END), 0), ISNULL(MAX(CASE WHEN yuva = 5 THEN pct END), 0),
  ISNULL(MAX(CASE WHEN yuva = 6 THEN it END), 0), ISNULL(MAX(CASE WHEN yuva = 6 THEN pct END), 0),
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
FROM @plan p WHERE p.sIndex IN (SELECT sIndex FROM @hedef) GROUP BY p.sIndex;

COMMIT TRAN;
