SET NOCOUNT ON;
-- Boss adları ve ganimetleri (ces kararı, 2026-11-18). Her boss kendi ganimet satırını alır (eski satırlar normal canavarlarla ortak olduğundan değişmez).
-- sPersentNN: yüzde × 100 (1500 = %15).
UPDATE K_MONSTER SET strName = 'Dragon tooth Mentor' WHERE sSid = 32600;
UPDATE K_MONSTER SET strName = 'Kekurikekukaka' WHERE sSid = 32601;

-- Dragon tooth Mentor: mevcut 4 kalem + 62 skill kağıtları (Scream, Magic Shield, Judgment, Absolute Power; her biri %15) + Blessed Item Upgrade Scroll %20
IF NOT EXISTS (SELECT 1 FROM K_MONSTER_ITEM WHERE sIndex = 32600)
BEGIN
  SELECT * INTO #d FROM K_MONSTER_ITEM WHERE sIndex = 1114;
  UPDATE #d SET sIndex = 32600,
    iItem04 = 379063000, sPersent04 = 1500, iItem06 = 379064000, sPersent06 = 1500,
    iItem07 = 379066000, sPersent07 = 1500, iItem08 = 379065000, sPersent08 = 1500,
    iItem09 = 379152000, sPersent09 = 2000; -- 01-03 ve 05 (Bone of Dragon tooth) özgün kalemler
  INSERT INTO K_MONSTER_ITEM SELECT * FROM #d;
  DROP TABLE #d;
END
UPDATE K_MONSTER SET sItem = 32600 WHERE sSid = 32600;

-- Kekurikekukaka: mevcut kalemler + Kekuri Ring %15
IF NOT EXISTS (SELECT 1 FROM K_MONSTER_ITEM WHERE sIndex = 32601)
BEGIN
  SELECT * INTO #k FROM K_MONSTER_ITEM WHERE sIndex = 159;
  UPDATE #k SET sIndex = 32601, iItem05 = 810864000, sPersent05 = 1500; -- 01-02 ve 04 (Arrow) özgün kalemler
  INSERT INTO K_MONSTER_ITEM SELECT * FROM #k;
  DROP TABLE #k;
END
UPDATE K_MONSTER SET sItem = 32601 WHERE sSid = 32601;
