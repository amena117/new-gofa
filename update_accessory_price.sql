-- SQL commands to update accessory price and currency for VHF role items
USE GofaDb;
GO

-- ============================================================================
-- Option 1: Update a SPECIFIC accessory by name and model
-- ============================================================================
-- Replace 'AccessoryName', 'ModelNumber', 100.00, and 'USD' with your values

UPDATE Accessories
SET 
    UnitPrice = 100.00,      -- Set your price here
    Currency = 'USD'         -- Set your currency here (ETB, USD, EURO, POUND, FOC)
WHERE 
    Name = 'AccessoryName'   -- Replace with actual accessory name
    AND Model = 'ModelNumber' -- Replace with actual model
    AND ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
GO

-- ============================================================================
-- Option 2: Update ALL accessories for a specific item (by item description)
-- ============================================================================
-- Replace 'ItemDescription', 100.00, and 'USD' with your values

UPDATE Accessories
SET 
    UnitPrice = 100.00,           -- Set your price here
    Currency = 'USD'              -- Set your currency here
WHERE 
    ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Description = 'ItemDescription'  -- Replace with actual item description
        AND Role = 'VHF'
    );
GO

-- ============================================================================
-- Option 3: Update a specific accessory by its ID
-- ============================================================================
-- Replace 123, 100.00, and 'USD' with your values

UPDATE Accessories
SET 
    UnitPrice = 100.00,      -- Set your price here
    Currency = 'USD'         -- Set your currency here
WHERE 
    Id = 123                 -- Replace with actual accessory ID
    AND ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
GO

-- ============================================================================
-- Option 4: View all accessories for VHF items before updating
-- ============================================================================
-- Run this first to see what accessories exist and their current prices

SELECT 
    a.Id AS AccessoryId,
    i.ItemId,
    i.Description AS ItemDescription,
    a.Name AS AccessoryName,
    a.Model AS AccessoryModel,
    a.Quantity,
    a.UnitPrice AS CurrentPrice,
    a.Currency AS CurrentCurrency,
    i.Role
FROM 
    Accessories a
    INNER JOIN Items i ON a.ItemId = i.ItemId
WHERE 
    i.Role = 'VHF'
ORDER BY 
    i.Description, a.Name;
GO

-- ============================================================================
-- Option 5: Bulk update - Set same price for ALL accessories in VHF role
-- ============================================================================
-- WARNING: This updates ALL accessories for ALL VHF items!

-- Uncomment the lines below to use this option:
/*
UPDATE Accessories
SET 
    UnitPrice = 50.00,       -- Set your price here
    Currency = 'ETB'         -- Set your currency here
WHERE 
    ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
GO
*/

-- ============================================================================
-- Option 6: Update accessories matching a pattern in the name
-- ============================================================================
-- Example: Update all accessories with 'Cable' in the name

UPDATE Accessories
SET 
    UnitPrice = 25.00,       -- Set your price here
    Currency = 'ETB'         -- Set your currency here
WHERE 
    Name LIKE '%Cable%'      -- Replace 'Cable' with your search term
    AND ItemId IN (
        SELECT ItemId 
        FROM Items 
        WHERE Role = 'VHF'
    );
GO

-- ============================================================================
-- Verify the update
-- ============================================================================
-- Run this after updating to verify the changes

SELECT 
    a.Id AS AccessoryId,
    i.Description AS ItemDescription,
    a.Name AS AccessoryName,
    a.Model AS AccessoryModel,
    a.UnitPrice,
    a.Currency,
    a.Quantity
FROM 
    Accessories a
    INNER JOIN Items i ON a.ItemId = i.ItemId
WHERE 
    i.Role = 'VHF'
    AND a.UnitPrice IS NOT NULL  -- Show only accessories with prices set
ORDER BY 
    i.Description, a.Name;
GO
