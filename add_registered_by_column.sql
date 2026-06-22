-- Add RegisteredBy column to MaintenanceRequestRegisters table
-- This column will store the full name of the person who registered the maintenance request

ALTER TABLE MaintenanceRequestRegisters
ADD RegisteredBy NVARCHAR(MAX) NULL;

-- Optional: Update existing records with a default value
-- UPDATE MaintenanceRequestRegisters
-- SET RegisteredBy = 'System'
-- WHERE RegisteredBy IS NULL;

PRINT 'RegisteredBy column added successfully to MaintenanceRequestRegisters table';
