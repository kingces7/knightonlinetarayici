SET NOCOUNT ON;
-- El Morad Castle (bolge 2) merkezine Accessory Merchant (13001) ve iki Scrolls tuccari (22301, 23400): Moradon/Luferson ile ayni K_NPC kayitlari ve satis gruplari.
DELETE FROM K_NPCPOS1098 WHERE ZoneID = 2 AND NpcID IN (13001, 22301, 23400);
DECLARE @yer TABLE (sid int, x int, z int, yon int);
INSERT INTO @yer VALUES (13001, 1636, 430, 180), (22301, 1642, 432, 180), (23400, 1648, 430, 180);
SELECT TOP 1 * INTO #p FROM K_NPCPOS1098 WHERE ZoneID = 21 AND NpcID = 13001;
ALTER TABLE #p DROP COLUMN ID;
INSERT INTO K_NPCPOS1098 (ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room)
SELECT 2, y.sid, n.strName, p.mon_summon, p.mon_savepos, p.ActType, p.RegenType, p.DungeonFamily, p.SpecialType, p.TrapNumber, y.x, y.z, 1, 0, 3600, y.yon, p.DotCnt, p.path, p.Room
FROM #p p CROSS JOIN @yer y JOIN K_NPC n ON n.sSid = y.sid;
DROP TABLE #p;
