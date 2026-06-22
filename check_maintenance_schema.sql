-- Diagnostic script to check MaintenanceRequestRegisters table schema
-- Run this on the server database to identify schema issues

USE GofaDb;
GO

PRINT '========================================';
PRINT 'CHECKING MaintenanceRequestRegisters TABLE';
PRINT '========================================';
PRINT '';

-- Check if table exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MaintenanceRequestRegisters')
BEGIN
    PRINT '✓ Table MaintenanceRequestRegisters exists';
    PRINT '';
    
    -- Show all columns
    PRINT 'Current columns in MaintenanceRequestRegisters:';
    PRINT '------------------------------------------------';
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MaintenanceRequestRegisters'
    ORDER BY ORDINAL_POSITION;
    PRINT '';
    
    -- Check for missing columns that might be required
    PRINT 'Checking for potentially missing columns:';
    PRINT '------------------------------------------------';
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'TechnicianName')
        PRINT '✗ MISSING: TechnicianName column';
    ELSE
        PRINT '✓ TechnicianName column exists';
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'TechnicianAssignedDate')
        PRINT '✗ MISSING: TechnicianAssignedDate column';
    ELSE
        PRINT '✓ TechnicianAssignedDate column exists';
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'CompletedDate')
        PRINT '✗ MISSING: CompletedDate column';
    ELSE
        PRINT '✓ CompletedDate column exists';
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'Feedback')
        PRINT '✗ MISSING: Feedback column';
    ELSE
        PRINT '✓ Feedback column exists';
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'FeedbackDate')
        PRINT '✗ MISSING: FeedbackDate column';
    ELSE
        PRINT '✓ FeedbackDate column exists';
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'FeedbackBy')
        PRINT '✗ MISSING: FeedbackBy column';
    ELSE
        PRINT '✓ FeedbackBy column exists';
    
    PRINT '';
    
    -- Check for NULL values in critical columns
    PRINT 'Checking for NULL values in critical columns:';
    PRINT '------------------------------------------------';
    
    DECLARE @nullCount INT;
    
    -- Check each critical column for NULLs
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'LetterId')
    BEGIN
        SELECT @nullCount = COUNT(*) FROM MaintenanceRequestRegisters WHERE LetterId IS NULL;
        IF @nullCount > 0
            PRINT '✗ WARNING: ' + CAST(@nullCount AS VARCHAR) + ' rows have NULL LetterId';
        ELSE
            PRINT '✓ No NULL values in LetterId';
    END
    
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'EquipmentTypeId')
    BEGIN
        SELECT @nullCount = COUNT(*) FROM MaintenanceRequestRegisters WHERE EquipmentTypeId IS NULL;
        IF @nullCount > 0
            PRINT '✗ WARNING: ' + CAST(@nullCount AS VARCHAR) + ' rows have NULL EquipmentTypeId';
        ELSE
            PRINT '✓ No NULL values in EquipmentTypeId';
    END
    
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'RequestedBy')
    BEGIN
        SELECT @nullCount = COUNT(*) FROM MaintenanceRequestRegisters WHERE RequestedBy IS NULL;
        IF @nullCount > 0
            PRINT '✗ WARNING: ' + CAST(@nullCount AS VARCHAR) + ' rows have NULL RequestedBy';
        ELSE
            PRINT '✓ No NULL values in RequestedBy';
    END
    
    PRINT '';
    
    -- Show row count
    DECLARE @rowCount INT;
    SELECT @rowCount = COUNT(*) FROM MaintenanceRequestRegisters;
    PRINT 'Total rows in table: ' + CAST(@rowCount AS VARCHAR);
    PRINT '';
    
    -- Show sample data (first 5 rows)
    PRINT 'Sample data (first 5 rows):';
    PRINT '------------------------------------------------';
    SELECT TOP 5 * FROM MaintenanceRequestRegisters ORDER BY MaintenanceRequestRegisterId DESC;
    
END
ELSE
BEGIN
    PRINT '✗ ERROR: Table MaintenanceRequestRegisters does not exist!';
END

PRINT '';
PRINT '========================================';
PRINT 'DIAGNOSTIC COMPLETE';
PRINT '========================================';
GO
