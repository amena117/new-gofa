# Accessory-Only Withdrawal Feature Specification

## Overview
Enable users to withdraw accessories independently from their parent items, similar to how accessories can be received independently. This feature allows tracking accessory movements without requiring the main item to be withdrawn.

## Current State Analysis

### Accessory Receiving (✅ Implemented)
- **Frontend**: Toggle mode in registration component (`isAccessoryMode`)
- **UI**: Parent item search with autocomplete
- **Backend**: `POST /api/items/{id}/add-accessories` endpoint exists
- **Functionality**: Users can add accessories to existing items without changing main item quantity
- **Transaction Recording**: Creates transaction history for accessory additions

### Accessory Withdrawal (❌ Not Implemented)
- No UI for accessory-only withdrawal
- No backend endpoint for withdrawing accessories independently
- Model22 (withdrawal) component only handles full item withdrawals with optional accessories

## User Requirements

### Core Requirement
"I want to be able to accept accessories alone but they should be attached to item (I can add them without adding the quantity of the main item) and withdraw them like that too"

### Key Points
1. Accessories remain attached to parent item
2. Accessory quantity changes independently of main item quantity
3. Both receiving and withdrawing should work the same way
4. Transaction history should track accessory movements separately

## Proposed Solution

### Option A: Extend Model22 Component (Recommended)
Add an "Accessory-Only Mode" toggle to the existing Model22 withdrawal component, similar to the registration component.

**Advantages:**
- Consistent with receiving flow
- Reuses existing Model22 infrastructure
- Single withdrawal interface for users
- Maintains transaction history in Model22 records

**Implementation:**
1. Add `isAccessoryOnlyMode` toggle to Model22 registration component
2. When enabled:
   - User selects parent item (no quantity change to main item)
   - User selects accessories and quantities to withdraw
   - Serial numbers required if accessory has `requiresSerialNumbers = true`
   - Main item quantity remains unchanged
3. Backend creates Model22 record with:
   - Main item quantity = 0 (or omitted)
   - Only accessory withdrawals recorded
   - Transaction type distinguishes accessory-only withdrawals

### Option B: Separate Accessory Withdrawal Component
Create a dedicated component for accessory withdrawals.

**Advantages:**
- Cleaner separation of concerns
- Simpler UI focused only on accessories

**Disadvantages:**
- Duplicate code and logic
- Users need to learn two different withdrawal interfaces
- More maintenance overhead

## Detailed Requirements

### Frontend Requirements

#### 1. UI Components
- [ ] Add "Accessory-Only Mode" toggle to Model22 registration component
- [ ] Parent item search with autocomplete (similar to registration component)
- [ ] Display parent item details when selected
- [ ] Show available accessories with current quantities
- [ ] Accessory selection with quantity input
- [ ] Serial number inputs for accessories requiring them
- [ ] Validation messages for:
  - No parent item selected
  - Quantity exceeds available stock
  - Missing required serial numbers
  - Duplicate serial numbers

#### 2. Form Validation
- [ ] Parent item must be selected
- [ ] At least one accessory must be selected with quantity > 0
- [ ] Accessory quantity must not exceed available quantity
- [ ] Serial numbers must be provided if `requiresSerialNumbers = true`
- [ ] Serial numbers must match accessory quantity
- [ ] Serial numbers must be unique within the withdrawal
- [ ] Serial numbers must exist in the database for that accessory

#### 3. User Experience
- [ ] Clear visual distinction between normal and accessory-only mode
- [ ] Real-time validation feedback
- [ ] Autocomplete for serial number selection
- [ ] Display available serial numbers for each accessory
- [ ] Success/error messages after submission
- [ ] Form reset after successful submission

### Backend Requirements

#### 1. API Endpoint
```
POST /api/model22/withdraw-accessories
```

**Request Body:**
```json
{
  "itemId": 123,
  "voucherNumber": "VN-2024-001",
  "department": "IT Department",
  "recipientName": "John Doe",
  "recipientOrganization": "Tech Unit",
  "ethiopianDate": "ጥር 15, 2017",
  "role": "ELECTRONICS",
  "registeredBy": "Admin User",
  "accessories": [
    {
      "accessoryId": 456,
      "quantity": 2,
      "unitPrice": 50.00,
      "currency": "ETB",
      "serialNumbers": ["ACC-SN-001", "ACC-SN-002"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Accessories withdrawn successfully",
  "model22Id": 789
}
```

#### 2. Business Logic
- [ ] Validate parent item exists
- [ ] Validate all accessories belong to the parent item
- [ ] Validate accessory quantities don't exceed available stock
- [ ] Validate serial numbers if required
- [ ] Validate serial numbers exist and are available
- [ ] Create Model22 record with item quantity = 0
- [ ] Create Model22Item records for each accessory
- [ ] Update accessory quantities (decrement)
- [ ] Mark serial numbers as withdrawn
- [ ] Create transaction history entries
- [ ] Handle database transaction atomically

#### 3. Data Model Updates
- [ ] Ensure Model22Item can represent accessory-only withdrawals
- [ ] Add flag or indicator for accessory-only withdrawals (optional)
- [ ] Ensure transaction history distinguishes accessory movements

### Database Considerations

#### Existing Tables
- `Items` - Parent items
- `Accessories` - Accessories linked to items
- `AccessorySerialNumbers` - Serial numbers for accessories
- `Model22` - Withdrawal records
- `Model22Items` - Items in withdrawal
- `TransactionEntries` - Transaction history

#### Required Changes
- [ ] Verify Model22Item can handle accessory withdrawals
- [ ] Add index on AccessorySerialNumbers for performance
- [ ] Consider adding `IsAccessoryOnly` flag to Model22 (optional)

### Testing Requirements

#### Unit Tests
- [ ] Validate accessory quantity constraints
- [ ] Validate serial number requirements
- [ ] Validate serial number uniqueness
- [ ] Test transaction rollback on error

#### Integration Tests
- [ ] Test full accessory withdrawal flow
- [ ] Test with serial numbers
- [ ] Test without serial numbers
- [ ] Test multiple accessories in one withdrawal
- [ ] Test error scenarios (insufficient stock, invalid serial numbers)

#### UI Tests
- [ ] Test toggle between normal and accessory-only mode
- [ ] Test parent item search and selection
- [ ] Test accessory selection and quantity input
- [ ] Test serial number autocomplete
- [ ] Test form validation
- [ ] Test submission and success/error handling

## Implementation Plan

### Phase 1: Backend Implementation
1. Create `WithdrawAccessoriesRequest` DTO
2. Implement `POST /api/model22/withdraw-accessories` endpoint
3. Add validation logic
4. Add transaction management
5. Add unit tests

### Phase 2: Frontend Implementation
1. Add `isAccessoryOnlyMode` toggle to Model22 component
2. Add parent item search functionality
3. Add accessory selection UI
4. Add serial number inputs
5. Add form validation
6. Wire up to backend endpoint

### Phase 3: Testing & Refinement
1. Integration testing
2. UI/UX testing
3. Bug fixes
4. Performance optimization
5. Documentation updates

## Open Questions

### 1. Transaction History
**Question:** Should accessory-only withdrawals create separate transaction entries or be part of Model22 records?

**Recommendation:** Use Model22 records for consistency, but add a flag or indicator to distinguish accessory-only withdrawals.

### 2. Reporting
**Question:** How should accessory-only withdrawals appear in reports?

**Recommendation:** 
- Include in Model22 reports with clear indication
- Add filter option for "Accessory-Only" withdrawals
- Show parent item reference in reports

### 3. Permissions
**Question:** Should accessory-only withdrawals require different permissions?

**Recommendation:** Use same permissions as regular withdrawals (role-based).

### 4. Mixed Withdrawals
**Question:** Can users withdraw both main item AND accessories in the same transaction?

**Recommendation:** Yes, this should be supported. The toggle only enables "accessory-only" mode where main item quantity is not changed.

### 5. Item Details Display
**Question:** Should item details page show accessory transaction history separately?

**Recommendation:** Yes, add a section showing:
- Accessory receive history
- Accessory withdrawal history
- Current accessory quantities
- Available serial numbers per accessory

## Success Criteria

### Functional
- [ ] Users can withdraw accessories without changing main item quantity
- [ ] Serial numbers are properly tracked and validated
- [ ] Transaction history accurately reflects accessory movements
- [ ] Reports include accessory-only withdrawals

### Non-Functional
- [ ] Response time < 2 seconds for withdrawal submission
- [ ] UI is intuitive and consistent with receiving flow
- [ ] Error messages are clear and actionable
- [ ] No data loss or corruption during withdrawals

## Dependencies

### External
- None

### Internal
- Existing Model22 infrastructure
- Existing Item and Accessory models
- Existing transaction history system
- Existing serial number tracking

## Risks & Mitigation

### Risk 1: Data Inconsistency
**Risk:** Accessory quantities become out of sync with actual inventory

**Mitigation:**
- Use database transactions
- Add validation checks
- Implement audit logging
- Regular inventory reconciliation

### Risk 2: Serial Number Conflicts
**Risk:** Same serial number used in multiple withdrawals

**Mitigation:**
- Validate serial number availability before withdrawal
- Use database constraints
- Lock serial numbers during transaction

### Risk 3: User Confusion
**Risk:** Users confused by two withdrawal modes

**Mitigation:**
- Clear UI labels and instructions
- Tooltips and help text
- User training/documentation
- Consistent design with receiving flow

## Future Enhancements

1. **Bulk Accessory Withdrawal**: Withdraw accessories from multiple items at once
2. **Accessory Transfer**: Transfer accessories between items
3. **Accessory Return**: Return withdrawn accessories to inventory
4. **Accessory Maintenance Tracking**: Track accessories sent for maintenance
5. **Accessory Lifecycle Reports**: Full lifecycle tracking from receive to disposal

## References

- Existing accessory receiving implementation: `gofaFrontend/src/app/Warehose/registration/registration.component.ts`
- Backend add-accessories endpoint: `Gofabackend/Controllers/ItemController.cs` (lines 1660-1760)
- Model22 withdrawal component: `gofaFrontend/src/app/Model22/model22-registration/model22-registration.component.ts`
- Accessory model: `Gofabackend/Models/Accessory.cs`
- Model22 model: `Gofabackend/Models/Model22Item.cs`
