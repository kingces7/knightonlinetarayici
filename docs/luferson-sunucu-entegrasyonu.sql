-- ============================================================================
-- Luferson Haritası Sunucu Entegrasyonu
-- ============================================================================

-- 1. Luferson Haritasını ZONE tablosuna ekle
-- (Zone ID = 16, Moradon = 15 olduğu varsayılarak)
INSERT INTO ZONE (ZoneID, ZoneName, MinX, MaxX, MinZ, MaxZ, XSize, ZSize) VALUES
(16, 'Luferson', 0, 2048, 0, 2048, 2048, 2048);

-- 2. Luferson NPC'lerini ekle (SNpc tablosuna spawn noktalarıyla)
-- Safety Zone Gates (Işınlanma Noktaları)
INSERT INTO SNpc (ZoneID, NpcID, PosX, PosZ, PosY, Direction) VALUES
(16, 551, 600, 1561, 0, 0),   -- Safety Zone Gate - Karus
(16, 551, 578, 1602, 0, 0),   -- Safety Zone Gate - Karus
(16, 551, 532, 1502, 0, 0);   -- Safety Zone Gate - El Morad

-- Monuments (Anıtlar)
INSERT INTO SNpc (ZoneID, NpcID, PosX, PosZ, PosY, Direction) VALUES
(16, 20301, 353, 1739, 0, 0),   -- Luferson Monument
(16, 20302, 1726, 816, 0, 0),   -- Linate Monument
(16, 20303, 399, 685, 0, 0),    -- Bellua Monument
(16, 20304, 1012, 919, 0, 0),   -- Laon Camp Monument
(16, 20305, 1843, 151, 0, 0);   -- Laon Camp Gate

-- NPCs (Merchants, Priests, etc.)
INSERT INTO SNpc (ZoneID, NpcID, PosX, PosZ, PosY, Direction) VALUES
(16, 21610, 352, 1746, 0, 0),   -- Knight Clerk - Delaga
(16, 21810, 377, 1680, 0, 0),   -- Great Priest - Murka (Luferson)
(16, 21810, 435, 693, 0, 0),    -- Great Priest - Murka (Linate)
(16, 21810, 1761, 789, 0, 0),   -- Great Priest - Murka (Bellua)
(16, 22000, 368, 1688, 0, 0),   -- InnHost - Galid (Luferson)
(16, 22000, 435, 688, 0, 0),    -- InnHost - Galid (Linate)
(16, 22000, 1752, 776, 0, 0),   -- InnHost - Galid (Bellua)
(16, 22100, 425, 1620, 0, 0),   -- Armor Merchant - Cubense (Luferson)
(16, 22100, 379, 649, 0, 0),    -- Armor Merchant - Cubense (Linate)
(16, 22100, 1744, 845, 0, 0),   -- Armor Merchant - Cubense (Bellua)
(16, 22200, 413, 1632, 0, 0),   -- Weapon Merchant - Mori (Luferson)
(16, 22200, 361, 673, 0, 0),    -- Weapon Merchant - Mori (Linate)
(16, 22200, 1752, 816, 0, 0),   -- Weapon Merchant - Mori (Bellua)
(16, 22202, 472, 1667, 0, 0),   -- Healing Potions - Shama (Luferson)
(16, 22202, 365, 712, 0, 0),    -- Healing Potions - Shama (Linate)
(16, 22202, 1705, 836, 0, 0),   -- Healing Potions - Shama (Bellua)
(16, 22208, 433, 671, 0, 0),    -- Sundries - Veron (Linate)
(16, 22208, 1702, 780, 0, 0),   -- Sundries - Veron (Bellua)
(16, 22208, 451, 1687, 0, 0),   -- Sundries - Veron (Luferson)
(16, 22208, 1025, 906, 0, 0),   -- Sundries - Veron (Laon Camp)
(16, 24201, 391, 1738, 0, 0),   -- Warrior Master - Skaki
(16, 24202, 431, 709, 0, 0),    -- Secret Agent - Clarence
(16, 24203, 1695, 806, 0, 0),   -- Archmage - Drake
(16, 24204, 384, 1744, 0, 0),   -- Priest - Minerva
(16, 24404, 317, 1780, 0, 0),   -- Election Official - Roben
(16, 24405, 310, 1774, 0, 0),   -- Grand Chamberlain - Rina
(16, 25267, 436, 1603, 0, 0),   -- Draki Rift
(16, 26031, 401, 1737, 0, 0);   -- Mantle - Habice

-- ============================================================================
-- 3. İŞINLANMA KAPISINIZIN (Portal NPC) Moradon'a eklenmesi
-- ============================================================================
-- NOT: Moradon (Zone ID = 15) Safety Zone'da her iki ırkın da erişebileceği yerlere
-- ışınlanma kapısı eklenecek.

-- Karus Tarafı Işınlanma Kapısı (Moradon Safety Zone)
INSERT INTO SNpc (ZoneID, NpcID, PosX, PosZ, PosY, Direction, Event) VALUES
(15, 25267, 320, 1750, 0, 0, 1);  -- Draki Rift (Luferson Portal) - Karus

-- El Morad Tarafı Işınlanma Kapısı (Moradon Safety Zone)
INSERT INTO SNpc (ZoneID, NpcID, PosX, PosZ, PosY, Direction, Event) VALUES
(15, 25267, 220, 1750, 0, 0, 1);  -- Draki Rift (Luferson Portal) - El Morad

-- ============================================================================
-- 4. Portal İşletme Mekanizması (Quest Tablosu)
-- ============================================================================
-- Çift tıklandığında harita geçişini sağlayan mekanik
-- NPC ID = 25267 (Draki Rift) olacak
-- Quest/Event: Luferson haritasına ışınla

-- NOT: Bu tablo Myko sunucusunun yapısına göre güncellenmeli
-- INSERT INTO QUEST_MONSTER (QuestID, MonsterID) VALUES
-- (Luferson Portal ID, 25267);

-- ============================================================================
-- 5. Portal Görünüş ve İnteraksiyon
-- ============================================================================
-- Bilgiler:
-- - NPC Type: 25267 (Draki Rift - mavi bir portal görünüşü)
-- - Sol tık: NPC seçilir (mavi çerçeve)
-- - Sağ tık: "Luferson Castle" menüsü açılır
-- - Çift tık: Luferson haritasına ışınlanır (Zone ID = 16)
-- - Hedef konum: (600, 1561) - Luferson Safety Zone

-- ============================================================================
-- NOTLAR:
-- ============================================================================
-- 1. Zone ID 16 = Luferson (varsayılan)
-- 2. Zone ID 15 = Moradon
-- 3. NPC ID 25267 = Draki Rift (Portal)
-- 4. Portal UI: Oyunun "Draki Rift" texture paketini kullan
-- 5. İstenirse "Luferson Castle" menüsünün UI'ı yapılandırılabilir
-- 6. Portal konumları: Moradon Safety Zone'da Karus (320, 1750) ve El Morad (220, 1750)
