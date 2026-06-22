-- Detailed schema diagnostic script for all maintenance-related tables in GofaDb
-- This script checks the exact schema of each maintenance table against the local C# model requirements.
-- Run this on BOTH your local database and your production server database in SSMS to compare them.

USE GofaDb;
GO

PRINT '========================================================================';
PRINT '         GOFA MAINTENANCE SYSTEM - DETAILED SCHEMA DIAGNOSTIC           ';
PRINT '========================================================================';
PRINT 'Report run on: ' + CAST(GETDATE() AS VARCHAR(50));
PRINT '';

-- ------------------------------------------------------------------------
-- Helper Procedure or Block to Check Column
-- ------------------------------------------------------------------------
DECLARE @TableName NVARCHAR(100);
DECLARE @ColumnName NVARCHAR(100);
DECLARE @ExpectedType NVARCHAR(100);
DECLARE @ExpectedNull NVARCHAR(10);

-- Temporary table to hold target expectations
IF OBJECT_ID('tempdb..#ExpectedSchema') IS NOT NULL DROP TABLE #ExpectedSchema;
CREATE TABLE #ExpectedSchema (
    TableName NVARCHAR(100),
    ColumnName NVARCHAR(100),
    ExpectedType NVARCHAR(100),
    IsNullable NVARCHAR(10)
);

-- Populate Expectations based on backend models

-- 1. MaintenanceRequestRegisters
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Id', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'WorksOrderNumber', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Nomenclature', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Quantity', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RequestedBy', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'SerialNoOfEquip', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'BriefDescriptionOfWork', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'DateWorkOrderReceived', 'datetime2', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'MaintenanceType', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Model', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RequestedTo', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RepairStartDate', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RepairFinishDate', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Status', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Recommendation', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'ManHours', 'float', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'PartsCost', 'decimal', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Remark', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'GivenTo', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Approval', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RecieverRemark', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RecievedDate', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'EquipmentTypeId', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'LetterId', 'int', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'CurrentHandler', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'StatusStage', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RegisteredBy', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'RejectReason', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'UpdatedAt', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'Quality', 'int', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'MaintainedBy', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'MaintainedByUserId', 'int', 'YES');
INSERT INTO #ExpectedSchema VALUES ('MaintenanceRequestRegisters', 'TechnicianRole', 'nvarchar', 'YES');

-- 2. SparePartsRequests
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'Id', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'QuantityAsked', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'RequestedBy', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'Reason', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'StockNumber', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'RequestType', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'QuantityApproved', 'int', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'ApprovedBy', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'ApprovalDate', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'Remark', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'Status', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'CurrentStage', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'WorksOrderNumber', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'SerialNumber', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'PartCost', 'decimal', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'LabourCost', 'decimal', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'TotalCost', 'decimal', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartsRequests', 'IsUrgent', 'bit', 'NO');

-- 3. SparePartHandoverLogs
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'Id', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'StockNumber', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'Description', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'SerialNumber', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'TechnicianName', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'IsConfirmedByTechnician', 'bit', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'ConfirmedAt', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'WorksOrderNumber', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'IssuedBy', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'Remark', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'IssueDate', 'datetime2', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SparePartHandoverLogs', 'CreatedAt', 'datetime2', 'NO');

-- 4. SpecialToolRegisters
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'Id', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'ToolName', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'RecievedBy', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'Quantity', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'Description', 'nvarchar', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'RecievedDate', 'datetime2', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'GivenBy', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'ReturnDate', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'ReturnedDate', 'datetime2', 'YES');
INSERT INTO #ExpectedSchema VALUES ('SpecialToolRegisters', 'Remarks', 'nvarchar', 'YES');

-- 5. EquipmentTypes
INSERT INTO #ExpectedSchema VALUES ('EquipmentTypes', 'EquipmentTypeId', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('EquipmentTypes', 'EquipmentTypeName', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('EquipmentTypes', 'EquipmentModel', 'nvarchar', 'NO');

-- 6. Letters
INSERT INTO #ExpectedSchema VALUES ('Letters', 'LetterId', 'int', 'NO');
INSERT INTO #ExpectedSchema VALUES ('Letters', 'From', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('Letters', 'RecommendBy', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('Letters', 'Status', 'nvarchar', 'NO');
INSERT INTO #ExpectedSchema VALUES ('Letters', 'CreatedDate', 'datetime2', 'NO');

-- ------------------------------------------------------------------------
-- Phase 1: Verify Table Existence
-- ------------------------------------------------------------------------
PRINT '--- STEP 1: VERIFYING TABLE EXISTENCE ---';
DECLARE @TableToCheck NVARCHAR(100);
DECLARE TableCursor CURSOR FOR 
    SELECT DISTINCT TableName FROM #ExpectedSchema;

OPEN TableCursor;
FETCH NEXT FROM TableCursor INTO @TableToCheck;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF EXISTS (SELECT * FROM sys.tables WHERE name = @TableToCheck)
        PRINT '  [✓] Table "' + @TableToCheck + '" exists in database.';
    ELSE
        PRINT '  [✗] MISSING TABLE: "' + @TableToCheck + '" does not exist!';
        
    FETCH NEXT FROM TableCursor INTO @TableToCheck;
END;
CLOSE TableCursor;
DEALLOCATE TableCursor;
PRINT '';

-- ------------------------------------------------------------------------
-- Phase 2: Schema Column Audit
-- ------------------------------------------------------------------------
PRINT '--- STEP 2: AUDITING COLUMN METADATA ---';
PRINT 'Checking for columns that exist in the C# models but are MISSING or MISMATCHED in this database:';
PRINT '';

DECLARE @ExpectedTableName NVARCHAR(100);
DECLARE @ExpectedColumnName NVARCHAR(100);
DECLARE @ExpectedDataType NVARCHAR(100);
DECLARE @ExpectedIsNullable NVARCHAR(10);

DECLARE ColumnCursor CURSOR FOR 
    SELECT TableName, ColumnName, ExpectedType, IsNullable FROM #ExpectedSchema;

OPEN ColumnCursor;
FETCH NEXT FROM ColumnCursor INTO @ExpectedTableName, @ExpectedColumnName, @ExpectedDataType, @ExpectedIsNullable;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT * FROM sys.tables WHERE name = @ExpectedTableName)
    BEGIN
        -- Query database column properties
        DECLARE @ActualDataType NVARCHAR(100) = NULL;
        DECLARE @ActualIsNullable NVARCHAR(10) = NULL;
        
        SELECT 
            @ActualDataType = DATA_TYPE,
            @ActualIsNullable = IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @ExpectedTableName AND COLUMN_NAME = @ExpectedColumnName;
        
        IF @ActualDataType IS NULL
        BEGIN
            PRINT '  [✗] MISSING COLUMN: [' + @ExpectedTableName + '].[' + @ExpectedColumnName + '] (Expected type: ' + @ExpectedDataType + ', Nullable: ' + @ExpectedIsNullable + ')';
        END
        ELSE
        BEGIN
            -- Check for datatype mismatches (simplified checks)
            IF @ActualDataType NOT LIKE '%' + @ExpectedDataType + '%' AND @ExpectedDataType NOT LIKE '%' + @ActualDataType + '%'
            BEGIN
                PRINT '  [!] MISMATCHED TYPE: [' + @ExpectedTableName + '].[' + @ExpectedColumnName + '] is ' + @ActualDataType + ' (Expected: ' + @ExpectedDataType + ')';
            END
            
            -- Check for nullability mismatches
            IF @ActualIsNullable <> @ExpectedIsNullable
            BEGIN
                PRINT '  [!] MISMATCHED NULLABILITY: [' + @ExpectedTableName + '].[' + @ExpectedColumnName + '] is Nullable=' + @ActualIsNullable + ' (Expected: ' + @ExpectedIsNullable + ')';
            END
        END
    END
    ELSE
    BEGIN
        PRINT '  [✗] Cannot audit columns for [' + @ExpectedTableName + '] because the table is missing.';
    END

    FETCH NEXT FROM ColumnCursor INTO @ExpectedTableName, @ExpectedColumnName, @ExpectedDataType, @ExpectedIsNullable;
END;
CLOSE ColumnCursor;
DEALLOCATE ColumnCursor;
PRINT '';

-- ------------------------------------------------------------------------
-- Phase 3: Row Counts & Data Presence
-- ------------------------------------------------------------------------
PRINT '--- STEP 3: ROW COUNTS AND DATA PRESENCE ---';
PRINT 'Total rows currently stored in each maintenance table:';
PRINT '';

DECLARE @SQL NVARCHAR(MAX);
DECLARE @CountTable TABLE (TName NVARCHAR(100), RCount INT);

DECLARE TableCountCursor CURSOR FOR 
    SELECT DISTINCT TableName FROM #ExpectedSchema;

OPEN TableCountCursor;
FETCH NEXT FROM TableCountCursor INTO @TableToCheck;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF EXISTS (SELECT * FROM sys.tables WHERE name = @TableToCheck)
    BEGIN
        SET @SQL = 'SELECT ''' + @TableToCheck + ''', COUNT(*) FROM ' + QUOTENAME(@TableToCheck);
        INSERT INTO @CountTable EXEC sp_executesql @SQL;
    END
    ELSE
    BEGIN
        INSERT INTO @CountTable VALUES (@TableToCheck, -1);
    END
    FETCH NEXT FROM TableCountCursor INTO @TableToCheck;
END;
CLOSE TableCountCursor;
DEALLOCATE TableCountCursor;

SELECT 
    TName AS [Table Name],
    CASE 
        WHEN RCount = -1 THEN 'TABLE DOES NOT EXIST'
        ELSE CAST(RCount AS VARCHAR(50)) 
    END AS [Row Count]
FROM @CountTable;

PRINT '';
PRINT '========================================================================';
PRINT '                     DIAGNOSTIC AUDIT COMPLETE                          ';
PRINT '========================================================================';
GO
