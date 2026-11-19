SET NOCOUNT ON;
-- Kullanici karari (2026-11-19): her yeni karakter 0 coin ve hic esya olmadan baslar.
-- Esyalar: CREATE_NEW_CHAR_SET'te (sinif basina baslangic esyalari) zaten hicbir satir esya icermiyor; LETTER_GIFT (baslangic posta hediyeleri) bos. Bu betik ikisini de garantiler.
-- Coin: CREATE_NEW_CHAR_VALUE.Gold (25 sinif satiri, eskiden 50000) sifirlanir. Yedek: CREATE_NEW_CHAR_VALUE_YEDEK_20261119.
IF OBJECT_ID('CREATE_NEW_CHAR_VALUE_YEDEK_20261119') IS NULL SELECT * INTO CREATE_NEW_CHAR_VALUE_YEDEK_20261119 FROM CREATE_NEW_CHAR_VALUE;
IF OBJECT_ID('CREATE_NEW_CHAR_SET_YEDEK_20261119') IS NULL SELECT * INTO CREATE_NEW_CHAR_SET_YEDEK_20261119 FROM CREATE_NEW_CHAR_SET;
UPDATE CREATE_NEW_CHAR_VALUE SET Gold = 0;
UPDATE CREATE_NEW_CHAR_SET SET ItemID = 0, ItemCount = 0, ItemDuration = 0, ItemFlag = 0, ItemExpireTime = 0;
UPDATE LETTER_GIFT SET SendingStatus = 0 WHERE SendingStatus <> 0;
