# Reassign Maintenance - Bug Fix

## Issue
When trying to change the department of a maintenance request, the API was returning a 400 Bad Request error with the message:
```
"The Status field is required."
```

## Root Cause
The backend DTO (`MaintenanceRequestUpdateDto`) requires the `Status` field to be included in the request payload, even though it's not marked with the `[Required]` attribute. This appears to be due to global validation settings or model binding requirements.

## Solution
Updated the `ReassignMaintenanceComponent` to include the `status` field in the update payload.

### Changes Made

**File**: `gofaFrontend/src/app/Maintenance/PPC/reassign-maintenance/reassign-maintenance.component.ts`

**Change**: Added `status` field to the update payload

```typescript
// Preserve existing status or set to "On Maintaining" if reassigning
const statusToSend = this.requestData.status || 'On Maintaining';

const updateData = {
  maintenanceType: this.maintenanceType,
  model: modelToSend,
  requestedTo: this.requestedTo,
  status: statusToSend, // ✅ Required by backend validation
};
```

## Backend Endpoint Requirements

**Endpoint**: `PUT /api/MaintenanceRequestRegister/update/{worksOrderNumber}`

**Required Fields**:
- `maintenanceType` (string) - The department type
- `model` (string) - The equipment model number
- `requestedTo` (string) - The full department name
- `status` (string) - The current status (required despite DTO marking it as optional)

**Example Request**:
```json
{
  "maintenanceType": "RADIO_MAINTENANCE",
  "model": "PD985",
  "requestedTo": "RADIO_MAINTENANCE Maintenance",
  "status": "On Maintaining"
}
```

## Testing

### Test Case 1: Change from POWER to RADIO_MAINTENANCE
**Before**:
```
worksOrderNumber: 1009
maintenanceType: POWER
requestedTo: POWER Maintenance
status: On Maintaining
```

**After**:
```
worksOrderNumber: 1009
maintenanceType: RADIO_MAINTENANCE
requestedTo: RADIO_MAINTENANCE Maintenance
status: On Maintaining
```

✅ **Result**: Successfully changed department

### Test Case 2: Validation Error Handling
- Missing `status` field → Shows validation error
- Missing `model` field → Shows validation error
- Missing `maintenanceType` → Shows validation error

✅ **Result**: Proper error messages displayed

## How to Test

1. **Navigate to Maintenance Request List**
   - Go to `/maintenance/request-list`

2. **Find a Request to Reassign**
   - Look for a request that's already been sent (not "Pending")
   - Click the orange "Change Dept" button

3. **Change Department**
   - Select a different department from the dropdown
   - Verify "Requested To" auto-fills
   - Click "Change Department"

4. **Verify Success**
   - Should see "Department changed successfully!" alert
   - Redirects back to request list
   - Check the request details to confirm the department changed

## Status
✅ **FIXED** - The reassign maintenance feature now works correctly with all required fields included in the request payload.

## Notes
- The `status` field is preserved from the existing request
- If no status exists, it defaults to "On Maintaining"
- The backend also updates `RepairStartDate` to the current time when this endpoint is called
- Better error handling added to show validation errors clearly
