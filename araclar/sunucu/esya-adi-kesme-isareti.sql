SET NOCOUNT ON;
-- Kullanici karari (2026-11-19): eşya adlarında kesme işareti kodlama sırasında "??" olmuş ("Hunter??s Bow" -> "Hunter's Bow").
-- Yalnızca "harf + ?? + s" kalıbı düzeltilir (234 satır). Özgün adlar ITEM_ADI_YEDEK tablosunda saklanır (geri almak için: UPDATE ITEM SET strName = y.eski_ad ...).
IF OBJECT_ID('ITEM_ADI_YEDEK') IS NULL CREATE TABLE ITEM_ADI_YEDEK (Num int, eski_ad varchar(200), yeni_ad varchar(200), tarih datetime DEFAULT GETDATE());
BEGIN TRAN;
INSERT INTO ITEM_ADI_YEDEK (Num, eski_ad, yeni_ad)
SELECT Num, strName, REPLACE(strName, '??s', '''s') FROM ITEM WHERE strName LIKE '%[A-Za-z]??s%';
DECLARE @n int = @@ROWCOUNT;
UPDATE ITEM SET strName = REPLACE(strName, '??s', '''s') WHERE strName LIKE '%[A-Za-z]??s%';
IF @@ROWCOUNT <> @n BEGIN RAISERROR('Ad guncelleme satir sayisi yedekle uyusmuyor', 16, 1); ROLLBACK TRAN; RETURN; END
COMMIT TRAN;
