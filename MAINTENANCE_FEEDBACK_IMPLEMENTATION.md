# Maintenance Module - Feedback Implementation Plan

## Overview
Comprehensive fixes and enhancements based on user feedback from PPC, Team Leaders, Ministore, and Radio Main roles.

---

## PHASE 1: CRITICAL BUGS (High Priority)

### 1.1 PPC - Registration & Editing Issues
- [x] **Fix duplicate model number registration** - Maintenance model number registers twice
  - Added `isSubmitting` flag to prevent double-click submissions
  - Added backend duplicate check validation (409 Conflict response)
  - Disabled submit button during submission
  - Added user-friendly error messages
- [x] **Fix edit functionality** - Edit maintenance request not working
  - Fixed edit component to use correct update endpoint (`PUT /api/MaintenanceRequestRegister/{id}`)
  - Added separate service methods for update by ID vs works order number
  - Fixed data mapping in edit form submission
- [x] **Fix view functionality** - View maintenance request not working
  - Added proper service methods for fetching by ID and by works order number
  - Fixed modal-based view in list component
  - Corrected endpoint usage in request details component

### 1.2 Team Leader - Request Workflow
- [x] **Fix spare part request bug** - System incorrectly marks request as submitted if power fails before submit
  - Reordered submission logic: validate and submit spare parts first, then update maintenance request
  - If spare parts submission fails, maintenance request is NOT updated
  - Added proper error handling and user feedback
- [x] **Fix request routing** - Spare part requests going to dept head instead of proper channel
  - Changed initial routing to MAINTENANCE_LEADER (not team leader)
  - Added new endpoint `route-to-team-leader` for maintenance leader to route to appropriate team
  - Added mapping: POWER→PTEAM_LEADER, OFFICE_MACHINE→OTEAM_LEADER, VHF_RADIO→VTEAM_LEADER, HF_RADIO→HTEAM_LEADER
  - Added `by-current-stage` endpoint to filter requests by workflow stage
  - Added frontend service methods for routing workflow

### 1.3 Radio Main - Request Delivery
- [x] **Fix request delivery** - Spare part requests may not reach team leader
  - Added `pending-delivery` endpoint to fetch maintenance requests ready for delivery
  - Added `by-status` endpoint to filter requests by status
  - Updated delivery endpoint to also update related spare parts requests status
  - Spare parts requests now marked as "Delivered to Client" when maintenance is delivered
  - Added proper status tracking: "Maintenance Finished" → "Client Received"
  - Team leaders can now see pending deliveries through new endpoints

---

## PHASE 2: CORE FUNCTIONALITY (High Priority)

### 2.1 Search & Filter Implementation
- [x] Add search to "Delivering for Customers" page
  - Added search by Works Order Number, Serial Number, Model, Requested By
  - Added maintenance type filter dropdown
  - Added status filter dropdown
  - Added reset filters button
- [x] Add search to "View all requests" page
  - Already implemented with search by Works Order Number, Serial Number, ID
  - Added status filter (Maintenance Finished, Client Received)
- [x] Add filtering by Maintenance type
  - Implemented in "Delivering for Customers" page
  - Filters by statusStage field (POWER, OFFICE_MACHINE, VHF_RADIO, HF_RADIO)
- [x] Improve search functionality across all maintenance pages
  - Added consistent search/filter UI pattern
  - Added pagination support with search/filter
  - Added reset filters functionality

### 2.2 Pagination
- [x] Add pagination to "Delivering for Customers" page
  - Implemented with configurable page size (default 20)
  - Added page navigation buttons (Previous, Next, numbered pages)
  - Pagination updates when filters are applied
- [x] Add pagination to other list pages as needed
  - Already implemented in maintenance request view
  - Already implemented in maintenance request list

### 2.3 Status Tracking & Visibility
- [x] Team Leader: Show status after desk approval (quality check, approval status)
  - Added `update-status` endpoint to track maintenance status changes
  - Status updates are timestamped with `UpdatedAt` field
  - Team leaders can see current status through maintenance request view
- [x] Radio Main: Show status after pressing "maintain" (sent for quality, approved, etc.)
  - Spare parts requests now track status: "Pending", "Pending Delivery", "Delivered to Client"
  - Maintenance requests track status: "On Maintenance", "Quality Check", "Maintenance Finished"
  - Added `by-status` endpoint to filter requests by current status
- [x] Add "Waiting for sparepart" status to dropdown
  - Added `WAITING_FOR_SPARE_PART` constant to MaintenanceRequestStages
  - Added "Waiting for Spare Part" to valid status list
  - When status is set to "Waiting for Spare Part", related spare parts requests are updated
  - Spare parts requests marked as "Pending Delivery" and routed to MINISTORE

### 2.4 የተጠገኑ መረጃ Page (Finished Items)
- [ ] Filter to show only finished/completed maintenance items
- [ ] Improve የተጠጋኝ መሸኛ ቅ functionality
- [ ] Check and fix request register relationships

---

## PHASE 3: ROLE-BASED ACCESS (Medium Priority)

### 3.1 New Maintenance Roles
Create separate maintenance roles to avoid clash with store roles:
- [ ] `VHF_MAINTENANCE` - VHF Radio maintenance technician
- [ ] `HF_MAINTENANCE` - HF Radio maintenance technician
- [ ] `POWER_MAINTENANCE` - Power team maintenance technician
- [ ] `IT_MAINTENANCE` - IT team maintenance technician
- [ ] `MAINTENANCE_TEAM_LEADER` - Maintenance team leader

### 3.2 Role Implementation
- [ ] Update User model with new roles
- [ ] Update authentication/authorization
- [ ] Create role-based access controls for maintenance pages
- [ ] Separate VHF/HF maintenance access from store VHF/HF access

### 3.3 Technician Accounts
- [ ] All technicians should have individual accounts
- [ ] Track who maintained each item (technician name)
- [ ] Display technician info on maintenance records

---

## PHASE 4: REPORTING (Medium-High Priority)

### 4.1 PPC Reports
- [ ] Total maintained items with prices
- [ ] Total due out items
- [ ] Total items on maintenance
- [ ] Team-based breakdown (Power, Radio, IT)
- [ ] Equipment type breakdown
- [ ] Items/accessories reporting (similar to Supply & Distribution format)

### 4.2 Team Leader Reports
- [ ] Detailed cost reports (spare parts + man hour)
- [ ] Maintained items list
- [ ] Work order reports
- [ ] Team-specific reports

### 4.3 Ministore Reports
- [ ] Item reports
- [ ] Low stock alerts (items < 10)
- [ ] Spare parts distribution tracking (who received what)

### 4.4 Radio Main Reports
- [ ] Requested spare parts detail view
- [ ] Maintained items visibility
- [ ] Cost breakdown (spare + man hour)

---

## PHASE 5: DATA & WORKFLOW IMPROVEMENTS (Medium Priority)

### 5.1 Date Management
- [ ] Automatic date assignment
- [ ] Correct date formatting
- [ ] Ensure dates are accurate across all maintenance records

### 5.2 Cost Tracking
- [ ] Man hour rate: 250 per hour (configurable)
- [ ] Man hour price for office machine shop
- [ ] Clear cost breakdown (spare parts + man hour)
- [ ] Total cost calculation and display

### 5.3 Work Orders
- [ ] Implement work order system
- [ ] Work order generation
- [ ] Work order tracking

### 5.4 Ministore Integration
- [ ] Item verification when taken from ministore
- [ ] Low stock notifications (< 10 items)
- [ ] Track spare parts distribution

---

## PHASE 6: UX IMPROVEMENTS (Lower Priority)

### 6.1 Page Layout & Logic
- [ ] Fix "Do Out" page - show proper info
- [ ] Improve "View all requests" page layout
- [ ] Make pages logically organized

### 6.2 Language & Labels
- [ ] Correct language for all labels
- [ ] Consistent Amharic/English labeling
- [ ] Fix የተጠጋኝ መሸኛ ቅ labels

### 6.3 General UX
- [ ] Improve Radio Main UX
- [ ] Better navigation
- [ ] Clearer status indicators
- [ ] Improved form layouts

---

## IMPLEMENTATION NOTES

### Excluded Requirements
- **Power team multiple spare part requests** - NOT implementing (user rejected this)

### Database Changes Required
1. Add new maintenance roles to Users table
2. Add technician tracking to maintenance records
3. Add man hour rate configuration
4. Add work order tables
5. Add low stock alert thresholds

### API Endpoints Needed
1. Maintenance reports endpoints (PPC, Team Leader, Ministore)
2. Status tracking endpoints
3. Work order CRUD endpoints
4. Low stock alert endpoints
5. Spare parts distribution tracking

### Frontend Components Needed
1. Maintenance reports components
2. Enhanced search/filter components
3. Pagination components
4. Status tracking displays
5. Work order management UI

---

## ESTIMATED EFFORT

- **Phase 1 (Critical Bugs)**: 2-3 days
- **Phase 2 (Core Functionality)**: 3-4 days
- **Phase 3 (Role-Based Access)**: 2-3 days
- **Phase 4 (Reporting)**: 4-5 days
- **Phase 5 (Data & Workflow)**: 3-4 days
- **Phase 6 (UX Improvements)**: 2-3 days

**Total Estimated Time**: 16-22 days of development work

---

## NEXT STEPS

1. Review and approve this plan
2. Prioritize phases based on business needs
3. Start with Phase 1 (Critical Bugs)
4. Implement phase by phase with testing between each phase
5. Deploy to production incrementally

---

## QUESTIONS TO CLARIFY

1. What is the exact workflow for spare part requests? (PPC → Team Leader → Technician?)
2. What should happen when spare part request goes to "dept head"? Should it go to Team Leader instead?
3. What is the complete maintenance workflow from start to finish?
4. What are the exact statuses needed in the maintenance lifecycle?
5. What information should be on the work order?
6. Should low stock alerts be email/notification or just visual indicator?
