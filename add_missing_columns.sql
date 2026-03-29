-- Add missing columns to production database GofaDb
-- Execute these commands in SQL Server Management Studio or sqlcmd

USE GofaDb;
GO

-- 1. Add History column to TransactionEntries
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TransactionEntries') AND name = 'History')
BEGIN
    ALTER TABLE TransactionEntries ADD History nvarchar(max) NULL;
    PRINT 'Added History column to TransactionEntries';
END
ELSE
BEGIN
    PRINT 'History column already exists in TransactionEntries';
END
GO

-- 2. Add Category column to Model22Items
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Model22Items') AND name = 'Category')
BEGIN
    ALTER TABLE Model22Items ADD Category nvarchar(max) NOT NULL DEFAULT '';
    PRINT 'Added Category column to Model22Items';
END
ELSE
BEGIN
    PRINT 'Category column already exists in Model22Items';
END
GO

-- 3. Add IsAccessoryOnly column to Model22Items
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Model22Items') AND name = 'IsAccessoryOnly')
BEGIN
    ALTER TABLE Model22Items ADD IsAccessoryOnly bit NOT NULL DEFAULT 0;
    PRINT 'Added IsAccessoryOnly column to Model22Items';
END
ELSE
BEGIN
    PRINT 'IsAccessoryOnly column already exists in Model22Items';
END
GO

-- 4. Add ParentItemId column to Model22Items
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Model22Items') AND name = 'ParentItemId')
BEGIN
    ALTER TABLE Model22Items ADD ParentItemId int NULL;
    PRINT 'Added ParentItemId column to Model22Items';
END
ELSE
BEGIN
    PRINT 'ParentItemId column already exists in Model22Items';
END
GO

-- Verify the changes
SELECT 'TransactionEntries' AS TableName, COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'TransactionEntries' AND COLUMN_NAME = 'History'
UNION ALL
SELECT 'Model22Items', COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Model22Items' AND COLUMN_NAME IN ('Category', 'IsAccessoryOnly', 'ParentItemId')
ORDER BY TableName, COLUMN_NAME;
GO

PRINT 'All missing columns have been added successfully!';
