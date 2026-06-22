-- ============================================================
-- Fix spare parts requests that were approved by team leader
-- but status was not updated due to the includes() bug.
-- These records have CurrentStage = 'MAINTENANCE_LEADER'
-- but Status is still 'Pending' or 'Pending Team Leader Approval'
-- ============================================================

USE GofaDb;
GO

-- Step 1: Update SparePartsRequests that are at MAINTENANCE_LEADER stage
-- but still have old/wrong status
UPDATE SparePartsRequests
SET Status = 'Pending Maintenance Leader Approval'
WHERE CurrentStage = 'MAINTENANCE_LEADER'
  AND Status IN ('Pending', 'Pending Team Leader Approval', '');

-- Step 2: Update MaintenanceRequestRegisters whose spare parts
-- are now at MAINTENANCE_LEADER stage but the parent record
-- still shows 'Waiting for Spare Part'
UPDATE mrr
SET mrr.Status = 'Waiting for Maintenance Leader Approval'
FROM MaintenanceRequestRegisters mrr
WHERE mrr.Status = 'Waiting for Spare Part'
  AND EXISTS (
    SELECT 1
    FROM SparePartsRequests spr
    WHERE spr.WorksOrderNumber = mrr.WorksOrderNumber
      AND spr.CurrentStage = 'MAINTENANCE_LEADER'
  )
  AND NOT EXISTS (
    -- Only update if NO spare parts are still at team leader stage
    SELECT 1
    FROM SparePartsRequests spr2
    WHERE spr2.WorksOrderNumber = mrr.WorksOrderNumber
      AND spr2.CurrentStage NOT IN ('MAINTENANCE_LEADER', 'MINISTORE', 'COMPLETED')
      AND spr2.Status NOT IN ('Rejected', 'Issued', 'Issued to Technician')
  );

-- Step 3: Verify the results
SELECT 
    spr.Id,
    spr.WorksOrderNumber,
    spr.CurrentStage,
    spr.Status AS SparePartStatus,
    mrr.Status AS MaintenanceStatus
FROM SparePartsRequests spr
JOIN MaintenanceRequestRegisters mrr ON mrr.WorksOrderNumber = spr.WorksOrderNumber
WHERE spr.CurrentStage IN ('MAINTENANCE_LEADER', 'MINISTORE')
ORDER BY spr.WorksOrderNumber;
GO
