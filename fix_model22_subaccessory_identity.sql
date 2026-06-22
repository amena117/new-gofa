-- Fix Model22ItemSubAccessories table to have IDENTITY on primary key
-- Run this on the server database

USE GofaDb;
GO

-- Check if the table exists and if the column is IDENTITY
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Model22ItemSubAccessories')
BEGIN
    -- Check if Model22ItemSubAccessoryId is already IDENTITY
    IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('Model22ItemSubAccessories') 
        AND name = 'Model22ItemSubAccessoryId' 
        AND is_identity = 1
    )
    BEGIN
        PRINT 'Fixing Model22ItemSubAccessoryId to be IDENTITY...';
        
        -- Step 1: Drop foreign key constraints referencing this table
        DECLARE @sql NVARCHAR(MAX) = '';
        SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
                      ' DROP CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(13)
        FROM sys.foreign_keys
        WHERE referenced_object_id = OBJECT_ID('Model22ItemSubAccessories');
        
        IF @sql <> ''
        BEGIN
            PRINT 'Dropping foreign key constraints...';
            EXEC sp_executesql @sql;
        END
        
        -- Step 2: Create a temporary table with IDENTITY
        IF OBJECT_ID('Model22ItemSubAccessories_Temp', 'U') IS NOT NULL
            DROP TABLE Model22ItemSubAccessories_Temp;
        
        CREATE TABLE Model22ItemSubAccessories_Temp (
            Model22ItemSubAccessoryId INT IDENTITY(1,1) PRIMARY KEY,
            Model22ItemAccessoryId INT NOT NULL,
            SubAccessoryId INT NOT NULL,
            Name NVARCHAR(MAX) NOT NULL,
            Quantity INT NOT NULL,
            UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
            Currency NVARCHAR(10) NOT NULL DEFAULT 'ETB'
        );
        
        -- Step 3: Copy data from old table to new table
        IF EXISTS (SELECT * FROM Model22ItemSubAccessories)
        BEGIN
            PRINT 'Copying existing data...';
            SET IDENTITY_INSERT Model22ItemSubAccessories_Temp ON;
            
            INSERT INTO Model22ItemSubAccessories_Temp (
                Model22ItemSubAccessoryId, Model22ItemAccessoryId, SubAccessoryId, 
                Name, Quantity, UnitPrice, Currency
            )
            SELECT 
                Model22ItemSubAccessoryId, Model22ItemAccessoryId, SubAccessoryId, 
                Name, Quantity, UnitPrice, Currency
            FROM Model22ItemSubAccessories;
            
            SET IDENTITY_INSERT Model22ItemSubAccessories_Temp OFF;
        END
        
        -- Step 4: Drop old table
        DROP TABLE Model22ItemSubAccessories;
        
        -- Step 5: Rename temp table to original name
        EXEC sp_rename 'Model22ItemSubAccessories_Temp', 'Model22ItemSubAccessories';
        
        -- Step 6: Recreate foreign key constraint to Model22ItemAccessories
        ALTER TABLE Model22ItemSubAccessories
        ADD CONSTRAINT FK_Model22ItemSubAccessories_Model22ItemAccessories
        FOREIGN KEY (Model22ItemAccessoryId) REFERENCES Model22ItemAccessories(Model22ItemAccessoryId)
        ON DELETE CASCADE;
        
        PRINT 'Model22ItemSubAccessoryId is now configured as IDENTITY.';
    END
    ELSE
    BEGIN
        PRINT 'Model22ItemSubAccessoryId is already configured as IDENTITY. No changes needed.';
    END
END
ELSE
BEGIN
    PRINT 'Table Model22ItemSubAccessories does not exist. It will be created by EF Core migrations.';
END
GO
