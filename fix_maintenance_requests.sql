-- Fix MaintenanceRequestRegisters table issues
-- Run this on the server database after running check_maintenance_schema.sql

USE GofaDb;
GO

PRINT '========================================';
PRINT 'FIXING MaintenanceRequestRegisters TABLE';
PRINT '========================================';
PRINT '';

-- Add missing columns if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'TechnicianName')
BEGIN
    PRINT 'Adding TechnicianName column...';
    ALTER TABLE MaintenanceRequestRegisters ADD TechnicianName NVARCHAR(MAX) NULL;
    PRINT '✓ TechnicianName column added';
END
ELSE
    PRINT '✓ TechnicianName column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'TechnicianAssignedDate')
BEGIN
    PRINT 'Adding TechnicianAssignedDate column...';
    ALTER TABLE MaintenanceRequestRegisters ADD TechnicianAssignedDate DATETIME2 NULL;
    PRINT '✓ TechnicianAssignedDate column added';
END
ELSE
    PRINT '✓ TechnicianAssignedDate column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'CompletedDate')
BEGIN
    PRINT 'Adding CompletedDate column...';
    ALTER TABLE MaintenanceRequestRegisters ADD CompletedDate DATETIME2 NULL;
    PRINT '✓ CompletedDate column added';
END
ELSE
    PRINT '✓ CompletedDate column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'Feedback')
BEGIN
    PRINT 'Adding Feedback column...';
    ALTER TABLE MaintenanceRequestRegisters ADD Feedback NVARCHAR(MAX) NULL;
    PRINT '✓ Feedback column added';
END
ELSE
    PRINT '✓ Feedback column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'FeedbackDate')
BEGIN
    PRINT 'Adding FeedbackDate column...';
    ALTER TABLE MaintenanceRequestRegisters ADD FeedbackDate DATETIME2 NULL;
    PRINT '✓ FeedbackDate column added';
END
ELSE
    PRINT '✓ FeedbackDate column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceRequestRegisters') AND name = 'FeedbackBy')
BEGIN
    PRINT 'Adding FeedbackBy column...';
    ALTER TABLE MaintenanceRequestRegisters ADD FeedbackBy NVARCHAR(MAX) NULL;
    PRINT '✓ FeedbackBy column added';
END
ELSE
    PRINT '✓ FeedbackBy column already exists';

PRINT '';
PRINT 'Fixing NULL values in critical columns...';
PRINT '------------------------------------------------';

-- Fix NULL values in critical columns
DECLARE @updatedRows INT;

-- Fix RequestedBy
UPDATE MaintenanceRequestRegisters
SET RequestedBy = 'Unknown User'
WHERE RequestedBy IS NULL;
SET @updatedRows = @@ROWCOUNT;
IF @updatedRows > 0
    PRINT '✓ Fixed ' + CAST(@updatedRows AS VARCHAR) + ' NULL RequestedBy values';

-- Fix SerialNoOfEquip
UPDATE MaintenanceRequestRegisters
SET SerialNoOfEquip = 'N/A'
WHERE SerialNoOfEquip IS NULL;
SET @updatedRows = @@ROWCOUNT;
IF @updatedRows > 0
    PRINT '✓ Fixed ' + CAST(@updatedRows AS VARCHAR) + ' NULL SerialNoOfEquip values';

-- Fix BriefDescriptionOfWork
UPDATE MaintenanceRequestRegisters
SET BriefDescriptionOfWork = 'No description provided'
WHERE BriefDescriptionOfWork IS NULL;
SET @updatedRows = @@ROWCOUNT;
IF @updatedRows > 0
    PRINT '✓ Fixed ' + CAST(@updatedRows AS VARCHAR) + ' NULL BriefDescriptionOfWork values';

-- Fix DateWorkOrderReceived
UPDATE MaintenanceRequestRegisters
SET DateWorkOrderReceived = GETDATE()
WHERE DateWorkOrderReceived IS NULL;
SET @updatedRows = @@ROWCOUNT;
IF @updatedRows > 0
    PRINT '✓ Fixed ' + CAST(@updatedRows AS VARCHAR) + ' NULL DateWorkOrderReceived values';

-- Fix CurrentHandler
UPDATE MaintenanceRequestRegisters
SET CurrentHandler = 'PPC'
WHERE CurrentHandler IS NULL;
SET @updatedRows = @@ROWCOUNT;
IF @updatedRows > 0
    PRINT '✓ Fixed ' + CAST(@updatedRows AS VARCHAR) + ' NULL CurrentHandler values';

-- Fix StatusStage
UPDATE MaintenanceRequestRegisters
SET StatusStage = 'POWER'
WHERE StatusStage IS NULL;
SET @updatedRows = @@ROWCOUNT;
IF @updatedRows > 0
    PRINT '✓ Fixed ' + CAST(@updatedRows AS VARCHAR) + ' NULL StatusStage values';

PRINT '';
PRINT '========================================';
PRINT 'FIX COMPLETE';
PRINT '========================================';
PRINT '';

-- Verify the fixes
PRINT 'Verification - Current table status:';
PRINT '------------------------------------------------';
SELECT 
    COUNT(*) AS TotalRequests,
    SUM(CASE WHEN CurrentHandler = 'PPC' THEN 1 ELSE 0 END) AS PPCCount,
    SUM(CASE WHEN StatusStage = 'POWER' THEN 1 ELSE 0 END) AS PowerCount,
    SUM(CASE WHEN StatusStage = 'VHF_RADIO' THEN 1 ELSE 0 END) AS VHFCount,
    SUM(CASE WHEN StatusStage = 'HF_RADIO' THEN 1 ELSE 0 END) AS HFCount,
    SUM(CASE WHEN StatusStage = 'OFFICE_MACHINE' THEN 1 ELSE 0 END) AS OfficeMachineCount
FROM MaintenanceRequestRegisters;

PRINT '';
PRINT 'After running this script:';
PRINT '1. Restart the backend server';
PRINT '2. Test the "Registered Maintenance Requests" page';
PRINT '3. Check the backend logs if issues persist';
GO
