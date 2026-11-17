SET NOCOUNT ON;
-- Sunucu Moradon (bölge 21) haritası: client'taki Moradon (14th_oldmoradon) ile aynı harita olan old_moradon.smd.
-- Eskiden 1098moradon_0826.smd (1024 m'lik başka bir Moradon) kullanılıyordu: ışınlanma kapıları (indeks 4013/4014) client'ta olmayan x≈800-840 noktalarındaydı,
-- bu yüzden kapı listesinden seçim sunucuda "kapıya yakın değil" diye reddediliyordu. Özgün değer YEDEK tablosunda saklanır.
IF OBJECT_ID('ZONE_INFO1098_SMD_YEDEK') IS NULL
  SELECT ZoneNo, strZoneSmdName INTO ZONE_INFO1098_SMD_YEDEK FROM ZONE_INFO1098 WHERE ZoneNo = 21;
UPDATE ZONE_INFO1098 SET strZoneSmdName = 'old_moradon.smd' WHERE ZoneNo = 21;
