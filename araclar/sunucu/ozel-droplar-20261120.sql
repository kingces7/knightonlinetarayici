SET NOCOUNT ON;
-- ces isteği (2026-11-20): özel ganimet.
--  1) Werewolf (sSid 500, 530, 550, 9318): %5 (20 öldürmede bir) grup 9101'den biri: 379221000 Upgrade Scroll, 810582000 Two-Handed Sword (+8), 810584000 Bow (+8), 810587000 Wood Staff (+8), 810590000 Maul (+8)
--     (+8 eşyalar ces'in açık isteğidir; genel "+6'dan yüksek düşmesin" kuralının istisnası.)
--  2) Orc Watcher (1671, 1697, 9773): %5 379016000 Upgrade Scroll
--  3) Bandicoot ailesi (adında Bandicoot geçen tüm canavarlar): %2 (50 öldürmede bir) 379221000 Upgrade Scroll (Low Class item)
-- Yuva yüzdesi 10000 üzerinden (500 = %5). Her canavarın ilk boş ganimet yuvası kullanılır. Yedek: K_MONSTER_ITEM_OZEL3_YEDEK_20261120, MAKE_ITEM_GROUP satırı 9101.
IF OBJECT_ID('K_MONSTER_ITEM_OZEL3_YEDEK_20261120') IS NULL SELECT * INTO K_MONSTER_ITEM_OZEL3_YEDEK_20261120 FROM K_MONSTER_ITEM;

IF NOT EXISTS (SELECT 1 FROM MAKE_ITEM_GROUP WHERE iItemGroupNum = 9101)
BEGIN
  SELECT TOP 1 * INTO #g FROM MAKE_ITEM_GROUP;
  DECLARE @z nvarchar(max) = N'UPDATE #g SET iItemGroupNum = 9101, [Desc] = N''Werewolf ozel drop (ces 2026-11-20)''';
  SELECT @z = @z + N', iItem_' + CAST(n AS nvarchar(5)) + N' = 0' FROM (SELECT TOP 200 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
  EXEC (@z);
  UPDATE #g SET iItem_1 = 379221000, iItem_2 = 810582000, iItem_3 = 810584000, iItem_4 = 810587000, iItem_5 = 810590000;
  INSERT INTO MAKE_ITEM_GROUP SELECT * FROM #g;
END

CREATE TABLE #T (sid int, item int, pct int);
INSERT INTO #T SELECT sSid, 9101, 500 FROM K_MONSTER WHERE sSid IN (500, 530, 550, 9318);
INSERT INTO #T SELECT sSid, 379016000, 500 FROM K_MONSTER WHERE sSid IN (1671, 1697, 9773);
INSERT INTO #T SELECT sSid, 379221000, 200 FROM K_MONSTER WHERE strName LIKE '%Bandicoot%';

DECLARE @sid int, @item int, @pct int, @idx int, @k int, @sql nvarchar(max), @bos int, @mevcut int;
DECLARE c CURSOR FOR SELECT t.sid, t.item, t.pct, m.sItem FROM #T t JOIN K_MONSTER m ON m.sSid = t.sid;
OPEN c; FETCH NEXT FROM c INTO @sid, @item, @pct, @idx;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF @idx > 0 AND NOT EXISTS (SELECT 1 FROM K_MONSTER_ITEM WHERE sIndex = @idx)
  BEGIN
    SELECT TOP 1 * INTO #r FROM K_MONSTER_ITEM;
    DECLARE @y nvarchar(max) = N'UPDATE #r SET sIndex = ' + CAST(@idx AS nvarchar(10));
    SELECT @y = @y + N', iItem' + RIGHT('0' + CAST(n AS varchar(2)), 2) + N' = 0, sPersent' + RIGHT('0' + CAST(n AS varchar(2)), 2) + N' = 0' FROM (SELECT TOP 12 ROW_NUMBER() OVER (ORDER BY (SELECT 1)) n FROM sys.all_columns) t;
    EXEC (@y); INSERT INTO K_MONSTER_ITEM SELECT * FROM #r; DROP TABLE #r;
  END
  SET @k = 1; SET @bos = 0;
  WHILE @k <= 12
  BEGIN
    DECLARE @kk varchar(2) = RIGHT('0' + CAST(@k AS varchar(2)), 2);
    SET @sql = N'SELECT @a = iItem' + @kk + N' FROM K_MONSTER_ITEM WHERE sIndex = ' + CAST(@idx AS nvarchar(10));
    EXEC sp_executesql @sql, N'@a int OUTPUT', @a = @mevcut OUTPUT;
    IF @mevcut = @item BEGIN SET @bos = -1; BREAK; END
    IF ISNULL(@mevcut, 0) = 0 AND @bos = 0 SET @bos = @k;
    SET @k = @k + 1;
  END
  IF @bos > 0
  BEGIN
    DECLARE @b varchar(2) = RIGHT('0' + CAST(@bos AS varchar(2)), 2);
    SET @sql = N'UPDATE K_MONSTER_ITEM SET iItem' + @b + N' = ' + CAST(@item AS nvarchar(12)) + N', sPersent' + @b + N' = ' + CAST(@pct AS nvarchar(6)) + N' WHERE sIndex = ' + CAST(@idx AS nvarchar(10));
    EXEC (@sql);
  END
  ELSE IF @bos = 0 PRINT 'BOS YUVA YOK: canavar ' + CAST(@sid AS varchar(10));
  FETCH NEXT FROM c INTO @sid, @item, @pct, @idx;
END
CLOSE c; DEALLOCATE c;
SELECT COUNT(*) AS hedef_canavar FROM #T;
