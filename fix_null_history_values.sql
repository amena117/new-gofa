-- Fix NULL values in History column
USE GofaDb;
GO

-- Update all NULL History values to empty string
UPDATE TransactionEntries 
SET History = '' 
WHERE History IS NULL;
GO

-- Check how many rows were updated
SELECT COUNT(*) AS UpdatedRows 
FROM TransactionEntries 
WHERE History = '';
GO

PRINT 'NULL History values have been updated to empty strings';
