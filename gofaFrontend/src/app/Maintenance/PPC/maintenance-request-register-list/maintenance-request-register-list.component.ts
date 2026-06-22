import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../services/maintenance-request.service';
import { Router } from '@angular/router';

declare var bootstrap: any;

@Component({
  selector: 'app-maintenance-request-register-list',
  templateUrl: './maintenance-request-register-list.component.html',
  styleUrls: ['./maintenance-request-register-list.component.css']
})
export class MaintenanceRequestRegisterListComponent implements OnInit {

  maintenanceRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];

  isLoading = true;
  error: string | null = null;

  // Search & filter
  searchTerm = '';
  statusFilter = 'all';

  // Edit modal
  editRequest: any = {};

  // Pagination
  currentPage = 1;
  itemsPerPage = 15;

  constructor(
    private maintenanceRequestService: MaintenanceRequestService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchMaintenanceRequests();
  }

  // ── Fetch ──────────────────────────────────────────────────────────

  fetchMaintenanceRequests(): void {
    this.isLoading = true;
    this.maintenanceRequestService.getMaintenanceRequests('').subscribe({
      next: (data: any[]) => {
        this.maintenanceRequests = data.sort(
          (a, b) => new Date(b.dateWorkOrderReceived).getTime() - new Date(a.dateWorkOrderReceived).getTime()
        );
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load maintenance requests.';
        this.isLoading = false;
      }
    });
  }

  // ── Filters ────────────────────────────────────────────────────────

  applyFilters(): void {
    let result = [...this.maintenanceRequests];

    // Status filter — supports both exact status strings and grouped keys
    if (this.statusFilter !== 'all') {
      if (this.statusFilter === 'pending') {
        result = result.filter(req => req.status === 'Pending');
      } else if (this.statusFilter === 'inprogress') {
        result = result.filter(req => this.isInProgress(req));
      } else if (this.statusFilter === 'completed') {
        result = result.filter(req => this.isCompleted(req));
      } else {
        // Exact status match from dropdown
        result = result.filter(req => req.status === this.statusFilter);
      }
    }

    // Search
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(req =>
        req.serialNoOfEquip?.toLowerCase().includes(term) ||
        req.model?.toLowerCase().includes(term) ||
        req.requestedBy?.toLowerCase().includes(term) ||
        req.worksOrderNumber?.toString().includes(term) ||
        req.equipmentTypeName?.toLowerCase().includes(term) ||
        req.briefDescriptionOfWork?.toLowerCase().includes(term)
      );
    }

    this.filteredRequests = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  // ── Pagination ─────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.itemsPerPage);
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  // ── Navigation ─────────────────────────────────────────────────────

  viewDetails(request: any): void {
    this.router.navigate(['/maintenance/request-details', request.worksOrderNumber]);
  }

  sendRequest(worksOrderNumber: number): void {
    this.router.navigate(['maintenance/assign-maintenance'], { queryParams: { worksOrderNumber } });
  }

  changeDepartment(worksOrderNumber: number): void {
    this.router.navigate(['maintenance/reassign-maintenance'], { queryParams: { worksOrderNumber } });
  }

  registerNew(): void {
    this.router.navigate(['/maintenance/request-form']);
  }

  // ── Edit ───────────────────────────────────────────────────────────

  openEditModal(request: any, event: MouseEvent): void {
    event.stopPropagation();
    this.editRequest = { ...request };
    this.openModalById('editModal');
  }

  onFullEditSubmit(): void {
    const dto = {
      serialNoOfEquip: this.editRequest.serialNoOfEquip,
      equipmentTypeId: this.editRequest.equipmentTypeId,
      model: this.editRequest.model,
      briefDescriptionOfWork: this.editRequest.briefDescriptionOfWork,
      dateWorkOrderReceived: this.editRequest.dateWorkOrderReceived,
      statusStage: this.editRequest.statusStage
    };

    this.maintenanceRequestService.updateFullMaintenanceRequest(this.editRequest.worksOrderNumber, dto)
      .subscribe({
        next: () => {
          this.fetchMaintenanceRequests();
          this.closeModalById('editModal');
        },
        error: () => alert('Failed to update request.')
      });
  }

  // ── Status helpers ─────────────────────────────────────────────────

  isInProgress(req: any): boolean {
    return ['In Progress', 'On Maintaining', 'On Maintenance', 'Quality Check',
            'Waiting for Spare Part', 'Waiting for Approval', 'Spare Part Issued',
            'Approved - Waiting for Parts', 'Waiting for Maintenance Leader Approval',
            'Waiting for Ministore'].includes(req.status);
  }

  isCompleted(req: any): boolean {
    return req.status === 'Maintenance Finished' || req.status === 'Client Received';
  }

  getStatusClass(req: any): string {
    const s = req.status;
    if (s === 'Do Out' || s === 'Rejected') return 'status-danger';
    if (this.isCompleted(req))              return 'status-success';
    if (s === 'Quality Check' || s === 'Waiting for Spare Part' || s.includes('Needs Parts')) return 'status-warning';
    if (s === 'On Maintaining' || s === 'On Maintenance' || s === 'Spare Part Issued' || s === 'In Progress') return 'status-info';
    if (s === 'Waiting for Approval' || s.includes('Waiting')) return 'status-warning';
    return 'status-secondary';
  }

  getStatusText(req: any): string {
    const map: Record<string, string> = {
      'Pending':                                  'Not Sent',
      'Waiting for Approval':                     'Waiting Approval',
      'In Progress':                              'In Progress',
      'On Maintaining':                           'On Maintenance',
      'On Maintenance':                           'On Maintenance',
      'Quality Check':                            'Quality Check',
      'Waiting for Spare Part':                   'Needs Parts',
      'Approved - Waiting for Parts':             'Needs Parts',
      'Spare Part Issued':                        'Spare Part Issued',
      'Waiting for Maintenance Leader Approval':  'Leader Approval',
      'Waiting for Ministore':                    'Waiting Ministore',
      'Maintenance Finished':                     'Finished',
      'Client Received':                          'Delivered',
    };
    return map[req.status] ?? req.status ?? 'Not Sent';
  }

  // ── Stats ──────────────────────────────────────────────────────────

  getTotalRequests():     number { return this.maintenanceRequests.length; }
  getPendingRequests():   number { return this.maintenanceRequests.filter(r => r.status === 'Pending').length; }
  getInProgressRequests():number { return this.maintenanceRequests.filter(r => this.isInProgress(r)).length; }
  getCompletedRequests(): number { return this.maintenanceRequests.filter(r => this.isCompleted(r)).length; }

  // ── Modal utils ────────────────────────────────────────────────────

  openModalById(id: string): void {
    const el = document.getElementById(id);
    if (el) new bootstrap.Modal(el).show();
  }

  closeModalById(id: string): void {
    const el = document.getElementById(id);
    if (el) bootstrap.Modal.getInstance(el)?.hide();
  }
}
