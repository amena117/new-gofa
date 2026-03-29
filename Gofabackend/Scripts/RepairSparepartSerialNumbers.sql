-- Script to repair SPAREPART items that lost their serial numbers due to withdrawals
-- This should be run after deploying the backend fix

-- Step 1: Identify SPAREPART items with quantity > 0 but no serial numbers
SELECT 
    i.ItemId,
    i.Description,
    i.Model,
    i.Quantity,
    i.Role,
    COUNT(sn.Id) as SerialCount
FROM Items i
LEFT JOIN ItemSerialNumbers sn ON i.ItemId = sn.ItemId
WHERE i.Role = 'SPAREPART' 
    AND i.Quantity > 0
GROUP BY i.ItemId, i.Description, i.Model, i.Quantity, i.Role
HAVING COUNT(sn.Id) = 0;

-- Step 2: For each broken SPAREPART item, create a generic serial number
-- This allows future withdrawals to work properly
INSERT INTO ItemSerialNumbers (SerialNumber, AddedDate, ItemId)
SELECT 
    CONCAT(i.Description, '-', i.Model, '-REPAIR-', i.ItemId) as SerialNumber,
    'ታህሳስ 13, 2017' as AddedDate, -- Current Ethiopian date
    i.ItemId
FROM Items i
LEFT JOIN ItemSerialNumbers sn ON i.ItemId = sn.ItemId
WHERE i.Role = 'SPAREPART' 
    AND i.Quantity > 0
GROUP BY i.ItemId, i.Description, i.Model, i.Quantity, i.Role
HAVING COUNT(sn.Id) = 0;

-- Step 3: Verify the repair worked
SELECT 
    i.ItemId,
    i.Description,
    i.Model,
    i.Quantity,
    i.Role,
    COUNT(sn.Id) as SerialCount,
    STRING_AGG(sn.SerialNumber, ', ') as SerialNumbers
FROM Items i
LEFT JOIN ItemSerialNumbers sn ON i.ItemId = sn.ItemId
WHERE i.Role = 'SPAREPART' 
    AND i.Quantity > 0
GROUP BY i.ItemId, i.Description, i.Model, i.Quantity, i.Role
ORDER BY i.ItemId;