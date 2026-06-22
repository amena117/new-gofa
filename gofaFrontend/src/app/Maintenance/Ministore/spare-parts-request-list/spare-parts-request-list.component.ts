import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';

interface ResponseData {
  quantityApproved: number | null;
  approvedBy: string;
  remark: string;
  serialNumbers: string[];
  partCost: number | null;
}

@Component({
  selector: 'app-spare-parts-request-list',
  templateUrl: './spare-parts-request-list.component.html',
  styleUrls: ['./spare-parts-request-list.component.css']
})
export class SparePartsRequestListComponent implements OnInit {
  rawRequests: any[] = [];
  groupedBatches: any[] = [];
  viewingBatch: any = null;
  selectedRequest: any = null;
  availableSerialNumbers: string[] = [];
  allSpareParts: any[] = [];

  response: ResponseData = {
    quantityApproved: null,
    approvedBy: '',
    remark: '',
    serialNumbers: [],
    partCost: null
  };

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  userRole: string = '';

  // Filtering
  searchTerm: string = '';
  selectedStatusFilter: string = 'ALL';
  selectedDateFilter: string = 'ALL';
  filteredBatches: any[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  private readonly apiBase = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private maintenanceRequestService: MaintenanceRequestService
  ) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.fetchSparePartsRequests();
  }

  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();

    if (!role) {
      console.warn('User role not found. Session may have expired.');
      alert('Session expired or role not found. Please log in again.');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.userRole = role.toUpperCase();
  }

  fetchSparePartsRequests(): void {
    const url = `${this.apiBase}/api/SparePartsRequest/all`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('Raw API Response:', data);

        // ✅ Normalize property names for consistency
        const normalizedData = data.map(item => ({
          ...item,
          requestedBy: item.requestedBy ?? item.RequestedBy,
          requestType: item.requestType ?? item.RequestType,
          currentStage: item.currentStage ?? item.CurrentStage,
          id: item.id ?? item.Id,
          stockNumber: item.stockNumber ?? item.StockNumber,
          quantityAsked: item.quantityAsked ?? item.QuantityAsked,
          worksOrderNumber: item.worksOrderNumber ?? item.WorksOrderNumber,
          requestDate: item.requestDate ?? item.RequestDate ?? item.createdDate ?? item.CreatedDate
        }));

        // ✅ Filter based on user role
        const filteredRequests = normalizedData.filter(req => {
          switch (this.userRole) {
            case 'PTEAM_LEADER':
              return req.requestType === 'POWER' && 
                     ['PTEAM_LEADER', 'MAINTENANCE_LEADER', 'MINISTORE'].includes(req.currentStage);
            case 'OTEAM_LEADER':
              return req.requestType === 'OFFICE_MACHINE' && 
                     ['OTEAM_LEADER', 'MAINTENANCE_LEADER', 'MINISTORE'].includes(req.currentStage);
            case 'VTEAM_LEADER':
              return req.requestType === 'VHF_RADIO' && 
                     ['VTEAM_LEADER', 'MAINTENANCE_LEADER', 'MINISTORE'].includes(req.currentStage);
            case 'HTEAM_LEADER':
              return req.requestType === 'HF_RADIO' && 
                     ['HTEAM_LEADER', 'MAINTENANCE_LEADER', 'MINISTORE'].includes(req.currentStage);
            case 'RTEAM_LEADER':
              return req.requestType === 'RADIO_MAINTENANCE' && 
                     ['RTEAM_LEADER', 'MAINTENANCE_LEADER', 'MINISTORE'].includes(req.currentStage);
            case 'MAINTENANCE_LEADER':
              return req.currentStage === 'MAINTENANCE_LEADER' || req.currentStage === 'MINISTORE';
            case 'MINISTORE':
              return req.currentStage === 'MINISTORE';
            default:
              return false;
          }
        });

        // ✅ Sort by date in descending order (latest first)
        const sortedRequests = filteredRequests.sort((a, b) => {
          const dateA = new Date(a.requestDate || a.approvalDate || 0).getTime();
          const dateB = new Date(b.requestDate || b.approvalDate || 0).getTime();
          return dateB - dateA; // descending
        });

        // ✅ Add extra computed properties
        this.rawRequests = sortedRequests.map(req => ({
          ...req,
          isResponded: !!req.approvalDate || req.currentStage === 'COMPLETED'
        }));

        this.groupRequests();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching spare parts requests:', error);
        this.errorMessage = 'Failed to load spare parts requests.';
        this.isLoading = false;
      }
    });
  }

  groupRequests(): void {
    const groups = new Map<number, any[]>();
    this.rawRequests.forEach(req => {
      if (!groups.has(req.worksOrderNumber)) {
        groups.set(req.worksOrderNumber, []);
      }
      groups.get(req.worksOrderNumber)!.push(req);
    });

    this.groupedBatches = Array.from(groups.entries()).map(([woNumber, parts]) => {
      const first = parts[0];
      
      // Determine overall status for this batch
      let overallStatus = first.status || 'Pending Team Leader Approval';
      const allResponded = parts.every(p => p.isResponded);
      const anyResponded = parts.some(p => p.isResponded);
      
      if (allResponded) {
        overallStatus = 'Issued';
      } else if (anyResponded) {
        overallStatus = 'Partially Processed';
      }

      // Collect unique stock numbers to show a summary list
      const stockNumbersSummary = Array.from(new Set(parts.map(p => p.stockNumber))).join(', ');

      return {
        worksOrderNumber: woNumber,
        requestedBy: first.requestedBy,
        requestType: first.requestType,
        currentStage: first.currentStage,
        status: overallStatus,
        requestDate: first.requestDate,
        isResponded: allResponded,
        stockNumbersSummary: stockNumbersSummary,
        parts: parts
      };
    });

    this.applyFilters();

    // If viewingBatch is open, update its reference from the latest grouped data
    if (this.viewingBatch) {
      const updated = this.groupedBatches.find(b => b.worksOrderNumber === this.viewingBatch.worksOrderNumber);
      if (updated) {
        this.viewingBatch = updated;
      } else {
        this.viewingBatch = null;
      }
    }
  }

  applyFilters(): void {
    let batches = [...this.groupedBatches];

    // Status Filter
    if (this.selectedStatusFilter !== 'ALL') {
      batches = batches.filter(b => b.status === this.selectedStatusFilter);
    }

    // Date Filter
    if (this.selectedDateFilter !== 'ALL') {
      const now = new Date();
      let filterDate = new Date();
      switch(this.selectedDateFilter) {
        case '1WEEK': filterDate.setDate(now.getDate() - 7); break;
        case '1MONTH': filterDate.setMonth(now.getMonth() - 1); break;
        case '3MONTHS': filterDate.setMonth(now.getMonth() - 3); break;
        case '6MONTHS': filterDate.setMonth(now.getMonth() - 6); break;
        case '12MONTHS': filterDate.setFullYear(now.getFullYear() - 1); break;
      }
      batches = batches.filter(b => new Date(b.requestDate) >= filterDate);
    }

    // Search Filter
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      batches = batches.filter(b => 
        b.worksOrderNumber?.toString().toLowerCase().includes(term) ||
        b.requestedBy?.toLowerCase().includes(term) ||
        b.stockNumbersSummary?.toLowerCase().includes(term)
      );
    }

    this.filteredBatches = batches;
    this.currentPage = 1; // Reset to first page when filters change
  }

  get paginatedBatches(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredBatches.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredBatches.length / this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get totalRequests(): number {
    return this.groupedBatches.length;
  }

  get pendingApprovalCount(): number {
    return this.groupedBatches.filter(b => 
      b.currentStage === 'MAINTENANCE_LEADER' && !b.isResponded
    ).length;
  }

  get approvedCount(): number {
    return this.groupedBatches.filter(b => b.isResponded).length;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  hasPendingParts(batch: any): boolean {
    if (!batch || !batch.parts) return false;
    return batch.parts.some((p: any) => p.currentStage === this.userRole && !p.isResponded);
  }

  async approveAllParts(batch: any): Promise<void> {
    const userRole = this.authService.getRole()?.trim();
    if (!userRole) {
      alert('User role not found. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    const stageMap: Record<string, string> = {
      'PTEAM_LEADER': 'MAINTENANCE_LEADER',
      'OTEAM_LEADER': 'MAINTENANCE_LEADER',
      'RTEAM_LEADER': 'MAINTENANCE_LEADER',
      'HTEAM_LEADER': 'MAINTENANCE_LEADER',
      'VTEAM_LEADER': 'MAINTENANCE_LEADER',
      'MAINTENANCE_LEADER': 'MINISTORE',
      'MINISTORE': 'COMPLETED'
    };

    const nextStage = stageMap[userRole];
    if (!nextStage) {
      alert(`No approval path configured for role: ${userRole}`);
      return;
    }

    let newStatus = '';
    if (userRole === 'MAINTENANCE_LEADER') {
      newStatus = 'Approved - Ready for Pickup';
    } else if (userRole.endsWith('TEAM_LEADER')) {
      newStatus = 'Pending Maintenance Leader Approval';
    }

    const pendingParts = batch.parts.filter((p: any) => p.currentStage === userRole && !p.isResponded);
    if (pendingParts.length === 0) {
      alert('No pending parts to approve in this batch.');
      return;
    }

    if (!confirm(`Are you sure you want to approve all ${pendingParts.length} parts in this batch?`)) {
      return;
    }

    let successCount = 0;
    for (const part of pendingParts) {
      const updatedDto = {
        RequestedBy: userRole,
        CurrentStage: nextStage,
        Status: newStatus
      };
      const url = `${this.apiBase}/api/SparePartsRequest/${part.id}/update-requested-by`;
      try {
        await this.http.patch(url, updatedDto).toPromise();
        part.currentStage = nextStage;
        part.status = newStatus;
        
        // Update in raw list
        this.rawRequests = this.rawRequests.map(r => r.id === part.id ? { ...r, currentStage: nextStage, status: newStatus } : r);
        successCount++;
      } catch (err) {
        console.error(`Error approving part #${part.id}:`, err);
      }
    }

    // ✅ Also update the MaintenanceRequestRegister status when a team leader approves
    if (successCount > 0 && userRole.endsWith('TEAM_LEADER')) {
      try {
        const maintenanceStatusDto = { Status: 'Waiting for Maintenance Leader Approval' };
        const maintenanceStatusUrl = `${this.apiBase}/api/MaintenanceRequestRegister/update-status/${batch.worksOrderNumber}`;
        await this.http.put(maintenanceStatusUrl, maintenanceStatusDto).toPromise();
        console.log('✅ MaintenanceRequestRegister status updated to Waiting for Maintenance Leader Approval');
      } catch (err) {
        console.warn('⚠️ Could not update MaintenanceRequestRegister status:', err);
      }
    }

    // ✅ Also update the MaintenanceRequestRegister status when maintenance leader approves
    if (successCount > 0 && userRole === 'MAINTENANCE_LEADER') {
      try {
        const maintenanceStatusDto = { Status: 'Waiting for Ministore' };
        const maintenanceStatusUrl = `${this.apiBase}/api/MaintenanceRequestRegister/update-status/${batch.worksOrderNumber}`;
        await this.http.put(maintenanceStatusUrl, maintenanceStatusDto).toPromise();
        console.log('✅ MaintenanceRequestRegister status updated to Waiting for Ministore');
      } catch (err) {
        console.warn('⚠️ Could not update MaintenanceRequestRegister status:', err);
      }
    }

    alert(`Successfully approved ${successCount} parts.`);
    this.groupRequests();
    this.maintenanceRequestService.triggerNotificationsRefresh();
  }

  rejectRequest(id: number): void {
    if (!confirm('Are you sure you want to reject this request?')) return;

    const url = `${this.apiBase}/api/SparePartsRequest/${id}`;
    this.http.delete(url).subscribe({
      next: () => {
        alert('Request rejected successfully.');
        this.rawRequests = this.rawRequests.filter(req => req.id !== id);
        this.groupRequests();
        this.maintenanceRequestService.triggerNotificationsRefresh();
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        alert('Failed to reject the request.');
      }
    });
  }

  acceptRequest(id: number, stockNumber: string): void {
    this.router.navigate(['/maintenance/receive-spare-form-12'], {
      queryParams: { id, stockNumber }
    }).catch(err => console.error('Navigation failed:', err));
  }

  openRespondForm(request: any): void {
    this.selectedRequest = { ...request };
    this.response = {
      quantityApproved: request.quantityAsked ?? 1,
      approvedBy: '',
      remark: '',
      serialNumbers: Array(request.quantityAsked ?? 1).fill(''),
      partCost: null
    };
    this.fetchAvailableSerialNumbers(request.stockNumber);
  }

  onQuantityApprovedChange(): void {
    const qty = this.response.quantityApproved ?? 0;
    const current = this.response.serialNumbers;
    if (qty > current.length) {
      // grow
      this.response.serialNumbers = [...current, ...Array(qty - current.length).fill('')];
    } else {
      // shrink
      this.response.serialNumbers = current.slice(0, qty);
    }
  }

  getAvailableForSlot(slotIndex: number): string[] {
    // Exclude serials already picked in other slots
    const picked = this.response.serialNumbers.filter((s, i) => i !== slotIndex && s);
    return this.availableSerialNumbers.filter(s => !picked.includes(s));
  }

  fetchAvailableSerialNumbers(stockNumber: string): void {
    if (!stockNumber) return;

    const status = encodeURIComponent('Available in stock');
    const url = `${this.apiBase}/api/MiniStoreBinCard/${stockNumber}/serials?status=${status}`;

    console.log('Fetching available serials from:', url);

    this.http.get<string[]>(url).subscribe({
      next: (data) => {
        console.log('Available serial numbers:', data);
        this.availableSerialNumbers = data || [];
      },
      error: (err) => {
        console.error('Error fetching serial numbers:', err);
        this.availableSerialNumbers = [];
      }
    });
  }

  submitResponse(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const userRole = this.authService.getRole()?.trim();
    if (!userRole) {
      alert('Session expired. Please log in again.');
      this.router.navigate(['/login']);
      this.isSubmitting = false;
      return;
    }

    if (!this.response.quantityApproved || !this.response.serialNumbers.length ||
        this.response.serialNumbers.some(s => !s)) {
      alert('Please select a serial number for every approved unit.');
      this.isSubmitting = false;
      return;
    }

    if (!this.response.partCost || this.response.partCost <= 0) {
      alert('Part Cost is required. Please enter the cost of the spare part.');
      this.isSubmitting = false;
      return;
    }

    if (this.response.quantityApproved > this.selectedRequest.quantityAsked) {
      alert('Quantity Approved cannot exceed Quantity Asked.');
      this.isSubmitting = false;
      return;
    }

    const firstName = this.authService.getFirstName() || '';
    const lastName = this.authService.getLastName() || '';
    const fullName = `${firstName} ${lastName}`.trim() || userRole;

    const updatedRequest = {
      id: this.selectedRequest.id,
      worksOrderNumber: this.selectedRequest.worksOrderNumber,
      stockNumber: this.selectedRequest.stockNumber,
      quantityApproved: this.response.quantityApproved,
      approvedBy: fullName,
      approvalDate: new Date().toISOString(),
      remark: this.response.remark,
      serialNumber: this.response.serialNumbers.join(', ')
    };

    // If part cost was entered, update it on the maintenance request
    const partCost = this.response.partCost;
    if (partCost != null && partCost > 0) {
      const costUrl = `${this.apiBase}/api/SparePartsRequest/update-part-cost/${this.selectedRequest.worksOrderNumber}`;
      this.http.put(costUrl, partCost).subscribe({
        next: () => console.log('Part cost updated'),
        error: (err) => console.warn('Could not update part cost:', err)
      });
    }

    const updateUrl = `${this.apiBase}/api/SparePartsRequest/${this.selectedRequest.id}`;
    this.http.put(updateUrl, updatedRequest).subscribe({
      next: () => {
        const giveSpareDto = {
          StockNumber: String(this.selectedRequest.stockNumber),
          SerialNumbers: this.response.serialNumbers,
          GivenTo: this.selectedRequest.requestedBy,
          DateGiven: new Date().toISOString()
        };

        console.log('📦 Sending giveSpareDto:', giveSpareDto);

        const giveSpareUrl = `${this.apiBase}/api/MiniStoreBinCard/give-spare`;
        this.http.put(giveSpareUrl, giveSpareDto).subscribe({
          next: () => {
            const firstName = this.authService.getFirstName() || '';
            const lastName = this.authService.getLastName() || '';
            const fullName = `${firstName} ${lastName}`.trim() || userRole;

            const stageUpdateDto = {
              RequestedBy: fullName,
              CurrentStage: 'COMPLETED',
              Status: 'Issued'
            };

            const stageUpdateUrl = `${this.apiBase}/api/SparePartsRequest/${this.selectedRequest.id}/update-requested-by`;
            this.http.patch(stageUpdateUrl, stageUpdateDto).subscribe({
              next: () => {
                alert('✅ Response submitted, serial marked as Given, and request marked as Issued.');
                
                // Update in rawRequests
                this.rawRequests = this.rawRequests.map(req =>
                  req.id === this.selectedRequest.id
                    ? { ...req, ...updatedRequest, isResponded: true, currentStage: 'COMPLETED', status: 'Issued' }
                    : req
                );

                // ✅ Check if ALL spare parts for this works order are now COMPLETED
                // If so, update the maintenance request back to "On Maintaining"
                const worksOrderNumber = this.selectedRequest.worksOrderNumber;
                const allDone = this.rawRequests
                  .filter(r => r.worksOrderNumber === worksOrderNumber)
                  .every(r => r.id === this.selectedRequest.id
                    ? true  // the one we just issued
                    : r.currentStage === 'COMPLETED' || r.status === 'Issued' || r.status === 'Rejected'
                  );

                if (allDone) {
                  const maintenanceStatusUrl = `${this.apiBase}/api/MaintenanceRequestRegister/update-status/${worksOrderNumber}`;
                  this.http.put(maintenanceStatusUrl, { Status: 'On Maintenance' }).subscribe({
                    next: () => console.log('✅ Maintenance request status updated to On Maintenance'),
                    error: (err) => console.warn('⚠️ Could not update maintenance request status:', err)
                  });
                }
                
                this.groupRequests();
                this.maintenanceRequestService.triggerNotificationsRefresh();
                this.cancelResponse();
                this.isSubmitting = false;
              },
              error: (err) => {
                console.error('Error updating stage to COMPLETED:', err);
                alert('Failed to mark request as COMPLETED.');
                this.isSubmitting = false;
              }
            });
          },
          error: (err) => {
            console.error('❌ Error updating serial number status:', err);
            alert('Failed to update serial number status. Please try again.');
            this.isSubmitting = false;
          }
        });
      },
      error: (err) => {
        console.error('Error updating SparePartsRequest:', err);
        alert('Failed to submit the request update.');
        this.isSubmitting = false;
      }
    });
  }

  cancelResponse(): void {
    this.selectedRequest = null;
    this.response = {
      quantityApproved: null,
      approvedBy: '',
      remark: '',
      serialNumbers: [],
      partCost: null
    };
    this.availableSerialNumbers = [];
    this.isSubmitting = false;
  }

  approveRequest(request: any): void {
    const userRole = this.authService.getRole()?.trim();
    if (!userRole) {
      alert('User role not found. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    const stageMap: Record<string, string> = {
      'PTEAM_LEADER': 'MAINTENANCE_LEADER',
      'OTEAM_LEADER': 'MAINTENANCE_LEADER',
      'RTEAM_LEADER': 'MAINTENANCE_LEADER',
      'HTEAM_LEADER': 'MAINTENANCE_LEADER',
      'VTEAM_LEADER': 'MAINTENANCE_LEADER',
      'MAINTENANCE_LEADER': 'MINISTORE',
      'MINISTORE': 'COMPLETED'
    };

    const nextStage = stageMap[userRole];
    if (!nextStage) {
      alert(`No approval path configured for role: ${userRole}`);
      return;
    }

    // ✅ Update Status based on who is approving
    let newStatus = request.status;
    if (userRole === 'MAINTENANCE_LEADER') {
      newStatus = 'Approved - Ready for Pickup';
    } else if (userRole.endsWith('TEAM_LEADER')) {
      newStatus = 'Pending Maintenance Leader Approval';
    }

    const updatedDto = {
      RequestedBy: userRole,
      CurrentStage: nextStage,
      Status: newStatus
    };

    const url = `${this.apiBase}/api/SparePartsRequest/${request.id}/update-requested-by`;
    this.http.patch(url, updatedDto).subscribe({
      next: () => {
        alert(`Request approved and moved to ${nextStage}.`);
        
        // Update in rawRequests
        this.rawRequests = this.rawRequests.map(req =>
          req.id === request.id
            ? { ...req, currentStage: nextStage, status: newStatus }
            : req
        );
        this.groupRequests();

        // ✅ Update MaintenanceRequestRegister status
        let maintenanceStatus = '';
        if (userRole.endsWith('TEAM_LEADER')) {
          maintenanceStatus = 'Waiting for Maintenance Leader Approval';
        } else if (userRole === 'MAINTENANCE_LEADER') {
          maintenanceStatus = 'Waiting for Ministore';
        }

        if (maintenanceStatus) {
          const maintenanceStatusUrl = `${this.apiBase}/api/MaintenanceRequestRegister/update-status/${request.worksOrderNumber}`;
          this.http.put(maintenanceStatusUrl, { Status: maintenanceStatus }).subscribe({
            next: () => console.log(`✅ Maintenance status updated to ${maintenanceStatus}`),
            error: (err) => console.warn('⚠️ Could not update maintenance status:', err)
          });
        }

        this.maintenanceRequestService.triggerNotificationsRefresh();
      },
      error: (err) => {
        console.error('Error approving request:', err);
        alert('Failed to approve the request.');
      }
    });
  }

  isMinistore(): boolean {
    return this.userRole === 'MINISTORE';
  }

  isTeamLeader(): boolean {
    return ['PTEAM_LEADER', 'OTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'RTEAM_LEADER'].includes(this.userRole);
  }

  goToRejectForm(worksOrderNumber: number): void {
    this.router.navigate(['/maintenance/reject-request'], {
      queryParams: { worksOrderNumber }
    }).catch(err => console.error('Navigation failed:', err));
  }

  goToRejectPartForm(part: any): void {
    this.router.navigate(['/maintenance/reject-request'], {
      queryParams: { 
        worksOrderNumber: part.worksOrderNumber,
        sparePartId: part.id
      }
    }).catch(err => console.error('Navigation failed:', err));
  }
}
