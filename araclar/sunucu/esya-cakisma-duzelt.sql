SET NOCOUNT ON;
-- Kullanici karari (2026-11-19): ITEM'da ayni Num'u paylasan 12 farkli kaydi duzelt (kanit: docs/raporlar/2026-11-18-bugger-notlar.md).
-- Silinen satirlar ITEM_SILINEN_YEDEK tablosunda saklanir (geri alinabilir). Betik tekrar calistirilirsa bir sey yapmaz.
IF OBJECT_ID('ITEM_SILINEN_YEDEK') IS NULL SELECT * INTO ITEM_SILINEN_YEDEK FROM ITEM WHERE 1 = 0;

BEGIN TRAN;

-- 1) Staff'lar: client uzanti tablosuna gore dogru Num (Item_Ext_34: 061 = +1, 070 = +10, 071 = +11, 091 = +1, 100 = +10, 101 = +11).
--    Sunucuda +10 satirlari 060/090'a, +11 satirlari 061/091'e yazilmisti ((+1) ile cakisiyordu).
DECLARE @t TABLE (eski int, yeni int, ad varchar(20), beklenen int);
INSERT INTO @t VALUES
 (180130060, 180130070, '%(+10)%', 1), (180130090, 180130100, '%(+10)%', 1),
 (180330060, 180330070, '%(+10)%', 1), (180330090, 180330100, '%(+10)%', 1),
 (180130061, 180130071, '%(+11)%', 1), (180130091, 180130101, '%(+11)%', 1),
 (180330061, 180330071, '%(+11)%', 1), (180330091, 180330101, '%(+11)%', 1);
DECLARE @eski int, @yeni int, @ad varchar(20), @bek int, @n int;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT eski, yeni, ad, beklenen FROM @t;
OPEN c; FETCH NEXT FROM c INTO @eski, @yeni, @ad, @bek;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF EXISTS (SELECT 1 FROM ITEM WHERE Num = @yeni) BEGIN SET @n = -1; END   -- yeni Num dolu: dokunma
  ELSE BEGIN
    UPDATE ITEM SET Num = @yeni WHERE Num = @eski AND strName LIKE @ad;
    SET @n = @@ROWCOUNT;
  END
  IF @n NOT IN (0, @bek) BEGIN RAISERROR('Staff Num degisikligi beklenmeyen satir sayisi (%d -> %d)', 16, 1, @eski, @yeni); ROLLBACK TRAN; RETURN; END
  FETCH NEXT FROM c INTO @eski, @yeni, @ad, @bek;
END
CLOSE c; DEALLOCATE c;

-- 2) Silinecek (ikinci, zaten yuklenmeyen) satirlar once yedek tabloya alinir.
DECLARE @sil TABLE (aciklama varchar(60), kosul_sayisi int);
SELECT * INTO #s FROM ITEM WHERE 1 = 0;
INSERT INTO #s SELECT * FROM ITEM WHERE Num BETWEEN 330620431 AND 330620435 AND strName LIKE 'Felankor(+%';                    -- Felankor(+1..+5): "Ring of the Felankor" kalir
INSERT INTO #s SELECT * FROM ITEM WHERE Num = 910158138 AND strName LIKE 'Messenger Pendant%';                                -- Mage Pendant kalir
INSERT INTO #s SELECT * FROM ITEM WHERE Num = 159301520 AND StrB = 0 AND DexB = 28;                                            -- Lugias(+10): (+21) satirinin kopyasi; asil satir kalir
INSERT INTO #s SELECT * FROM ITEM WHERE Num = 389400000 AND Duration = 1000 AND BuyPrice = 15000;                              -- Premium Potion MP: PUS kuponu kalintisi; asil (5000 / 3.000.000) kalir
DECLARE @adet int = (SELECT COUNT(*) FROM #s);
IF @adet NOT IN (0, 8) BEGIN RAISERROR('Silinecek satir sayisi 8 olmali, %d bulundu', 16, 1, @adet); ROLLBACK TRAN; RETURN; END
INSERT INTO ITEM_SILINEN_YEDEK SELECT * FROM #s;
DELETE i FROM ITEM i WHERE Num BETWEEN 330620431 AND 330620435 AND strName LIKE 'Felankor(+%';
DELETE i FROM ITEM i WHERE Num = 910158138 AND strName LIKE 'Messenger Pendant%';
DELETE i FROM ITEM i WHERE Num = 159301520 AND StrB = 0 AND DexB = 28;
DELETE i FROM ITEM i WHERE Num = 389400000 AND Duration = 1000 AND BuyPrice = 15000;
DROP TABLE #s;

COMMIT TRAN;
SELECT 'cakisan Num kalan' AS ne, COUNT(*) AS sayi FROM (SELECT Num FROM (SELECT DISTINCT * FROM ITEM WHERE Num IS NOT NULL) d GROUP BY Num HAVING COUNT(*) > 1) x;
