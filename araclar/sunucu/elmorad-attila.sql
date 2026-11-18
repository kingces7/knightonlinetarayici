SET NOCOUNT ON;
-- El Morad Castle (bolge 2): attila (sSid 1450, Lv85) (982, 664) noktasinda, her oldugunde 5 sn sonra yeniden dogar (ces istegi, 2026-11-18).
DELETE FROM K_NPCPOS1098 WHERE ZoneID = 2 AND NpcID = 1450;
SELECT TOP 1 * INTO #p FROM K_NPCPOS1098 WHERE ZoneID = 2 AND ActType < 100;
ALTER TABLE #p DROP COLUMN ID;
INSERT INTO K_NPCPOS1098 (ZoneID, NpcID, strName, mon_summon, mon_savepos, ActType, RegenType, DungeonFamily, SpecialType, TrapNumber, LeftX, TopZ, NumNPC, iRange, RegTime, byDirection, DotCnt, path, Room)
SELECT 2, 1450, m.strName, p.mon_summon, p.mon_savepos, 1, p.RegenType, p.DungeonFamily, p.SpecialType, p.TrapNumber, 982, 664, 1, 0, 5, 0, p.DotCnt, p.path, p.Room FROM #p p CROSS JOIN K_MONSTER m WHERE m.sSid = 1450;
DROP TABLE #p;
