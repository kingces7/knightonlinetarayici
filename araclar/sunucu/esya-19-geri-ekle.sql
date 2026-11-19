SET NOCOUNT ON;
-- Kullanici karari (2026-11-19): 43 cikarilan esyadan 19'u oyuna geri eklenir (satirlar ITEM_SILINEN_YEDEK'ten). Aurora GM dukkani ayri calistirilir (gm-dukkani.sql).
-- Kalan 24 esya cikarilmis kalir (bkz. docs/esya-cikarilan-43.csv).
BEGIN TRAN;
DECLARE @n TABLE (n int PRIMARY KEY);
INSERT INTO @n VALUES (389556000),(800386000),(810921000),(810922000),(810923000),(810924000),(814613000),(814623000),(814633000),(814643000),(900028000),(910248000),(910351000),(910451000),(910551000),(910651000),(931657000),(931766000),(999000000);
DECLARE @bulunan int = (SELECT COUNT(DISTINCT y.Num) FROM ITEM_SILINEN_YEDEK y JOIN @n ON y.Num = n);
IF @bulunan <> 19 BEGIN THROW 50001, 'Yedek tablosunda 19 esyanin hepsi yok', 1; END
INSERT INTO ITEM SELECT y.* FROM ITEM_SILINEN_YEDEK y JOIN @n ON y.Num = n WHERE NOT EXISTS (SELECT 1 FROM ITEM i WHERE i.Num = y.Num);
COMMIT TRAN;
