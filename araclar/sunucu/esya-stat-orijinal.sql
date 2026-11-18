SET NOCOUNT ON;
-- Resmi 1298 veritabani (KN_online.ITEM) ile ayni numarali esyalardan stat/hasar/gecikme degeri farkli olan 152 satir (Dark Vane, Tooth, Sword of Beast serileri...) orijinal degerlere dondurulur.
-- Yedek: ITEM_STAT_YEDEK (ilk calistirmada olusur). Myko'ya ozel (resmi veritabaninda olmayan) esyalara dokunulmaz.
IF OBJECT_ID('ITEM_STAT_YEDEK') IS NULL
  SELECT m.* INTO ITEM_STAT_YEDEK FROM ITEM m JOIN KN_online.dbo.ITEM o ON o.Num = m.Num WHERE
   m.Damage<>o.Damage OR m.Delay<>o.Delay OR m.Range<>o.Range OR m.Ac<>o.Ac OR m.Hitrate<>o.Hitrate OR m.Evasionrate<>o.Evasionrate OR m.DaggerAc<>o.DaggerAc OR m.SwordAc<>o.SwordAc OR m.ClubAc<>o.MaceAc OR m.AxeAc<>o.AxeAc OR m.SpearAc<>o.SpearAc OR m.BowAc<>o.BowAc
   OR m.FireDamage<>o.FireDamage OR m.IceDamage<>o.IceDamage OR m.LightningDamage<>o.LightningDamage OR m.PoisonDamage<>o.PoisonDamage OR m.HPDrain<>o.HPDrain OR m.MPDamage<>o.MPDamage OR m.MPDrain<>o.MPDrain OR m.MirrorDamage<>o.MirrorDamage
   OR m.StrB<>o.StrB OR m.StaB<>o.StaB OR m.DexB<>o.DexB OR m.IntelB<>o.IntelB OR m.ChaB<>o.ChaB OR m.MaxHpB<>o.MaxHpB OR m.MaxMpB<>o.MaxMpB OR m.FireR<>o.FireR OR m.ColdR<>o.ColdR OR m.LightningR<>o.LightningR OR m.MagicR<>o.MagicR OR m.PoisonR<>o.PoisonR OR m.CurseR<>o.CurseR;
UPDATE m SET Damage=o.Damage, Delay=o.Delay, Range=o.Range, Ac=o.Ac, Hitrate=o.Hitrate, Evasionrate=o.Evasionrate, DaggerAc=o.DaggerAc, SwordAc=o.SwordAc, ClubAc=o.MaceAc, AxeAc=o.AxeAc, SpearAc=o.SpearAc, BowAc=o.BowAc,
  FireDamage=o.FireDamage, IceDamage=o.IceDamage, LightningDamage=o.LightningDamage, PoisonDamage=o.PoisonDamage, HPDrain=o.HPDrain, MPDamage=o.MPDamage, MPDrain=o.MPDrain, MirrorDamage=o.MirrorDamage,
  StrB=o.StrB, StaB=o.StaB, DexB=o.DexB, IntelB=o.IntelB, ChaB=o.ChaB, MaxHpB=o.MaxHpB, MaxMpB=o.MaxMpB, FireR=o.FireR, ColdR=o.ColdR, LightningR=o.LightningR, MagicR=o.MagicR, PoisonR=o.PoisonR, CurseR=o.CurseR
FROM ITEM m JOIN ITEM_STAT_YEDEK y ON y.Num = m.Num JOIN KN_online.dbo.ITEM o ON o.Num = m.Num;
-- Kekurikekukaka (32601): "Kekuri Ring" oyundaki gercek eşya 330310014'tur (Dex +8, ates/buz/simsek direnci 15; Kekurikekukaka'nin ozgun ganimeti). 810864000 ayni adli etkinlik esyasiydi.
UPDATE K_MONSTER_ITEM SET iItem05 = 330310014 WHERE sIndex = 32601 AND iItem05 = 810864000;
