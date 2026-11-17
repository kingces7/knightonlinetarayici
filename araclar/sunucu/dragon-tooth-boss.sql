SET NOCOUNT ON;
IF NOT EXISTS (SELECT 1 FROM K_MONSTER WHERE sSid = 32600)
BEGIN
  SELECT * INTO #m FROM K_MONSTER WHERE sSid = 8011;
  UPDATE #m SET sSid = 32600, strName = 'Dragon Tooth Boss', sItem = 1114, sLevel = 68, iHpPoint = 12668, sAc = 601, sDamage = 400, iExp = 61818, iMoney = 2019, sSize = 170;
  INSERT INTO K_MONSTER SELECT * FROM #m;
  DROP TABLE #m;
END
IF NOT EXISTS (SELECT 1 FROM K_NPCPOS1098 WHERE NpcID = 32600 AND ZoneID = 21)
BEGIN
  SELECT * INTO #p FROM K_NPCPOS1098 WHERE ID = 8104;
  ALTER TABLE #p DROP COLUMN ID;
  UPDATE #p SET NpcID = 32600, strName = 'Dragon Tooth Boss', LeftX = 370, TopZ = 324, NumNPC = 1, iRange = 0, RegTime = 5, ActType = 1;
  INSERT INTO K_NPCPOS1098 (ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room) SELECT ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room FROM #p;
  DROP TABLE #p;
END
SELECT sSid, strName, sPid, sLevel, iHpPoint, sAc, sDamage, byActType, sItem FROM K_MONSTER WHERE sSid = 32600;
SELECT ID, ZoneID, NpcID, LeftX, TopZ, NumNPC, iRange, RegTime, ActType FROM K_NPCPOS1098 WHERE NpcID = 32600;
