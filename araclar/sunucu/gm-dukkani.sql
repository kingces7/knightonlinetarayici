SET NOCOUNT ON;
-- GM esya dukkani (satis grubu 999000): ITEM tablosundaki tum esyalar (+0 temel kayitlar), 24 esya/sayfa, esya numarasina gore sirali. Yalniz GM ucretsiz alabilir (sunucu yamasi gm-esya-dukkani.patch).
DELETE FROM ITEM_SELLTABLE WHERE iSellingGroup = 999000;
;WITH e AS (SELECT Num, ROW_NUMBER() OVER (ORDER BY Num) - 1 AS rn FROM ITEM WHERE Num % 1000 = 0 AND LEN(ISNULL(strName, '')) > 0),
 s AS (SELECT Num, rn / 24 AS p, rn % 24 + 1 AS s FROM e)
INSERT INTO ITEM_SELLTABLE (iSellingGroup, Item1, Item2, Item3, Item4, Item5, Item6, Item7, Item8, Item9, Item10, Item11, Item12, Item13, Item14, Item15, Item16, Item17, Item18, Item19, Item20, Item21, Item22, Item23, Item24, nIndex)
SELECT 999000, MAX(CASE WHEN s = 1 THEN Num ELSE 0 END), MAX(CASE WHEN s = 2 THEN Num ELSE 0 END), MAX(CASE WHEN s = 3 THEN Num ELSE 0 END), MAX(CASE WHEN s = 4 THEN Num ELSE 0 END), MAX(CASE WHEN s = 5 THEN Num ELSE 0 END), MAX(CASE WHEN s = 6 THEN Num ELSE 0 END), MAX(CASE WHEN s = 7 THEN Num ELSE 0 END), MAX(CASE WHEN s = 8 THEN Num ELSE 0 END), MAX(CASE WHEN s = 9 THEN Num ELSE 0 END), MAX(CASE WHEN s = 10 THEN Num ELSE 0 END), MAX(CASE WHEN s = 11 THEN Num ELSE 0 END), MAX(CASE WHEN s = 12 THEN Num ELSE 0 END), MAX(CASE WHEN s = 13 THEN Num ELSE 0 END), MAX(CASE WHEN s = 14 THEN Num ELSE 0 END), MAX(CASE WHEN s = 15 THEN Num ELSE 0 END), MAX(CASE WHEN s = 16 THEN Num ELSE 0 END), MAX(CASE WHEN s = 17 THEN Num ELSE 0 END), MAX(CASE WHEN s = 18 THEN Num ELSE 0 END), MAX(CASE WHEN s = 19 THEN Num ELSE 0 END), MAX(CASE WHEN s = 20 THEN Num ELSE 0 END), MAX(CASE WHEN s = 21 THEN Num ELSE 0 END), MAX(CASE WHEN s = 22 THEN Num ELSE 0 END), MAX(CASE WHEN s = 23 THEN Num ELSE 0 END), MAX(CASE WHEN s = 24 THEN Num ELSE 0 END), 900000 + p FROM s GROUP BY p;
-- NPC: [Sundries] Zarta kaydindan turetilir
IF NOT EXISTS (SELECT 1 FROM K_NPC WHERE sSid = 29990)
BEGIN
  SELECT * INTO #n FROM K_NPC WHERE sSid = 13007;
  UPDATE #n SET sSid = 29990, strName = '[Item Master] GM Market', iSellingGroup = 999000;
  INSERT INTO K_NPC SELECT * FROM #n; DROP TABLE #n;
END
DELETE FROM K_NPCPOS1098 WHERE NpcID = 29990;
DECLARE @yer TABLE (z int, x int, t int);
INSERT INTO @yer VALUES (21, 268, 308), (1, 447, 1630), (2, 1601, 417);
SELECT TOP 1 * INTO #p FROM K_NPCPOS1098 WHERE NpcID = 13007;
ALTER TABLE #p DROP COLUMN ID;
INSERT INTO K_NPCPOS1098 (ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room)
SELECT y.z, 29990, p.strName, p.mon_summon, p.mon_savepos, p.ActType, p.RegenType, p.DungeonFamily, p.SpecialType, p.TrapNumber, y.x, y.t, 1, 0, p.RegTime, 180, p.DotCnt, p.path, p.Room FROM #p p CROSS JOIN @yer y;
DROP TABLE #p;
