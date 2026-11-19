SET NOCOUNT ON;
-- Beyaz (yükseltmesiz, unique olmayan) giyilebilir eşyalar yalnız GM Market'te (grup 999000) ve veritabanında kalır; canavar ganimetinden ve diğer dükkanlardan çıkarılır.
-- Ganimette yerine mor (+1..+9, "Upgrade Item") eşyalar konur. Yedekler: MAKE_ITEM_GROUP_BEYAZ_YEDEK, ITEM_SELLTABLE_BEYAZ_YEDEK. Uygulama sonrası GameServer yeniden başlatılmalı.
IF OBJECT_ID('MAKE_ITEM_GROUP_BEYAZ_YEDEK') IS NULL SELECT * INTO MAKE_ITEM_GROUP_BEYAZ_YEDEK FROM MAKE_ITEM_GROUP WHERE iItemGroupNum IN (9001, 9002);
IF OBJECT_ID('ITEM_SELLTABLE_BEYAZ_YEDEK') IS NULL SELECT * INTO ITEM_SELLTABLE_BEYAZ_YEDEK FROM ITEM_SELLTABLE;

SELECT Num INTO #W FROM ITEM
WHERE LEN(ISNULL(strName, '')) > 0 AND Kind IN (11,21,22,31,32,41,42,51,52,60,70,71,91,92,93,94,110,181,210,220,230,240)
  AND Num % 10 = 0 AND ItemType <> 4 AND strName NOT LIKE '%(+[0-9]%';
CREATE UNIQUE INDEX ixw ON #W(Num);

-- Ganimet grupları: 9001 (Worm düşük silahlar) ve 9002 (Worm düşük zırhlar) yalnız beyaz içerir.
DECLARE @v nvarchar(max) = N'';
SELECT @v = @v + CASE WHEN @v = N'' THEN N'' ELSE N',' END + N'(iItem_' + CAST(n AS nvarchar(5)) + N')' FROM (SELECT TOP 200 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
CREATE TABLE #M (grup int, no bigint);
EXEC (N'INSERT INTO #M SELECT iItemGroupNum, v.no FROM MAKE_ITEM_GROUP CROSS APPLY (VALUES ' + @v + N') v(no) WHERE v.no <> 0 AND iItemGroupNum IN (9001, 9002)');

CREATE TABLE #L (grup int, no bigint);
-- Beyaz olmayan mevcut öğeler kalır
INSERT INTO #L SELECT m.grup, m.no FROM #M m WHERE m.no NOT IN (SELECT Num FROM #W);
-- Yükseltilebilen beyaz eşya: aynı eşyanın +1..+9 kardeşleri
INSERT INTO #L SELECT m.grup, i.Num FROM #M m JOIN ITEM i ON i.Num BETWEEN m.no + 1 AND m.no + 9 AND i.ItemType <> 4 AND LEN(ISNULL(i.strName, '')) > 0 WHERE m.no IN (SELECT Num FROM #W);
-- Yükseltilemeyen beyaz silah (Dagger, Short Sword, Flower Shield, Novice Bow, Wooden Staff): aynı tür/yuva/sınıfta en düşük hasarlı iki mor hat (+1..+9)
;WITH yok AS (
  SELECT DISTINCT m.grup, w.Kind, w.Slot, w.Class FROM #M m JOIN ITEM w ON w.Num = m.no
  WHERE m.no IN (SELECT Num FROM #W) AND NOT EXISTS (SELECT 1 FROM ITEM i WHERE i.Num BETWEEN m.no + 1 AND m.no + 9 AND i.ItemType <> 4 AND LEN(ISNULL(i.strName, '')) > 0)),
hat AS (
  SELECT y.grup, p.Num / 1000 AS hat, ROW_NUMBER() OVER (PARTITION BY y.grup, y.Kind, y.Slot, y.Class ORDER BY p.Damage, p.Num) rn
  FROM yok y JOIN ITEM p ON p.Kind = y.Kind AND p.Slot = y.Slot AND p.Class = y.Class AND p.ItemType = 5 AND p.Num % 1000 = 1 AND p.ReqLevel = 0 AND LEN(ISNULL(p.strName, '')) > 0)
INSERT INTO #L SELECT DISTINCT h.grup, i.Num FROM hat h JOIN ITEM i ON i.Num / 1000 = h.hat AND i.Num % 1000 BETWEEN 1 AND 9 AND i.ItemType = 5 WHERE h.rn <= 2;

CREATE TABLE #N (grup int, rn int, no bigint);
INSERT INTO #N SELECT grup, ROW_NUMBER() OVER (PARTITION BY grup ORDER BY no), no FROM (SELECT DISTINCT grup, no FROM #L) x;
IF EXISTS (SELECT 1 FROM #N WHERE rn > 200) THROW 50001, 'Grup 200 yuvayi asiyor', 1;

DECLARE @s nvarchar(max) = N'';
SELECT @s = @s + CASE WHEN @s = N'' THEN N'' ELSE N', ' END + N'iItem_' + CAST(n AS nvarchar(5)) + N' = ISNULL((SELECT no FROM #N WHERE grup = g.iItemGroupNum AND rn = ' + CAST(n AS nvarchar(5)) + N'), 0)' FROM (SELECT TOP 200 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
EXEC (N'UPDATE g SET ' + @s + N' FROM MAKE_ITEM_GROUP g WHERE g.iItemGroupNum IN (9001, 9002)');

-- Dükkanlar (GM Market 999000 hariç): beyaz giyilebilir eşya yuvaları boşaltılır
DECLARE @d nvarchar(max) = N'';
SELECT @d = @d + N'UPDATE ITEM_SELLTABLE SET Item' + CAST(n AS nvarchar(5)) + N' = 0 WHERE iSellingGroup <> 999000 AND Item' + CAST(n AS nvarchar(5)) + N' IN (SELECT Num FROM #W); ' FROM (SELECT TOP 24 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
EXEC (@d);

SELECT grup, COUNT(*) AS yeni_oge_sayisi FROM #N GROUP BY grup ORDER BY grup;
