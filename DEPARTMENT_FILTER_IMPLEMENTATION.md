# Department Filter Implementation for Spare Parts Issuance History

## Overview
Added department filtering capability to the **Spare Parts Issuance History** page, allowing users to filter spare parts requests by department (e.g., Power, Radio, Office Machine, etc.).

## Implementation Details

### Backend Changes

#### File: `Gofabackend/Controllers/SparePartsRequestController.cs`

**Modified endpoint:** `GET /api/SparePartsRequest/all`

**Changes made:**
1. **Enhanced data retrieval** to include `TechnicianRole` from `MaintenanceRequestRegisters`
2. **Added user lookup** to resolve technician full names to their roles by joining with the `Users` table
3. **Added department mapping** using a `RoleToDepartment()` helper function that maps role codes to human-readable department names:
   - `POWER` / `POWER_MAINTENANCE` → **Power**
   - `OFFICE_MACHINE` / `OFFICE_MACHINE_MAINTENANCE` → **Office Machine**
   - `RADIO_MAINTENANCE` / `VHF_RADIO` / `VHF_MAINTENANCE` → **Radio / VHF**
   - `HF_RADIO` / `HF_MAINTENANCE` → **HF Radio**
   - `IT_MAINTENANCE` / `COMPUTER_MAINTENANCE` → **IT / Computer**
   - `ELECTRICAL_MAINTENANCE` → **Electrical**
   - `MECHANICAL_MAINTENANCE` → **Mechanical**
   - `WELDING_MAINTENANCE` → **Welding**
   - Other roles → **Other**

4. **Return additional fields** in the API response:
   - `TechnicianRole`: The role code (e.g., "POWER_MAINTENANCE")
   - `Department`: The human-readable department name (e.g., "Power")

**Lookup strategy:**
- Primary: Match `requestedBy` full name to Users table to get role
- Fallback: Use work order's `TechnicianRole` if name match fails

### Frontend Changes

#### File: `gofaFrontend/src/app/Maintenance/Ministore/spare-parts-request-respond/spare-parts-request-respond.component.ts`

**New properties:**
- `departmentFilter: string = 'all'` - Stores the selected department filter
- `availableDepartments: string[]` - Dynamically populated list of unique departments from loaded data

**Modified methods:**

1. **`fetchHistory()`**
   - Added logic to extract unique departments from loaded records
   - Sorts departments alphabetically for the filter dropdown

2. **`applyFilters()`**
   - Added department filter logic: `if (this.departmentFilter !== 'all') { result = result.filter(r => r.department === this.departmentFilter); }`
   - Includes department in search term filtering

3. **`exportToExcel()`**
   - Added `'Department'` column to Excel export (positioned after Stock Number)
   - Adjusted column widths to accommodate the new column

#### File: `gofaFrontend/src/app/Maintenance/Ministore/spare-parts-request-respond/spare-parts-request-respond.component.html`

**New UI elements:**

1. **Department filter dropdown** (added to filter bar):
   ```html
   <select class="status-select" [(ngModel)]="departmentFilter" (ngModelChange)="applyFilters()">
     <option value="all">All Departments</option>
     <option *ngFor="let dept of availableDepartments" [value]="dept">{{ dept }}</option>
   </select>
   ```

2. **Active filter badge** (shows when a department is selected):
   ```html
   <span *ngIf="departmentFilter !== 'all'" class="dept-badge">
     🏢 {{ departmentFilter }}
     <button class="dept-badge-clear" (click)="departmentFilter='all'; applyFilters()">✕</button>
   </span>
   ```

3. **Department column** added to the data table (positioned after Stock Number):
   ```html
   <td>
     <span *ngIf="r.department" class="dept-tag">{{ r.department }}</span>
     <span *ngIf="!r.department" class="no-dept">—</span>
   </td>
   ```

4. **Department field** added to the detail modal (positioned after Stock Number)

#### File: `gofaFrontend/src/app/Maintenance/Ministore/spare-parts-request-respond/spare-parts-request-respond.component.css`

**New styles:**
- `.dept-tag` - Green badge style for department labels in table and modal
- `.no-dept` - Gray placeholder style when department is not available
- `.dept-badge` - Blue badge style for active department filter indicator
- `.dept-badge-clear` - Clear button for removing active department filter

## Features

### Filter Options
- **All Departments** (default) - Shows all spare parts requests
- **Power** - Shows only Power department requests
- **Radio / VHF** - Shows Radio and VHF maintenance requests
- **Office Machine** - Shows Office Machine maintenance requests
- **HF Radio** - Shows HF Radio maintenance requests
- **IT / Computer** - Shows IT and Computer maintenance requests
- **Electrical** - Shows Electrical maintenance requests
- **Mechanical** - Shows Mechanical maintenance requests
- **Welding** - Shows Welding maintenance requests
- **Other** - Shows requests from other departments

### User Experience
1. **Dynamic dropdown** - Only departments that exist in the loaded data appear in the dropdown
2. **Active filter badge** - Visual indicator when a specific department is selected
3. **Quick clear** - Click the ✕ button on the badge to reset to "All Departments"
4. **Search integration** - Department is also searchable in the main search bar
5. **Excel export** - Department column included in exported reports
6. **Responsive** - Department filter works alongside existing status and time filters

## Benefits

1. **Improved navigation** - Quickly find spare parts requests for a specific department
2. **Better reporting** - Generate department-specific Excel reports
3. **Enhanced visibility** - See which department requested each spare part
4. **Multi-filter support** - Combine department filter with status, time, and text search for precise results

## Testing Checklist

- [x] Backend compiles without errors (0 errors, 386 warnings)
- [x] Frontend TypeScript compiles without errors
- [ ] Verify API returns `department` and `technicianRole` fields
- [ ] Verify department dropdown populates with unique departments
- [ ] Test filtering by each department option
- [ ] Verify "All Departments" shows all records
- [ ] Test department filter combined with status filter
- [ ] Test department filter combined with time filter
- [ ] Test department filter combined with text search
- [ ] Verify active filter badge appears/disappears correctly
- [ ] Verify clear button on badge resets filter
- [ ] Verify department column displays in table
- [ ] Verify department field displays in detail modal
- [ ] Verify Excel export includes Department column with correct data

## Related Files Modified

### Backend
- `Gofabackend/Controllers/SparePartsRequestController.cs`

### Frontend
- `gofaFrontend/src/app/Maintenance/Ministore/spare-parts-request-respond/spare-parts-request-respond.component.ts`
- `gofaFrontend/src/app/Maintenance/Ministore/spare-parts-request-respond/spare-parts-request-respond.component.html`
- `gofaFrontend/src/app/Maintenance/Ministore/spare-parts-request-respond/spare-parts-request-respond.component.css`

## Notes

- Department mapping is case-insensitive and handles multiple role variations
- If a user's full name doesn't match the Users table, the system falls back to the work order's `TechnicianRole` field
- Records without a resolvable department show "—" in the table and "Other" in filtering
- The department list is dynamically generated, so it will automatically include new departments as they appear in the data
