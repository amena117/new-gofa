# Fix Production Database - Add Missing Columns

## Issue
Production database is missing several columns that exist in the local schema, causing 500 errors:
- `TransactionEntries.History` - causing error when loading item details
- `Model22Items.Category` - causing error when loading Model22 records
- `Model22Items.IsAccessoryOnly` - missing column
- `Model22Items.ParentItemId` - missing column

## Solution

### Option 1: Using SQL Server Management Studio (SSMS)
1. Open SQL Server Management Studio
2. Connect to: `WIN-HRMPGQA7MMN\SQLExpress`
3. Open the file `add_missing_columns.sql`
4. Execute the script

### Option 2: Using sqlcmd from Command Line
Run this command on the production server:

```cmd
sqlcmd -S "WIN-HRMPGQA7MMN\SQLExpress" -U sa -P "signal@2025" -d GofaDb -i add_missing_columns.sql
```

### Option 3: Execute Commands Directly
Connect to SQL Server and run these commands:

```sql
USE GofaDb;

-- Add History to TransactionEntries
ALTER TABLE TransactionEntries ADD History nvarchar(max) NULL;

-- Add Category to Model22Items
ALTER TABLE Model22Items ADD Category nvarchar(max) NOT NULL DEFAULT '';

-- Add IsAccessoryOnly to Model22Items
ALTER TABLE Model22Items ADD IsAccessoryOnly bit NOT NULL DEFAULT 0;

-- Add ParentItemId to Model22Items
ALTER TABLE Model22Items ADD ParentItemId int NULL;
```

## After Adding Columns

1. Restart the backend service:
```cmd
cd C:\GofaApp11\Backend
taskkill /F /IM dotnet.exe
start dotnet Gofabackend.dll
```

2. Test the endpoints:
- Item details: `GET http://10.20.38.51:2024/api/items/16541`
- Model22 list: `GET http://10.20.38.51:2024/api/Model22`

## Verification
After running the script, verify the columns were added:

```sql
-- Check TransactionEntries
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'TransactionEntries' AND COLUMN_NAME = 'History';

-- Check Model22Items
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Model22Items' 
AND COLUMN_NAME IN ('Category', 'IsAccessoryOnly', 'ParentItemId');
```
