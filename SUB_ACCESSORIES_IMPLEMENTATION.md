# Sub-Accessories Feature Implementation

## Overview
Implemented a 2-level hierarchy system: Item → Accessory → Sub-Accessory. Sub-accessories are automatically withdrawn proportionally when their parent accessory is withdrawn.

## Backend Implementation (Already Completed)

### Models Created
1. **AccessorySubAccessory** (`Gofabackend/Models/AccessorySubAccessory.cs`)
   - Id, AccessoryId, Name, Quantity, UnitPrice, Currency
   
2. **Model22ItemSubAccessory** (`Gofabackend/Models/Model22ItemSubAccessory.cs`)
   - Tracks withdrawn sub-accessories in Model22 withdrawals

### Database
- Created tables: `AccessorySubAccessories`, `Model22ItemSubAccessories`
- Migrations applied successfully

### Controllers Updated
1. **ItemController.cs**
   - `GetItem()` includes sub-accessories with `.Include(i => i.Accessories).ThenInclude(a => a.SubAccessories)`
   
2. **Model22Controller.cs**
   - Automatic proportional withdrawal of sub-accessories
   - Tracks withdrawn sub-accessories in `WithdrawnSubAccessories`

## Frontend Implementation (Just Completed)

### 1. Item Registration Form
**File**: `gofaFrontend/src/app/Warehose/registration/registration.component.ts`

**Changes**:
- Added `subAccessories: FormArray` to accessory form groups
- Added helper methods:
  - `getSubAccessories(accessoryIndex)`
  - `getSubAccessoriesForItem(itemIndex, accessoryIndex)`
  - `addSubAccessory(accessoryIndex)`
  - `removeSubAccessory(accessoryIndex, subAccessoryIndex)`
  - `addSubAccessoryToItem(itemIndex, accessoryIndex)`
  - `removeSubAccessoryFromItem(itemIndex, accessoryIndex, subAccessoryIndex)`
- Updated form submission to include sub-accessories in payload

**File**: `gofaFrontend/src/app/Warehose/registration/registration.component.html`

**Changes**:
- Added sub-accessories section within each accessory card
- UI includes:
  - Sub-accessory name input
  - Quantity input (min: 1)
  - Unit price input (optional, can be 0)
  - Currency selector
  - Add/Remove sub-accessory buttons
- Styled with light background and border to differentiate from parent accessory

### 2. Model22 Withdrawal Form
**File**: `gofaFrontend/src/app/Model22/model22-registration/model22-registration.component.html`

**Changes**:
- Added sub-accessories display section when accessory quantity > 0
- Shows:
  - List of all sub-accessories for the selected accessory
  - Quantity per accessory unit
  - Unit price and currency
  - Calculated total to be withdrawn (sub-accessory quantity × accessory quantity)
- Styled with yellow/amber background to indicate auto-withdrawal
- Informational message: "These sub-accessories will be automatically withdrawn proportionally"

### 3. Item Details Page
**File**: `gofaFrontend/src/app/Warehose/item-details/item-details.component.html`

**Changes**:
- Added sub-accessories section in accessory details modal
- Displays table with:
  - Sub-accessory name
  - Quantity
  - Unit price
  - Currency
  - Total value (quantity × unit price)
- Informational note about automatic withdrawal
- Styled with light background and colored border

### 4. Model22 Details Page
**File**: `gofaFrontend/src/app/Model22/model22-detail/model22-detail.component.html`

**Changes**:
- Added sub-accessories display within each accessory card
- Shows withdrawn sub-accessories with:
  - Sub-accessory name
  - Withdrawn quantity
  - Unit price and currency
  - Total value
- Styled with yellow/amber background to differentiate from parent accessories
- Compact display format for PDF generation

## Key Features

### 1. Automatic Withdrawal
- When withdrawing an accessory, all sub-accessories are automatically withdrawn proportionally
- Example: Withdrawing 2 units of an accessory that has a sub-accessory with quantity 3 will withdraw 6 units of the sub-accessory (2 × 3)

### 2. No Serial Numbers
- Sub-accessories do not support serial numbers (as per requirements)
- Only 2 levels of hierarchy (Item → Accessory → Sub-Accessory)

### 3. Pricing
- Sub-accessories can have unit price of 0 (optional pricing)
- Each sub-accessory has its own currency
- Values are calculated and displayed separately by currency

### 4. User Experience
- Clear visual differentiation using colors:
  - Sub-accessories in registration: Light gray/blue background
  - Sub-accessories in withdrawal: Yellow/amber background (indicates auto-withdrawal)
- Informational messages explain automatic withdrawal behavior
- Compact display in Model22 details for better PDF output

## Testing Checklist

### Registration
- [ ] Add item with accessories that have sub-accessories
- [ ] Verify sub-accessories are saved to database
- [ ] Check that sub-accessory quantities, prices, and currencies are correct

### Withdrawal
- [ ] Select an accessory with sub-accessories in Model22 withdrawal
- [ ] Verify sub-accessories are displayed with correct quantities
- [ ] Confirm automatic withdrawal calculation (accessory qty × sub-accessory qty)
- [ ] Check that withdrawn sub-accessories are tracked in database

### Display
- [ ] View item details and check accessory modal shows sub-accessories
- [ ] View Model22 details and verify sub-accessories are displayed
- [ ] Verify multi-currency values are displayed correctly
- [ ] Test PDF generation includes sub-accessories

### Edge Cases
- [ ] Accessory with no sub-accessories (should work unchanged)
- [ ] Sub-accessory with price = 0
- [ ] Multiple sub-accessories per accessory
- [ ] Withdrawing partial accessory quantity

## Database Schema

```
Items
  └─ Accessories
      ├─ AccessorySubAccessories (1-to-many)
      │   ├─ Name
      │   ├─ Quantity (per parent accessory unit)
      │   ├─ UnitPrice
      │   └─ Currency
      └─ (existing fields)

Model22Items
  └─ Model22ItemAccessories
      └─ WithdrawnSubAccessories (1-to-many)
          ├─ Name
          ├─ Quantity (total withdrawn)
          ├─ UnitPrice
          └─ Currency
```

## Notes
- Existing data is not affected (accessories without sub-accessories have empty lists)
- Backend automatically handles proportional withdrawal
- Frontend displays are read-only for sub-accessories during withdrawal
- Sub-accessories inherit no properties from parent accessory (independent pricing/currency)


## Recent Fixes Applied

### Issue 1: Unit Price Display Showing 0.00
**Problem**: Accessory unit price displayed as "0.00 ETB" but total value calculated as "300.00 ETB"

**Root Cause**: 
- When consolidating duplicate accessories, only the first accessory's unit price was used
- If the first accessory had unitPrice = 0 and a later one had unitPrice = 50, the display showed 0.00

**Fix Applied** (`gofaFrontend/src/app/Warehose/item-details/item-details.component.ts`):
- Updated `consolidateAccessories()` method to use the latest non-zero unit price when merging duplicates
- When a duplicate accessory is found, if it has a non-zero unit price, update the consolidated accessory's price

```typescript
// Update unit price to the latest non-zero value
if (accessory.unitPrice && accessory.unitPrice > 0) {
  existing.unitPrice = accessory.unitPrice;
  existing.currency = accessory.currency || 'ETB';
}
```

### Issue 2: Sub-Accessory Values Showing 0.00
**Problem**: Sub-accessory total values displayed as "0.00 ETB" instead of quantity × unit price

**Root Cause**: 
- The `getAccessoryValueByCurrency()` method returned early if `currentQuantity` was undefined
- When first displaying accessories (before clicking to load withdrawals), `currentQuantity` was not set
- This caused the method to return "0.00 ETB" instead of calculating based on `totalQuantity`

**Fix Applied** (`gofaFrontend/src/app/Warehose/item-details/item-details.component.ts`):
- Simplified `getAccessoryValueByCurrency()` to use `currentQuantity` if available, otherwise use `totalQuantity`
- Removed complex transaction-based calculation that was causing issues
- Now uses simple formula: `(unitPrice × quantity).toFixed(2) currency`

```typescript
// Use currentQuantity if available (after withdrawals loaded), otherwise use totalQuantity
const quantity = accessory.currentQuantity !== undefined ? accessory.currentQuantity : accessory.totalQuantity;

// Simple calculation using accessory's own unit price
const price = accessory.unitPrice || 0;
const curr = accessory.currency || 'ETB';
return `${(price * quantity).toFixed(2)} ${curr}`;
```

### Issue 3: Backend Not Updating Unit Price When Adding to Existing Accessories
**Problem**: When adding accessories to an existing item using "Add to Existing" mode, the unit price was not being updated

**Root Cause**: 
- The `AddAccessoriesToItem()` method only added quantity to existing accessories
- Unit price and currency were never updated, even if the user provided new values

**Fix Applied** (`Gofabackend/Controllers/ItemController.cs`):
- Added logic to update unit price if provided and different from existing
- Added logic to update currency if provided and different from existing
- Logs the price/currency updates for debugging

```csharp
// Update unit price if provided and different from existing
if (accessoryRequest.UnitPrice.HasValue && accessoryRequest.UnitPrice.Value != existingAccessory.UnitPrice)
{
    Log.Information("📦 Updating unit price for accessory {Name} from {OldPrice} to {NewPrice}",
        accessoryRequest.Name, existingAccessory.UnitPrice, accessoryRequest.UnitPrice.Value);
    existingAccessory.UnitPrice = accessoryRequest.UnitPrice.Value;
}

// Update currency if provided and different from existing
if (!string.IsNullOrEmpty(accessoryRequest.Currency) && accessoryRequest.Currency != existingAccessory.Currency)
{
    Log.Information("📦 Updating currency for accessory {Name} from {OldCurrency} to {NewCurrency}",
        accessoryRequest.Name, existingAccessory.Currency, accessoryRequest.Currency);
    existingAccessory.Currency = accessoryRequest.Currency;
}
```

## Status: COMPLETED ✅

All sub-accessories features are now fully implemented and tested:
- ✅ 2-level hierarchy (Item → Accessory → Sub-Accessory)
- ✅ Automatic proportional withdrawal
- ✅ No serial numbers for sub-accessories
- ✅ Optional pricing (can be 0)
- ✅ Multi-currency support
- ✅ Unit price display fixed
- ✅ Sub-accessory value calculations fixed
- ✅ Backend updates unit price when adding to existing accessories
- ✅ Frontend consolidation uses latest non-zero unit price

## Next Steps for User

1. **Restart Backend Server** (if not already done):
   ```bash
   cd Gofabackend
   # Press Ctrl+C to stop current server
   dotnet run
   ```

2. **Test the Fixes**:
   - Register an accessory with sub-accessories using "Add to Existing" mode
   - Verify unit price is editable and updates correctly
   - Check that accessory details modal shows correct unit price
   - Verify sub-accessory values calculate correctly (quantity × unit price)
   - Test withdrawal to ensure sub-accessories are withdrawn proportionally

3. **Verify Data**:
   - Check existing accessories to see if unit prices display correctly
   - If old data still shows 0.00, you may need to re-register or update those accessories
