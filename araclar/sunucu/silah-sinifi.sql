SET NOCOUNT ON;
-- Silahlar sınıfa özel olur: her silah yalnız kendi sınıf grubunun karakterlerince giyilir (sunucu ItemClassAvailable, ITEM.Class). GM kısıtsızdır.
-- Eşleme (yalnız Class = 0 olan satırlar): hançer 11, yay 70, tatar yayı 71 = Rogue (2); kılıç 21/22, balta 31/32, gürz 41/42, mızrak 51/52 = Warrior (1); asa 110 = Mage (3); Priest topuzu 181 = Priest (4).
-- Zırhlar zaten sınıf kısıtlı (210 Warrior, 220 Rogue, 230 Mage, 240 Priest). Kalkan (60) ve takılar (91-94) herkese açık kalır. Yedek: ITEM_SINIF_YEDEK_20261120.
IF OBJECT_ID('ITEM_SINIF_YEDEK_20261120') IS NULL SELECT Num, Class INTO ITEM_SINIF_YEDEK_20261120 FROM ITEM WHERE Class = 0 AND Kind IN (11,21,22,31,32,41,42,51,52,70,71,110,181);
UPDATE ITEM SET Class = CASE Kind WHEN 11 THEN 2 WHEN 70 THEN 2 WHEN 71 THEN 2 WHEN 110 THEN 3 WHEN 181 THEN 4 ELSE 1 END
WHERE Class = 0 AND Kind IN (11,21,22,31,32,41,42,51,52,70,71,110,181);
SELECT Kind, Class, COUNT(*) n FROM ITEM WHERE Kind IN (11,21,22,31,32,41,42,51,52,70,71,110,181) AND LEN(ISNULL(strName,'')) > 0 GROUP BY Kind, Class ORDER BY Kind, Class;
