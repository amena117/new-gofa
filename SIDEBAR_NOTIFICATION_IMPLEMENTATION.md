# Sidebar Notification Badge Implementation

## Overview
Added a notification badge to the sidebar that shows the count of pending letters (letters with "Initial" status) for PPC users.

## Implementation Details

### 1. Backend Integration
- **Endpoint Used:** `GET /api/LetterRegistration`
- **Service:** `MaintenanceRequestService.getLetters()`
- **Filter Logic:** Count letters where `status === 'Initial'`

### 2. Frontend Changes

#### Files Modified:
1. **`gofaFrontend/src/app/shared-sidebar/shared-sidebar.component.ts`**
   - Added `pendingLettersCount` property
   - Imported `MaintenanceRequestService`
   - Added `loadPendingLettersCount()` method
   - Updated `ngOnInit()` to load letter count on initialization
   - Updated refresh interval to include letter count (every 30 seconds)
   - Enhanced `onNavigate()` to refresh count when navigating to maintenance form

2. **`gofaFrontend/src/app/shared-sidebar/shared-sidebar.component.html`**
   - Added notification badge for `/maintenance/request-form` link
   - Badge shows count of pending letters

3. **`gofaFrontend/src/app/shared-sidebar/shared-sidebar.component.css`**
   - Already had `.notification-badge` styling (no changes needed)

## How It Works

### Letter Status Flow:
1. **Initial Status** - Letter is created by Maintenance Leader
2. **Approved Status** - Letter is used to register a maintenance request by PPC

### Notification Logic:
- **Who sees it:** Only PPC role users
- **What it shows:** Count of letters with status "Initial" (not yet registered)
- **When it updates:**
  - On page load
  - Every 30 seconds (automatic refresh)
  - When navigating to the maintenance request form
  - After submitting a maintenance request (via automatic refresh)

### Visual Appearance:
- **Badge Color:** Red (#ff6b6b)
- **Position:** Right side of the menu item
- **Style:** Small circular badge with white text
- **Example:** "የሜንቴናንስ ጥያቄ ይመዝግቡ [3]"

## User Experience

### For PPC Users:
1. Open sidebar
2. See "የሜንቴናንስ ጥያቄ ይመዝግቡ" menu item
3. If there are pending letters, a red badge shows the count
4. Click to navigate to the form
5. After registering a letter, the count decreases

### For Other Users:
- No notification badge shown (only PPC sees it)

## Technical Details

### Auto-Refresh:
```typescript
// Refreshes every 30 seconds
interval(30000).subscribe(() => {
  this.loadPendingItemsCount();
  this.loadPendingLettersCount();
});
```

### Count Calculation:
```typescript
this.pendingLettersCount = letters.filter(letter => 
  letter.status === 'Initial'
).length;
```

### Conditional Display:
```html
<span *ngIf="item.link === '/maintenance/request-form' && pendingLettersCount > 0" 
      class="notification-badge">
  {{ pendingLettersCount }}
</span>
```

## Benefits

1. **Real-time Awareness** - PPC users immediately see pending letters
2. **Reduced Clicks** - No need to navigate to letter list to check count
3. **Better Workflow** - Clear indication of pending work
4. **Consistent UX** - Matches existing notification pattern (transit items)

## Similar Notifications

The sidebar already has a similar notification for:
- **Transit Items:** Shows count of items waiting for stores
- **Menu Item:** "New Items From Transit / ከትራንዚት የተላኩ እቃዎች"
- **Roles:** VHF, HF, SPAREPART, ELECTRONICS

## Testing Checklist

- [ ] PPC user sees notification badge when letters have "Initial" status
- [ ] Badge shows correct count
- [ ] Badge disappears when count is 0
- [ ] Count updates every 30 seconds
- [ ] Count updates after registering a maintenance request
- [ ] Other roles don't see the badge
- [ ] Badge styling matches existing design
- [ ] Badge doesn't break layout on mobile

## Future Enhancements

Potential improvements:
1. Add sound notification when new letter arrives
2. Show letter details on hover
3. Add filter to show only urgent letters
4. Add notification for other maintenance-related items
5. Add browser notification API integration

## Related Files

### Backend:
- `Gofabackend/Controllers/LetterRegistrationController.cs`
- `Gofabackend/Models/LetterRegistration.cs`

### Frontend:
- `gofaFrontend/src/app/shared-sidebar/shared-sidebar.component.ts`
- `gofaFrontend/src/app/shared-sidebar/shared-sidebar.component.html`
- `gofaFrontend/src/app/shared-sidebar/shared-sidebar.component.css`
- `gofaFrontend/src/app/services/maintenance-request.service.ts`
- `gofaFrontend/src/app/Maintenance/Models/letter.model.ts`

## Maintenance Notes

### When Letter Status Changes:
The notification count automatically updates when:
- A new letter is created (status: "Initial")
- PPC registers a maintenance request using a letter (status changes to "Approved")

### If Count Seems Wrong:
1. Check backend: Verify letter statuses in database
2. Check service: Ensure `getLetters()` returns all letters
3. Check filter: Verify status comparison is case-sensitive
4. Check refresh: Ensure interval is running

### Performance Considerations:
- API call every 30 seconds is lightweight
- Filter operation is client-side (fast)
- No impact on page load time
- Consider increasing interval if API load becomes an issue
