SET NOCOUNT ON;
-- Moradon Kecoon Boss: oyunun "Kecoon captain" (sSid 159, seviye 20) kaydından türetilir; HP/defans/hasar boss'a göre yükseltilir, ganimet tablosu aynı kalır.
IF NOT EXISTS (SELECT 1 FROM K_MONSTER WHERE sSid = 32601)
BEGIN
  SELECT * INTO #m FROM K_MONSTER WHERE sSid = 159;
  UPDATE #m SET sSid = 32601, strName = 'Kecoon Boss', sLevel = 30, iHpPoint = 6000, sAc = 260, sDamage = 70, iExp = 3465, iMoney = 1200, sSize = 250;
  INSERT INTO K_MONSTER SELECT * FROM #m;
  DROP TABLE #m;
END
IF NOT EXISTS (SELECT 1 FROM K_NPCPOS1098 WHERE NpcID = 32601 AND ZoneID = 21)
BEGIN
  SELECT * INTO #p FROM K_NPCPOS1098 WHERE ID = 8104;
  ALTER TABLE #p DROP COLUMN ID;
  UPDATE #p SET NpcID = 32601, strName = 'Kecoon Boss', LeftX = 158, TopZ = 462, NumNPC = 1, iRange = 0, RegTime = 60, ActType = 1;
  INSERT INTO K_NPCPOS1098 (ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room) SELECT ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room FROM #p;
  DROP TABLE #p;
END
SELECT sSid, strName, sPid, sLevel, iHpPoint, sAc, sDamage, sSize FROM K_MONSTER WHERE sSid = 32601;
