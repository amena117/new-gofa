# Maintenance Request Form Fixes

## Issues Fixed

### 1. Notification Badge ✅
**Status:** Working correctly
- Shows "Pending letters count: 2" in console
- Badge appears on sidebar for PPC users
- Updates every 30 seconds automatically

### 2. Form Submission Error (400 Bad Request) ✅
**Problem:** Backend was rejecting form submission because `WorksOrderNumber` and `Nomenclature` were required but not provided.

**Solution:** Updated backend to make these fields optional and auto-generate WorksOrderNumber from LetterId.

## Changes Made

### Backend Changes:

#### 1. `MaintenanceRequestCreateDto.cs`
- Made `WorksOrderNumber` optional (`int?`)
- Made `Nomenclature` optional (`string?`)
- Made `Model` required (since it's now the main identifier)

#### 2. `MaintenanceRequestRegisterController.cs`
- Auto-generates `WorksOrderNumber` from `LetterId` if not provided
- Handles null `Nomenclature` by using empty string
- Updated duplicate check to handle optional WorksOrderNumber

#### 3. `LetterRegistrationController.cs`
- Updated `/initial` endpoint to use case-insensitive comparison
- Now handles both "initial" and "Initial" status values

### Frontend Changes:

#### 1. `shared-sidebar.component.ts`
- Added `pendingLettersCount` property
- Added `loadPendingLettersCount()` method
- Uses `getInitialLetters()` endpoint for efficiency
- Added debug logging

#### 2. `shared-sidebar.component.html`
- Added notification badge for maintenance request form link
- Badge shows count of pending letters

## How It Works Now

### Letter to Maintenance Request Flow:

1. **Letter Created** → Status: "initial" (lowercase)
2. **Letter Appears in Dropdown** → Available for selection
3. **Sidebar Shows Notification** → Badge with count of pending letters
4. **PPC Selects Letter** → From dropdown in form
5. **PPC Fills Form** → All required fields
6. **Form Submitted** → Backend auto-generates WorksOrderNumber from LetterId
7. **Letter Status Updated** → Changes to "Approved"
8. **Notification Decreases** → Count updates automatically

### Auto-Generation Logic:

```csharp
// WorksOrderNumber is auto-generated from LetterId
int worksOrderNumber = createDto.WorksOrderNumber ?? createDto.LetterId ?? 0;
```

This means:
- If WorksOrderNumber is provided → Use it
- If not provided but LetterId exists → Use LetterId as WorksOrderNumber
- If neither provided → Use 0 (will fail validation)

## Testing Steps

### 1. Restart Backend
```bash
cd Gofabackend
dotnet run
```

### 2. Hard Refresh Frontend
Press `Ctrl + Shift + R` in browser

### 3. Test Notification
1. Login as PPC user
2. Open sidebar
3. Check "የሜንቴናንስ ጥያቄ ይመዝግቡ" menu item
4. Should see red badge with number (e.g., [2])

### 4. Test Form Submission
1. Navigate to maintenance request form
2. Select a Letter ID from dropdown (e.g., 1007)
3. Fill all required fields:
   - Equipment Type
   - Model Number
   - Serial Number
   - Requested By
   - Date
   - Status Stage
   - Description
4. Click Submit
5. Should see success message
6. Notification count should decrease by 1

### 5. Verify Letter Status
1. Check letter list page
2. The used letter should now have status "Approved"
3. It should no longer appear in the dropdown

## Expected Behavior

### Before Submission:
- Letter ID 1007: Status = "initial"
- Appears in dropdown
- Notification badge shows [2]

### After Submission:
- Letter ID 1007: Status = "Approved"
- Does NOT appear in dropdown
- Notification badge shows [1]
- Maintenance request created with WorksOrderNumber = 1007

## Troubleshooting

### If Form Still Shows 400 Error:

1. **Check backend logs** for exact error message
2. **Verify all required fields** are filled
3. **Check LetterId** is being sent correctly
4. **Restart backend** to ensure changes are loaded

### If Notification Doesn't Show:

1. **Check browser console** for "Pending letters count: X"
2. **Verify role** is exactly "PPC" (case-sensitive)
3. **Check API endpoint** `http://localhost:5000/api/LetterRegistration/initial`
4. **Verify letter status** in database is "initial" (lowercase)

### If Letter Status Doesn't Update:

1. **Check backend logs** for "Letter ID X status updated to 'Approved'"
2. **Verify LetterId** is being sent in form submission
3. **Check database** to see if status changed
4. **Wait 30 seconds** for notification to auto-refresh

## Database Schema

### Letters Table:
- `LetterId` (int, primary key)
- `From` (string)
- `RecommendBy` (string)
- `Status` (string) - Values: "initial", "Approved"
- `CreatedDate` (datetime)

### MaintenanceRequestRegisters Table:
- `Id` (int, primary key)
- `WorksOrderNumber` (int) - Auto-generated from LetterId
- `Nomenclature` (string, nullable)
- `LetterId` (int, nullable, foreign key)
- ... other fields

## Benefits

1. **Simplified Form** - Removed unnecessary fields
2. **Auto-Generation** - WorksOrderNumber created automatically
3. **Real-time Notifications** - PPC sees pending letters immediately
4. **Better UX** - Clear indication of pending work
5. **Data Integrity** - Letter status tracks usage

## Future Enhancements

1. Add validation to prevent using same letter twice
2. Add ability to view letter details before selecting
3. Add filter to show only relevant letters
4. Add notification sound when new letter arrives
5. Add ability to reject/return letters
