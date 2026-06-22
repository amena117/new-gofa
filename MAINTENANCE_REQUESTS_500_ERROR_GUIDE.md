# Maintenance Requests 500 Error - Troubleshooting Guide

## Problem Summary
The "Registered Maintenance Requests" page loads fine locally but returns **500 Internal Server Error** on the server.

## Root Cause
This is a **database schema mismatch** between your local database and the server database. The backend code expects certain columns that may not exist on the server, or there are NULL values in columns that shouldn't be NULL.

## Solution Steps

### Step 1: Run Diagnostic Script
First, identify what's wrong with the server database:

1. Open SQL Server Management Studio (SSMS) on the server
2. Connect to: `WIN-HRMPGQA7MMN\SQLExpress`
3. Open the file: `check_maintenance_schema.sql`
4. Execute the script
5. Review the output to see:
   - Which columns are missing
   - Which columns have NULL values
   - Current table structure

### Step 2: Fix the Database
After reviewing the diagnostic output, run the fix script:

1. In SSMS, open the file: `fix_maintenance_requests.sql`
2. Execute the script
3. The script will:
   - Add any missing columns (TechnicianName, TechnicianAssignedDate, CompletedDate, Feedback, FeedbackDate, FeedbackBy)
   - Fix NULL values in critical columns
   - Verify the fixes

### Step 3: Restart Backend
After fixing the database:

1. Stop the backend server on the server machine
2. Restart it using:
   ```bash
   cd C:\path\to\Gofabackend
   dotnet run
   ```

### Step 4: Test
1. Open the frontend on the server
2. Navigate to "Registered Maintenance Requests / የተመዘገቡ የጥገና መጠየቂያዎች"
3. Verify that the page loads without errors

## Common Issues and Solutions

### Issue 1: Missing Columns
**Symptoms:** Error message mentions column names that don't exist

**Solution:** The `fix_maintenance_requests.sql` script will add these columns:
- TechnicianName
- TechnicianAssignedDate
- CompletedDate
- Feedback
- FeedbackDate
- FeedbackBy

### Issue 2: NULL Values in Required Columns
**Symptoms:** Error message mentions "Cannot insert NULL" or "Column does not allow nulls"

**Solution:** The fix script will update NULL values:
- RequestedBy → 'Unknown User'
- SerialNoOfEquip → 'N/A'
- BriefDescriptionOfWork → 'No description provided'
- DateWorkOrderReceived → Current date
- CurrentHandler → 'PPC'
- StatusStage → 'POWER'

### Issue 3: Foreign Key Violations
**Symptoms:** Error message mentions foreign key constraints

**Solution:** Check that:
- All EquipmentTypeId values reference valid records in EquipmentTypes table
- All LetterId values reference valid records in Letters table

## Backend Logs
If the issue persists after running the fix script, check the backend logs:

**Location:** `Gofabackend/logs/myapp-YYYYMMDD.txt`

Look for:
- SQL error messages
- Stack traces
- Column names mentioned in errors

## Files Created
1. **check_maintenance_schema.sql** - Diagnostic script to identify issues
2. **fix_maintenance_requests.sql** - Fix script to resolve schema issues
3. **MAINTENANCE_REQUESTS_500_ERROR_GUIDE.md** - This guide

## Recent Changes
The following fields were removed from the maintenance request form (frontend only):
- Works Order Number / የስራ ትዕዛዝ ቁጥር
- Nomenclature (Model) / ሞዴል

These fields still exist in the database but won't be shown to users. The form will send empty/null values for these fields.

## Prevention
To prevent this issue in the future:

1. **Always run migrations on both local and server databases**
2. **Keep database schemas in sync** between environments
3. **Test on server** after any database changes
4. **Use migrations** instead of manual SQL changes when possible

## Need More Help?
If the issue persists after following these steps:

1. Run the diagnostic script and share the output
2. Check the backend logs and share any error messages
3. Verify the connection string in `appsettings.json` on the server
4. Ensure the backend is running and accessible

## Connection Strings
**Local (Development):**
```
Server=Josiah-Alex;Database=GofaDb;Integrated Security=true;TrustServerCertificate=True;
```

**Server (Production):**
```
Server=WIN-HRMPGQA7MMN\SQLExpress;Database=GofaDb;User ID=sa;Password=signal@2025;TrustServerCertificate=True;
```
