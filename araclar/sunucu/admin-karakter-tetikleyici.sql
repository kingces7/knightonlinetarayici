SET NOCOUNT ON;
-- Kullanici karari (2026-11-19): adi "admin" olan karakter HER ZAMAN tam guclu olur ("ben zittini soylemedikce"):
--   GM yetkisi (Authority = 0 + GAME_MASTER_SETTINGS'in 37 yetkisinin hepsi 1), en yuksek seviye (80 = GameServer.ini GAMEMAXLEVEL),
--   5 statin hepsi 255, usta sinif (novice/base sinif ustaya cevrilir) ve butun skill agaclari dolu (sinifin tum skill'leri acik).
-- Tam guc karakter olusurken (INSERT) ve seviye 80in altina dusunce uygulanir; GM yetkisi her kayitta korunur. (Kullanici /statsifirla ya da /skillsifirla yazarsa sifirlama kalici olur.)
-- Not: sunucu bir karakterin yalnizca KENDI sinifinin skill'lerini kullanmasina izin verir.
-- Kaldirmak (admin sade bir karakter olsun istenirse): DROP TRIGGER TR_USERDATA_YONETICI;
IF OBJECT_ID('TR_USERDATA_YONETICI', 'TR') IS NOT NULL DROP TRIGGER TR_USERDATA_YONETICI;
GO
CREATE TRIGGER TR_USERDATA_YONETICI ON USERDATA AFTER INSERT, UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM inserted WHERE LOWER(RTRIM(strUserID)) = 'admin') RETURN;

  -- GM yetkisi her zaman
  UPDATE u SET Authority = 0 FROM USERDATA u JOIN inserted i ON i.strUserID = u.strUserID WHERE LOWER(RTRIM(u.strUserID)) = 'admin' AND u.Authority <> 0;

  -- Tam guc: karakter olusurken ve seviyesi 80in altindaysa. (/statsifirla ve /skillsifirla sonrasi seviye 80 kalir, sifirlama korunur.)
  UPDATE u SET
    Authority = 0,
    Level = 80,
    Strong = 255, Sta = 255, Dex = 255, Intel = 255, Cha = 255,
    Points = 0,
    Class = CASE u.Class % 100
              WHEN 1 THEN u.Class + 5 WHEN 2 THEN u.Class + 6 WHEN 3 THEN u.Class + 7 WHEN 4 THEN u.Class + 8 WHEN 13 THEN u.Class + 2
              WHEN 5 THEN u.Class + 1 WHEN 7 THEN u.Class + 1 WHEN 9 THEN u.Class + 1 WHEN 11 THEN u.Class + 1 WHEN 14 THEN u.Class + 1
              ELSE u.Class END,
    strSkill = CAST(0x00000000005050500500 AS varchar(10))   -- bos puan 0, uc agac 80, usta puani 5
  FROM USERDATA u JOIN inserted i ON i.strUserID = u.strUserID
  WHERE LOWER(RTRIM(u.strUserID)) = 'admin'
    AND (u.Level < 80 OR NOT EXISTS (SELECT 1 FROM deleted d WHERE d.strUserID = u.strUserID));

  INSERT INTO GAME_MASTER_SETTINGS (strCharID, sMute, sUnMute, sUnBan, sBanPermit, sBanUnder, sBanDays, sBanCheating, sBanScamming, sAllowAttack, sDisabledAttack, sNpAdd, sExpAdd, sMoneyAdd, sDropAdd, sLoyaltyChange, sExpChange, sMoneyChange, sGiveItem, sGiveItemSelf, sSummonUser, sTpOnUser, sZoneChange, sLocationChange, sMonsterSummon, sNpcSummon, sMonKilled, sTeleportAllUser, sClanSummon, sResetPlayerRanking, sChangeEventRoom, sWarOpen, sWarClose, sCaptainElection, sSendPrsion, sKcChange, reloadtables, sDropTest)
  SELECT i.strUserID, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
  FROM inserted i WHERE LOWER(RTRIM(i.strUserID)) = 'admin' AND NOT EXISTS (SELECT 1 FROM GAME_MASTER_SETTINGS g WHERE g.strCharID = i.strUserID);
END
