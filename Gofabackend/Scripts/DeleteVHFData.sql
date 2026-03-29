-- ============================================
-- Script to Delete All VHF-Related Data
-- ============================================
-- WARNING: This will permanently delete all VHF items, accessories, and Model22 records
-- Make sure to backup your database before running this script!
-- ============================================

BEGIN TRANSACTION;

BEGIN TRY
    PRINT 'Starting VHF data deletion...';
    
    -- Step 1: Delete Model22ItemAccessories for VHF Model22Items
    PRINT 'Step 1: Deleting Model22ItemAccessories...';
    DELETE FROM Model22ItemAccessories
    WHERE Model22ItemId IN (
        SELECT mi.Model22ItemId 
        FROM Model22Items mi
        INNER JOIN Model22s m ON mi.Model22Id = m.Model22Id
        WHERE m.Role = 'VHF'
    );
    PRINT 'Model22ItemAccessories deleted.';
    
    -- Step 2: Delete Model22Items for VHF Model22s
    PRINT 'Step 2: Deleting Model22Items...';
    DELETE FROM Model22Items
    WHERE Model22Id IN (
        SELECT Model22Id 
        FROM Model22s 
        WHERE Role = 'VHF'
    );
    PRINT 'Model22Items deleted.';
    
    -- Step 3: Delete Model22s with VHF role
    PRINT 'Step 3: Deleting Model22s...';
    DELETE FROM Model22s
    WHERE Role = 'VHF';
    PRINT 'Model22s deleted.';
    
    -- Step 4: Delete TransactionEntries for VHF items
    PRINT 'Step 4: Deleting TransactionEntries...';
    DELETE FROM TransactionEntries
    WHERE ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
    PRINT 'TransactionEntries deleted.';
    
    -- Step 5: Delete AccessorySerialNumbers for VHF accessories
    PRINT 'Step 5: Deleting AccessorySerialNumbers...';
    DELETE FROM AccessorySerialNumbers
    WHERE AccessoryId IN (
        SELECT a.Id 
        FROM Accessories a
        INNER JOIN Items i ON a.ItemId = i.ItemId
        WHERE i.Role = 'VHF'
    );
    PRINT 'AccessorySerialNumbers deleted.';
    
    -- Step 6: Delete Accessories for VHF items
    PRINT 'Step 6: Deleting Accessories...';
    DELETE FROM Accessories
    WHERE ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
    PRINT 'Accessories deleted.';
    
    -- Step 7: Delete ItemSerialNumbers for VHF items
    PRINT 'Step 7: Deleting ItemSerialNumbers...';
    DELETE FROM ItemSerialNumbers
    WHERE ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
    PRINT 'ItemSerialNumbers deleted.';
    
    -- Step 8: Delete ItemUnits for VHF items
    PRINT 'Step 8: Deleting ItemUnits...';
    DELETE FROM ItemUnits
    WHERE ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
    PRINT 'ItemUnits deleted.';
    
    -- Step 9: Delete ItemEditHistories for VHF items
    PRINT 'Step 9: Deleting ItemEditHistories...';
    DELETE FROM ItemEditHistories
    WHERE ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
    PRINT 'ItemEditHistories deleted.';
    
    -- Step 10: Finally, delete VHF Items
    PRINT 'Step 10: Deleting Items...';
    DELETE FROM Items
    WHERE Role = 'VHF';
    PRINT 'Items deleted.';
    
    -- Show summary of deletions
    PRINT '';
    PRINT '============================================';
    PRINT 'VHF Data Deletion Summary:';
    PRINT '============================================';
    PRINT 'All VHF-related data has been successfully deleted.';
    PRINT '';
    PRINT 'IMPORTANT: Review the changes before committing!';
    PRINT 'To commit: COMMIT TRANSACTION;';
    PRINT 'To rollback: ROLLBACK TRANSACTION;';
    PRINT '============================================';
    
    -- Uncomment the next line to automatically commit
    -- COMMIT TRANSACTION;
    
    -- For safety, we'll leave it uncommitted so you can review
    -- You must manually run COMMIT TRANSACTION; or ROLLBACK TRANSACTION;
    
END TRY
BEGIN CATCH
    PRINT 'ERROR occurred during deletion!';
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT 'Rolling back transaction...';
    ROLLBACK TRANSACTION;
END CATCH;

-- ============================================
-- After reviewing the results, run ONE of these:
-- ============================================
-- To keep the changes:
-- COMMIT TRANSACTION;

-- To undo the changes:
-- ROLLBACK TRANSACTION;
-- ============================================
