SET NOCOUNT ON;
SET XACT_ABORT ON;
-- Test karakterlerini (ve test hesabinin depo/karakter kaydini) siler. client/scripts/swapTesti.mjs sonrasi calistirilir: "admin" adi kullaniciya bos kalmali.
-- Hesaplar (TB_USER) silinmez. Listeyi test hesabina gore duzenleyin; kullanicinin hesabi (admin) ve karakterleri bu betige girmez.
BEGIN TRAN;
IF EXISTS (SELECT 1 FROM CURRENTUSER) BEGIN THROW 50001, 'Cevrimici oyuncu var, islem iptal', 1; END
DECLARE @karakter TABLE (ad varchar(21));
INSERT INTO @karakter VALUES ('KoTestA'), ('KoGm'), ('KoObs'); -- DIKKAT: kullanicinin karakterleri (admin, kingces...) bu listeye ASLA yazilmaz
DECLARE @hesap TABLE (ad varchar(21));
INSERT INTO @hesap VALUES ('kotest'), ('kotest2');

DELETE FROM DAILY_RANK WHERE StrUserID IN (SELECT ad FROM @karakter);
DELETE FROM GAME_MASTER_SETTINGS WHERE strCharID IN (SELECT ad FROM @karakter);
DELETE FROM QUEST_SKILLS_CLOSED_DATA WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM USER_ACHIEVE_DATA WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM USER_DAILY_OP WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM USER_DAILY_QUEST WHERE strCharID IN (SELECT ad FROM @karakter);
DELETE FROM USER_GENIE_DATA WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM USER_KNIGHTDATA WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM USER_PERKS WHERE StrUserID IN (SELECT ad FROM @karakter);
DELETE FROM USER_QUEST_DATA WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM USER_RETURN_DATA WHERE strCharID IN (SELECT ad FROM @karakter);
DELETE FROM USER_SAVED_MAGIC WHERE strCharID IN (SELECT ad FROM @karakter);
DELETE FROM USER_SEAL_EXP WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM USERDATA_SKILLSHORTCUT WHERE strCharID IN (SELECT ad FROM @karakter);
DELETE FROM MAIL_BOX WHERE strRecipientID IN (SELECT ad FROM @karakter);
DELETE FROM USERDATA WHERE strUserID IN (SELECT ad FROM @karakter);
DELETE FROM ACCOUNT_CHAR WHERE strAccountID IN (SELECT ad FROM @hesap);
DELETE FROM WAREHOUSE WHERE strAccountID IN (SELECT ad FROM @hesap);
DELETE FROM VIP_WAREHOUSE WHERE strAccountID IN (SELECT ad FROM @hesap);
-- Klan uye sayisi gercek uye sayisina esitlenir (otomatik katilim her karakterde +1 ekler)
UPDATE k SET Members = (SELECT COUNT(*) FROM USER_KNIGHTDATA d WHERE d.sClanID = k.IDNum) FROM KNIGHTS k;
COMMIT TRAN;
