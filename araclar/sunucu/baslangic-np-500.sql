-- Yeni karakter 500 National Point (USERDATA.Loyalty) ile başlar; eski varsayılan 501'di (CREATE_NEW_CHAR Loyalty'yi USERDATA için ayrıca yazmıyor, sütun varsayılanı geçerli).
DECLARE @n sysname = (SELECT dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id WHERE dc.parent_object_id = OBJECT_ID('USERDATA') AND c.name = 'Loyalty');
IF @n IS NOT NULL EXEC('ALTER TABLE USERDATA DROP CONSTRAINT ' + @n);
ALTER TABLE USERDATA ADD CONSTRAINT DF_USERDATA_Loyalty DEFAULT 500 FOR Loyalty;
