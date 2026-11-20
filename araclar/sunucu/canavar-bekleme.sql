SET NOCOUNT ON;
-- Canavarlar kısa bir adım atıp K_MONSTER.sStandtime (çoğunda 3000 ms) kadar donuyordu; oyuncu bunu "bir anda durup birkaç sn sonra yürümeye başlıyor" diye görüyor.
-- Gezinen canavarların bekleme süresi 1500 ms'e indirilir (3000-5000 ms olanlar); 1000 ve 10000 ms olanlara (hızlı/yavaş özel canavarlar) dokunulmaz. Yedek: K_MONSTER_STANDTIME_YEDEK_20261120.
IF OBJECT_ID('K_MONSTER_STANDTIME_YEDEK_20261120') IS NULL SELECT sSid, sStandtime INTO K_MONSTER_STANDTIME_YEDEK_20261120 FROM K_MONSTER;
UPDATE K_MONSTER SET sStandtime = 1500 WHERE sStandtime BETWEEN 3000 AND 5000;
SELECT sStandtime, COUNT(*) n FROM K_MONSTER GROUP BY sStandtime ORDER BY sStandtime;
