SET NOCOUNT ON;
SET XACT_ABORT ON;
-- Kullanici karari (2026-11-19): oyundaki bütün hesap ve karakter kayitlari silinir; kullanici karakterini kendisi olusturacak.
-- Silinenler: hesaplar, karakterler ve onlara bagli bütün tablolar (esya/depo/gorev/arkadas/klan uyeligi/skill...). Korunanlar: oyun verisi (esya, NPC, harita, ganimet...),
-- klan tanimlari (KNIGHTS: yeni karakterler sunucunun KNIGHTS_AUTO ayariyla otomatik katilir; uye sayisi 0'a cekilir), bot havuzu, PPCARD ve gorev tablolari.
-- Geri almak icin tam veritabani yedegi: LILITH_MYKO_silme_oncesi_2026-11-19.bak (SQL Server Backup klasoru).
BEGIN TRAN;
IF EXISTS (SELECT 1 FROM CURRENTUSER) BEGIN THROW 50001, 'Cevrimici oyuncu var, islem iptal', 1; END

DELETE FROM CURRENTUSER;
DELETE FROM ACCOUNT_CHAR;
DELETE FROM ACCOUNT_PREMIUM_DATA;
DELETE FROM CHECK_ACCOUNT;
DELETE FROM TB_USER;
DELETE FROM WAREHOUSE;
DELETE FROM VIP_WAREHOUSE;
DELETE FROM WAREHOUSE_ITEMLER;
DELETE FROM WEB_ITEMMALL;
DELETE FROM MAIL_BOX;
DELETE FROM FRIEND_LIST;
DELETE FROM TRASH_ITEMLIST;
DELETE FROM SEALED_ITEMS;
DELETE FROM USER_CHARACTER_SEAL_ITEMS;
DELETE FROM USER_RENTAL_ITEM;
DELETE FROM KING_BALLOT_BOX;
DELETE FROM KING_CANDIDACY_NOTICE_BOARD;
DELETE FROM KING_NOMINATION_RESULT;
DELETE FROM DRAKI_TOWER_RIFT_RANK;
DELETE FROM DAILY_RANK;
DELETE FROM GAME_MASTER_SETTINGS;
DELETE FROM QUEST_SKILLS_CLOSED_DATA;
DELETE FROM USER_ACHIEVE_DATA;
DELETE FROM USER_DAILY_OP;
DELETE FROM USER_DAILY_QUEST;
DELETE FROM USER_DRAKI_TOWER_DATA;
DELETE FROM USER_GENIE_DATA;
DELETE FROM USER_KNIGHTDATA;
DELETE FROM USER_PERKS;
DELETE FROM USER_QUEST_DATA;
DELETE FROM USER_RETURN_DATA;
DELETE FROM USER_SAVED_MAGIC;
DELETE FROM USER_SEAL_EXP;
DELETE FROM USERDATA_SKILLSHORTCUT;
DELETE FROM USERDATA;

-- Siralama panolari: karakter/klan adlari bosaltilir (satirlar kalir, panolar yeniden dolar)
UPDATE USER_PERSONAL_RANK SET strElmoUserID = NULL, strElmoClanName = NULL, sElmoKnights = 0, nElmoUP = 0, nElmoLoyaltyMonthly = 0, strKarusUserID = NULL, strKarusClanName = NULL, sKarusKnights = 0, nKarusUP = 0, nKarusLoyaltyMonthly = 0;
UPDATE USER_KNIGHTS_RANK SET strElmoUserID = NULL, strElmoKnightsName = NULL, sElmoKnights = 0, nElmoLoyalty = 0, strKarusUserID = NULL, strKarusKnightsName = NULL, sKarusKnights = 0, nKarusLoyalty = 0;
UPDATE KNIGHTS SET Members = 0;
COMMIT TRAN;
