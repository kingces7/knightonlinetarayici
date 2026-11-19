SET NOCOUNT ON;
-- 1) Hiçbir canavar +6'dan yüksek (+7, +8, +9, +10) eşya düşürmez: ganimet gruplarından, rastgele gruptan (8888) ve doğrudan yuvalardan çıkarılır.
-- 2) Beyaz (yükseltmesiz, unique olmayan) giyilebilir eşyaya giden kalan yollar kapanır; beyaz eşya yalnız GM Market'te (999000) ve ITEM tablosunda kalır:
--    üretim/ganimet grupları, takas tarifleri (ITEM_EXCHANGE çıktısı), yükseltme tarifleri (NEW_UPGRADE sonucu), Cinderella War seti.
--    Beyazın yerine aynı eşyanın mor +1..+6 kardeşi konur; kardeşi yoksa grup girdisi/tarif silinir.
-- Yedekler: *_ARTI6_YEDEK. Uygulama sonrası GameServer yeniden başlatılmalı.
IF OBJECT_ID('MAKE_ITEM_GROUP_ARTI6_YEDEK') IS NULL SELECT * INTO MAKE_ITEM_GROUP_ARTI6_YEDEK FROM MAKE_ITEM_GROUP;
IF OBJECT_ID('MAKE_ITEM_GROUP_RANDOM_ARTI6_YEDEK') IS NULL SELECT * INTO MAKE_ITEM_GROUP_RANDOM_ARTI6_YEDEK FROM MAKE_ITEM_GROUP_RANDOM;
IF OBJECT_ID('K_MONSTER_ITEM_ARTI6_YEDEK') IS NULL SELECT * INTO K_MONSTER_ITEM_ARTI6_YEDEK FROM K_MONSTER_ITEM;
IF OBJECT_ID('ITEM_EXCHANGE_ARTI6_YEDEK') IS NULL SELECT * INTO ITEM_EXCHANGE_ARTI6_YEDEK FROM ITEM_EXCHANGE;
IF OBJECT_ID('NEW_UPGRADE_ARTI6_YEDEK') IS NULL SELECT * INTO NEW_UPGRADE_ARTI6_YEDEK FROM NEW_UPGRADE;
IF OBJECT_ID('CINDWAR_ITEMS1_ARTI6_YEDEK') IS NULL SELECT * INTO CINDWAR_ITEMS1_ARTI6_YEDEK FROM CINDWAR_ITEMS1;

-- Beyaz giyilebilir eşyalar (#W) ve her birinin mor +1..+6 kardeşlerinden en düşüğü (#S.p, yoksa NULL)
SELECT Num INTO #W FROM ITEM
WHERE LEN(ISNULL(strName, '')) > 0 AND Kind IN (11,21,22,31,32,41,42,51,52,60,70,71,91,92,93,94,110,181,210,220,230,240)
  AND Num % 10 = 0 AND ItemType <> 4 AND strName NOT LIKE '%(+[0-9]%';
CREATE UNIQUE INDEX ixw ON #W(Num);
SELECT w.Num AS w, (SELECT MIN(i.Num) FROM ITEM i WHERE i.Num BETWEEN w.Num + 1 AND w.Num + 6 AND i.ItemType <> 4 AND LEN(ISNULL(i.strName, '')) > 0) AS p INTO #S FROM #W w;
CREATE UNIQUE INDEX ixs ON #S(w);
-- +7 ve üzeri yükseltilmiş eşyalar (#H)
SELECT Num INTO #H FROM ITEM WHERE strName LIKE '%(+[0-9]%' AND (byGrade > 6 OR Num % 10 > 6);
CREATE UNIQUE INDEX ixh ON #H(Num);

-- Ganimet grupları (MAKE_ITEM_GROUP)
DECLARE @v nvarchar(max) = N'';
SELECT @v = @v + CASE WHEN @v = N'' THEN N'' ELSE N',' END + N'(iItem_' + CAST(n AS nvarchar(5)) + N')' FROM (SELECT TOP 200 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
CREATE TABLE #M (grup int, no bigint);
EXEC (N'INSERT INTO #M SELECT iItemGroupNum, v.no FROM MAKE_ITEM_GROUP CROSS APPLY (VALUES ' + @v + N') v(no) WHERE v.no <> 0');
CREATE TABLE #K (grup bigint);
INSERT INTO #K SELECT DISTINCT v.no FROM K_MONSTER_ITEM CROSS APPLY (VALUES (iItem01),(iItem02),(iItem03),(iItem04),(iItem05),(iItem06),(iItem07),(iItem08),(iItem09),(iItem10),(iItem11),(iItem12)) v(no) WHERE v.no <> 0 AND v.no < 100000000;

SELECT DISTINCT m.grup INTO #A FROM #M m
WHERE m.no IN (SELECT Num FROM #W) OR (m.grup IN (SELECT grup FROM #K) AND m.no IN (SELECT Num FROM #H));
CREATE TABLE #Y (grup int, no bigint);
INSERT INTO #Y SELECT m.grup, m.no FROM #M m WHERE m.grup IN (SELECT grup FROM #A) AND m.no NOT IN (SELECT Num FROM #W) AND NOT (m.grup IN (SELECT grup FROM #K) AND m.no IN (SELECT Num FROM #H));
INSERT INTO #Y SELECT m.grup, i.Num FROM #M m JOIN ITEM i ON i.Num BETWEEN m.no + 1 AND m.no + 6 AND i.ItemType <> 4 AND LEN(ISNULL(i.strName, '')) > 0 WHERE m.grup IN (SELECT grup FROM #A) AND m.no IN (SELECT Num FROM #W);
CREATE TABLE #N (grup int, rn int, no bigint);
INSERT INTO #N SELECT grup, ROW_NUMBER() OVER (PARTITION BY grup ORDER BY no), no FROM (SELECT DISTINCT grup, no FROM #Y) x;
IF EXISTS (SELECT 1 FROM #N WHERE rn > 200) THROW 50001, 'Grup 200 yuvayi asiyor', 1;
DECLARE @s nvarchar(max) = N'';
SELECT @s = @s + CASE WHEN @s = N'' THEN N'' ELSE N', ' END + N'iItem_' + CAST(n AS nvarchar(5)) + N' = ISNULL((SELECT no FROM #N WHERE grup = g.iItemGroupNum AND rn = ' + CAST(n AS nvarchar(5)) + N'), 0)' FROM (SELECT TOP 200 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
EXEC (N'UPDATE g SET ' + @s + N' FROM MAKE_ITEM_GROUP g WHERE g.iItemGroupNum IN (SELECT grup FROM #A)');

-- Rastgele grup (8888 vb.): mobların kullandığı gruplardan +7 ve üzeri satırlar silinir
DELETE r FROM MAKE_ITEM_GROUP_RANDOM r WHERE r.GroupNo IN (SELECT grup FROM #K) AND (r.ItemID IN (SELECT Num FROM #H) OR r.ItemID IN (SELECT Num FROM #W));

-- Doğrudan yuvalar
DECLARE @d nvarchar(max) = N'';
SELECT @d = @d + N'UPDATE K_MONSTER_ITEM SET iItem' + RIGHT('0' + CAST(n AS varchar(2)), 2) + N' = 0, sPersent' + RIGHT('0' + CAST(n AS varchar(2)), 2) + N' = 0 WHERE iItem' + RIGHT('0' + CAST(n AS varchar(2)), 2) + N' IN (SELECT Num FROM #H UNION SELECT Num FROM #W); ' FROM (SELECT TOP 12 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
EXEC (@d);

-- Takas tarifleri: beyaz çıktının kardeşi yoksa tarif silinir, varsa çıktı kardeşle değişir
DELETE e FROM ITEM_EXCHANGE e WHERE EXISTS (SELECT 1 FROM #S s WHERE s.p IS NULL AND s.w IN (e.nExchangeItemNum1, e.nExchangeItemNum2, e.nExchangeItemNum3, e.nExchangeItemNum4, e.nExchangeItemNum5));
UPDATE e SET nExchangeItemNum1 = ISNULL((SELECT p FROM #S WHERE w = e.nExchangeItemNum1), e.nExchangeItemNum1), nExchangeItemNum2 = ISNULL((SELECT p FROM #S WHERE w = e.nExchangeItemNum2), e.nExchangeItemNum2),
  nExchangeItemNum3 = ISNULL((SELECT p FROM #S WHERE w = e.nExchangeItemNum3), e.nExchangeItemNum3), nExchangeItemNum4 = ISNULL((SELECT p FROM #S WHERE w = e.nExchangeItemNum4), e.nExchangeItemNum4),
  nExchangeItemNum5 = ISNULL((SELECT p FROM #S WHERE w = e.nExchangeItemNum5), e.nExchangeItemNum5) FROM ITEM_EXCHANGE e;
-- Yükseltme tarifleri: sonucu beyaz olanlar
DELETE u FROM NEW_UPGRADE u WHERE u.nNewNumber IN (SELECT w FROM #S WHERE p IS NULL);
UPDATE u SET nNewNumber = s.p FROM NEW_UPGRADE u JOIN #S s ON s.w = u.nNewNumber WHERE s.p IS NOT NULL;
-- Cinderella War seti
DELETE c FROM CINDWAR_ITEMS1 c WHERE c.itemid IN (SELECT w FROM #S WHERE p IS NULL);
UPDATE c SET itemid = s.p FROM CINDWAR_ITEMS1 c JOIN #S s ON s.w = c.itemid WHERE s.p IS NOT NULL;

SELECT 'etkilenen grup' ne, COUNT(*) n FROM #A
UNION ALL SELECT 'takas tarifi (yedek -> simdi)', (SELECT COUNT(*) FROM ITEM_EXCHANGE_ARTI6_YEDEK) - (SELECT COUNT(*) FROM ITEM_EXCHANGE)
UNION ALL SELECT 'yukseltme tarifi silinen', (SELECT COUNT(*) FROM NEW_UPGRADE_ARTI6_YEDEK) - (SELECT COUNT(*) FROM NEW_UPGRADE)
UNION ALL SELECT 'cinderella silinen', (SELECT COUNT(*) FROM CINDWAR_ITEMS1_ARTI6_YEDEK) - (SELECT COUNT(*) FROM CINDWAR_ITEMS1)
UNION ALL SELECT 'rastgele grup silinen', (SELECT COUNT(*) FROM MAKE_ITEM_GROUP_RANDOM_ARTI6_YEDEK) - (SELECT COUNT(*) FROM MAKE_ITEM_GROUP_RANDOM);
