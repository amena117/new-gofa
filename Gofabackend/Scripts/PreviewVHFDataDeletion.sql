-- ============================================
-- Preview Script: Shows what will be deleted
-- ============================================
-- Run this FIRST to see what data will be affected
-- This script is READ-ONLY and won't delete anything
-- ============================================

PRINT '============================================';
PRINT 'VHF Data Deletion Preview';
PRINT '============================================';
PRINT '';

-- Count VHF Items
DECLARE @ItemCount INT;
SELECT @ItemCount = COUNT(*) FROM Items WHERE Role = 'VHF';
PRINT 'Items (VHF): ' + CAST(@ItemCount AS VARCHAR(10));

-- Count VHF Item Serial Numbers
DECLARE @SerialCount INT;
SELECT @SerialCount = COUNT(*) 
FROM ItemSerialNumbers 
WHERE ItemId IN (SELECT ItemId FROM Items WHERE Role = 'VHF');
PRINT 'Item Serial Numbers: ' + CAST(@SerialCount AS VARCHAR(10));

-- Count VHF Accessories
DECLARE @AccessoryCount INT;
SELECT @AccessoryCount = COUNT(*) 
FROM Accessories 
WHERE ItemId IN (SELECT ItemId FROM Items WHERE Role = 'VHF');
PRINT 'Accessories: ' + CAST(@AccessoryCount AS VARCHAR(10));

-- Count VHF Accessory Serial Numbers
DECLARE @AccSerialCount INT;
SELECT @AccSerialCount = COUNT(*) 
FROM AccessorySerialNumbers 
WHERE AccessoryId IN (
    SELECT a.Id FROM Accessories a
    INNER JOIN Items i ON a.ItemId = i.ItemId
    WHERE i.Role = 'VHF'
);
PRINT 'Accessory Serial Numbers: ' + CAST(@AccSerialCount AS VARCHAR(10));

-- Count VHF Transaction Entries
DECLARE @TransactionCount INT;
SELECT @TransactionCount = COUNT(*) 
FROM TransactionEntries 
WHERE ItemId IN (SELECT ItemId FROM Items WHERE Role = 'VHF');
PRINT 'Transaction Entries: ' + CAST(@TransactionCount AS VARCHAR(10));

-- Count VHF Model22s
DECLARE @Model22Count INT;
SELECT @Model22Count = COUNT(*) FROM Model22s WHERE Role = 'VHF';
PRINT 'Model22 Records: ' + CAST(@Model22Count AS VARCHAR(10));

-- Count VHF Model22Items
DECLARE @Model22ItemCount INT;
SELECT @Model22ItemCount = COUNT(*) 
FROM Model22Items 
WHERE Model22Id IN (SELECT Model22Id FROM Model22s WHERE Role = 'VHF');
PRINT 'Model22 Items: ' + CAST(@Model22ItemCount AS VARCHAR(10));

-- Count VHF Model22ItemAccessories
DECLARE @Model22AccCount INT;
SELECT @Model22AccCount = COUNT(*) 
FROM Model22ItemAccessories 
WHERE Model22ItemId IN (
    SELECT mi.Model22ItemId FROM Model22Items mi
    INNER JOIN Model22s m ON mi.Model22Id = m.Model22Id
    WHERE m.Role = 'VHF'
);
PRINT 'Model22 Item Accessories: ' + CAST(@Model22AccCount AS VARCHAR(10));

-- Count VHF Item Units
DECLARE @UnitCount INT;
SELECT @UnitCount = COUNT(*) 
FROM ItemUnits 
WHERE ItemId IN (SELECT ItemId FROM Items WHERE Role = 'VHF');
PRINT 'Item Units: ' + CAST(@UnitCount AS VARCHAR(10));

-- Count VHF Item Edit Histories
DECLARE @HistoryCount INT;
SELECT @HistoryCount = COUNT(*) 
FROM ItemEditHistories 
WHERE ItemId IN (SELECT ItemId FROM Items WHERE Role = 'VHF');
PRINT 'Item Edit Histories: ' + CAST(@HistoryCount AS VARCHAR(10));

PRINT '';
PRINT '============================================';
PRINT 'Sample VHF Items (First 10):';
PRINT '============================================';
SELECT TOP 10 
    ItemId, 
    Description, 
    Model, 
    Quantity, 
    Category,
    RegistrationDate
FROM Items 
WHERE Role = 'VHF'
ORDER BY ItemId;

PRINT '';
PRINT '============================================';
PRINT 'Sample VHF Model22s (First 10):';
PRINT '============================================';
SELECT TOP 10 
    Model22Id, 
    VoucherNumber, 
    Department, 
    RecipientName,
    EthiopianDate
FROM Model22s 
WHERE Role = 'VHF'
ORDER BY Model22Id;

PRINT '';
PRINT '============================================';
PRINT 'TOTAL RECORDS TO BE DELETED:';
DECLARE @TotalCount INT;
SET @TotalCount = @ItemCount + @SerialCount + @AccessoryCount + @AccSerialCount + 
                  @TransactionCount + @Model22Count + @Model22ItemCount + 
                  @Model22AccCount + @UnitCount + @HistoryCount;
PRINT CAST(@TotalCount AS VARCHAR(10)) + ' records';
PRINT '============================================';
PRINT '';
PRINT 'If you want to proceed with deletion, run: DeleteVHFData.sql';
PRINT '============================================';
