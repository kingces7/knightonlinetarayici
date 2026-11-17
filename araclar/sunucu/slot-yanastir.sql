SET NOCOUNT ON;
-- Moradon canavar slotlarının doğuş alanı (iRange) özgün değerin %85'ine indirilir: aynı slottaki canavarlar %15 daha yakın doğar.
-- Özgün değerler K_NPCPOS1098_ARALIK_YEDEK tablosunda saklanır; betik tekrar çalıştırılsa da hep özgün değerden hesaplanır.
IF OBJECT_ID('K_NPCPOS1098_ARALIK_YEDEK') IS NULL
  SELECT ID, iRange INTO K_NPCPOS1098_ARALIK_YEDEK FROM K_NPCPOS1098 WHERE ZoneID = 21;
UPDATE p SET iRange = CASE WHEN y.iRange <= 1 THEN y.iRange ELSE CAST(ROUND(y.iRange * 0.85, 0) AS tinyint) END
FROM K_NPCPOS1098 p JOIN K_NPCPOS1098_ARALIK_YEDEK y ON y.ID = p.ID WHERE p.ZoneID = 21;
