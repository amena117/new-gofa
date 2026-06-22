# Change Department Feature - Implementation Summary

## Overview
Added functionality to allow changing the department/unit a maintenance request is sent to, even after it has been initially assigned. This gives PPC users flexibility to reassign requests to different maintenance departments.

## New Feature: Reassign Maintenance

### What Was Created

#### 1. New Component: ReassignMaintenanceComponent
**Location**: `gofaFrontend/src/app/Maintenance/PPC/reassign-maintenance/`

**Files Created**:
- `reassign-maintenance.component.ts` - Component logic
- `reassign-maintenance.component.html` - Template with form
- `reassign-maintenance.component.css` - Styling

**Features**:
- Displays current request information (read-only)
- Shows current department assignment
- Allows selection of new department
- Auto-fills "Requested To" field based on department selection
- Warning message about reassignment
- Uses existing backend endpoint for updates

**Department Options**:
- Office Machine
- POWER
- RADIO MAINTENANCE
- HF RADIO

#### 2. Updated Maintenance Request List
**File**: `gofaFrontend/src/app/Maintenance/PPC/maintenance-request-register-list/`

**Changes**:
- Added "Change Dept" button to action buttons
- Button only shows for requests that are:
  - NOT in "Pending" status (already sent)
  - NOT in "Client Received" status (completed)
  - NOT in "Maintenance Finished" status (completed)
- Orange/warning styling to indicate it's a significant action
- Navigates to reassign page with worksOrderNumber

#### 3. Module and Routing Updates

**maintenance.module.ts**:
- Added `ReassignMaintenanceComponent` to declarations
- Imported component

**maintenance-routing.module.ts**:
- Added route: `{ path: 'reassign-maintenance', component: ReassignMaintenanceComponent }`
- Route accepts `worksOrderNumber` as query parameter

#### 4. CSS Styling
**File**: `maintenance-request-register-list.component.css`

Added warning button style:
```css
.action-btn.warning {
  background: linear-gradient(to bottom, #ff9800, #f57c00);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}
```

## How It Works

### User Flow

1. **View Maintenance Requests**
   - User navigates to maintenance request list
   - Sees all registered requests with their current status

2. **Identify Request to Reassign**
   - Finds a request that needs to be sent to a different department
   - Request must be already sent (not "Pending")
   - Request must not be completed

3. **Click "Change Dept" Button**
   - Orange button appears in actions column
   - Only visible for eligible requests

4. **Reassign Page**
   - Shows complete request information
   - Displays current department assignment
   - Warning message about reassignment
   - Dropdown to select new department
   - "Requested To" field auto-fills

5. **Submit Reassignment**
   - Clicks "Change Department" button
   - Backend updates `MaintenanceType` and `RequestedTo` fields
   - Request is now assigned to new department
   - Redirects back to request list

### Backend Integration

**Endpoint Used**: `PUT /api/MaintenanceRequestRegister/update/{worksOrderNumber}`

**Request Body**:
```json
{
  "maintenanceType": "POWER",
  "model": "existing-model",
  "requestedTo": "POWER Maintenance"
}
```

**What Gets Updated**:
- `MaintenanceType` - The department type
- `RequestedTo` - The full department name
- `Model` - Preserved from existing data

## Button Visibility Logic

The "Change Dept" button is shown when:
```typescript
*ngIf="request.status !== 'Pending' && 
       request.status !== 'Client Received' && 
       request.status !== 'Maintenance Finished'"
```

**Visible for statuses**:
- "On Maintaining"
- "In Progress"
- "Quality Check"
- "Waiting for Spare Part"
- "Accepted"
- Any other intermediate status

**Hidden for statuses**:
- "Pending" - Not yet sent, use regular "Send" button
- "Client Received" - Already delivered to client
- "Maintenance Finished" - Completed, shouldn't be reassigned

## Files Modified

### New Files
1. `gofaFrontend/src/app/Maintenance/PPC/reassign-maintenance/reassign-maintenance.component.ts`
2. `gofaFrontend/src/app/Maintenance/PPC/reassign-maintenance/reassign-maintenance.component.html`
3. `gofaFrontend/src/app/Maintenance/PPC/reassign-maintenance/reassign-maintenance.component.css`

### Modified Files
1. `gofaFrontend/src/app/Maintenance/maintenance.module.ts` - Added component declaration
2. `gofaFrontend/src/app/Maintenance/maintenance-routing.module.ts` - Added route
3. `gofaFrontend/src/app/Maintenance/PPC/maintenance-request-register-list/maintenance-request-register-list.component.html` - Added button
4. `gofaFrontend/src/app/Maintenance/PPC/maintenance-request-register-list/maintenance-request-register-list.component.ts` - Added method
5. `gofaFrontend/src/app/Maintenance/PPC/maintenance-request-register-list/maintenance-request-register-list.component.css` - Added warning button style

## Testing Instructions

1. **Create a Test Request**
   - Register a new maintenance request
   - Send it to a department (e.g., POWER)

2. **Verify Button Appears**
   - Go to maintenance request list
   - Find the request you just sent
   - Verify "Change Dept" button is visible (orange)

3. **Test Reassignment**
   - Click "Change Dept" button
   - Verify request information displays correctly
   - Select a different department (e.g., RADIO MAINTENANCE)
   - Verify "Requested To" auto-fills
   - Click "Change Department"
   - Verify success message

4. **Verify Update**
   - Return to request list
   - Check that the request now shows new department
   - Verify in database that `MaintenanceType` and `RequestedTo` updated

5. **Test Button Visibility**
   - Verify button doesn't show for "Pending" requests
   - Verify button doesn't show for "Maintenance Finished" requests
   - Verify button doesn't show for "Client Received" requests

## Benefits

✅ **Flexibility** - Can correct mistakes in department assignment
✅ **Efficiency** - No need to delete and recreate requests
✅ **Audit Trail** - Updates existing record, preserving history
✅ **User-Friendly** - Clear interface with warnings
✅ **Controlled Access** - Only shows for appropriate statuses

## Future Enhancements (Optional)

- Add history log of department changes
- Add reason field for reassignment
- Send notification to old and new departments
- Add permission check (only PPC can reassign)
- Show reassignment count/indicator on request

## Status
✅ **COMPLETE** - Feature is fully implemented and ready for testing
