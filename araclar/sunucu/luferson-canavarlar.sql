SET NOCOUNT ON;
-- Luferson (bolge 1): orijinal (resmi 1298 K_NPCPOS) yerlesimde olup Myko'da olmayan canavarlar; koordinatlar ORIJINALDEN (LeftX, TopZ) aynen, adet ve dogus suresi orijinal, iRange 10 (Myko ayni slotlarda boyle). Kaynak liste: luferson/canavarlar-orijinal.csv
DELETE FROM K_NPCPOS1098 WHERE ZoneID = 1 AND NpcID IN (956, 1055, 554, 955, 1689);
DECLARE @yeni TABLE (sid int, x int, z int, adet int, dogus int);
INSERT INTO @yeni VALUES
  (554, 685, 1687, 5, 30),
  (554, 718, 1627, 5, 30),
  (955, 712, 1511, 5, 30),
  (955, 750, 1519, 5, 30),
  (955, 764, 1557, 5, 30),
  (955, 787, 1497, 5, 30),
  (955, 794, 1533, 5, 30),
  (956, 259, 1388, 1, 32000),
  (956, 653, 1192, 1, 32000),
  (956, 724, 1545, 1, 32000),
  (956, 840, 1873, 1, 32000),
  (956, 1541, 1741, 1, 32000),
  (1055, 626, 331, 1, 32000),
  (1055, 910, 1134, 1, 32000),
  (1055, 1002, 1355, 1, 32000),
  (1055, 1197, 583, 1, 32000),
  (1055, 1782, 1394, 1, 32000),
  (1689, 1196, 371, 1, 60),
  (1689, 1404, 999, 1, 60);
SELECT TOP 1 * INTO #p FROM K_NPCPOS1098 WHERE ZoneID = 1 AND NpcID = 1051;
ALTER TABLE #p DROP COLUMN ID;
INSERT INTO K_NPCPOS1098 (ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room)
SELECT 1, y.sid, m.strName, p.mon_summon, p.mon_savepos, p.ActType, p.RegenType, p.DungeonFamily, p.SpecialType, p.TrapNumber, y.x, y.z, y.adet, 10, y.dogus, 0, p.DotCnt, p.path, p.Room FROM #p p CROSS JOIN @yeni y JOIN K_MONSTER m ON m.sSid = y.sid;
DROP TABLE #p;
