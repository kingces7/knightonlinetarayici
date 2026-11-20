SET NOCOUNT ON;
-- Canavar slotlarındaki (K_NPCPOS1098) canavarlar slot noktasının ±iRange metre içinde rastgele doğar; çok geniş iRange yüzünden komşu slotların canavarları birbirine karışıyordu.
-- Birden çok canavarlı gezinen slotlarda iRange %60'a indirilir (en az 3 m). Yedek: K_NPCPOS1098_RANGE_YEDEK_20261120 (ID, iRange).
IF OBJECT_ID('K_NPCPOS1098_RANGE_YEDEK_20261120') IS NULL SELECT ID, iRange INTO K_NPCPOS1098_RANGE_YEDEK_20261120 FROM K_NPCPOS1098;
UPDATE K_NPCPOS1098 SET iRange = CASE WHEN ROUND(iRange * 0.6, 0) < 3 THEN 3 ELSE CAST(ROUND(iRange * 0.6, 0) AS int) END
WHERE ActType < 100 AND NumNPC > 1 AND iRange > 3;
SELECT @@ROWCOUNT AS degisen_slot;
SELECT ZoneID, COUNT(*) slot, AVG(CAST(iRange AS float)) ort_range FROM K_NPCPOS1098 WHERE ActType < 100 AND NumNPC > 1 AND ZoneID IN (1, 2, 21) GROUP BY ZoneID;
