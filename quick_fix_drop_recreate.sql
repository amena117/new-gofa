-- Quick fix: Drop and recreate Model22ItemSubAccessories table
-- WARNING: This will delete all data in Model22ItemSubAccessories table
-- Only use if you don't have important data in this table on the server

USE GofaDb;
GO

-- Drop the table if it exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Model22ItemSubAccessories')
BEGIN
    PRINT 'Dropping Model22ItemSubAccessories table...';
    DROP TABLE Model22ItemSubAccessories;
    PRINT 'Table dropped.';
END
GO

-- Recreate with proper IDENTITY configuration
CREATE TABLE Model22ItemSubAccessories (
    Model22ItemSubAccessoryId INT IDENTITY(1,1) PRIMARY KEY,
    Model22ItemAccessoryId INT NOT NULL,
    SubAccessoryId INT NOT NULL,
    Name NVARCHAR(MAX) NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    Currency NVARCHAR(10) NOT NULL DEFAULT 'ETB',
    
    CONSTRAINT FK_Model22ItemSubAccessories_Model22ItemAccessories
        FOREIGN KEY (Model22ItemAccessoryId) 
        REFERENCES Model22ItemAccessories(Model22ItemAccessoryId)
        ON DELETE CASCADE
);
GO

PRINT 'Model22ItemSubAccessories table recreated with IDENTITY column.';
GO
