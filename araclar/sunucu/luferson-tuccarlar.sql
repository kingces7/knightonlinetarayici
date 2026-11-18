SET NOCOUNT ON;
-- Luferson Castle (bolge 1) ana sehrine Moradon'daki Accessory Merchant (13001) ve iki Scrolls tuccari (22301, 23400): ayni K_NPC kayitlari, yani ayni satis gruplari (203002, 254000, 281000).
DELETE FROM K_NPCPOS1098 WHERE ZoneID = 1 AND NpcID IN (13001, 22301, 23400);
DECLARE @yer TABLE (sid int, x int, z int, yon int);
INSERT INTO @yer VALUES (13001, 421, 1644, 25), (22301, 428, 1651, 25), (23400, 435, 1644, 25);
SELECT TOP 1 * INTO #p FROM K_NPCPOS1098 WHERE ZoneID = 21 AND NpcID = 13001;
ALTER TABLE #p DROP COLUMN ID;
INSERT INTO K_NPCPOS1098 (ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room)
SELECT 1, y.sid, n.strName, p.mon_summon, p.mon_savepos, p.ActType, p.RegenType, p.DungeonFamily, p.SpecialType, p.TrapNumber, y.x, y.z, 1, 0, 3600, y.yon, p.DotCnt, p.path, p.Room
FROM #p p CROSS JOIN @yer y JOIN K_NPC n ON n.sSid = y.sid;
DROP TABLE #p;
