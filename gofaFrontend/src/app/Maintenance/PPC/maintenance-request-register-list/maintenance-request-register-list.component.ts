import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../services/maintenance-request.service';
import { Router } from '@angular/router';

// Declare Bootstrap to avoid TypeScript errors
declare var bootstrap: any;

@Component({
  selector: 'app-maintenance-request-register-list',
  templateUrl: './maintenance-request-register-list.component.html',
  styleUrls: ['./maintenance-request-register-list.component.css']
})
export class MaintenanceRequestRegisterListComponent implements OnInit {
  /** ================= DATA & STATE ================= */
  maintenanceRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];

  isLoading = true;
  error: string | null = null;
  searchSerialNo: string = '';

  /** ================= MODALS ================= */
  selectedRequest: any = null;
  showFullDetails = false;
  editRequest: any = {};

  /** ================= PAGINATION ================= */
  currentPage = 1;
  itemsPerPage = 20;

  /** ================= FILTER ================= */
  statusFilter = 'pending'; // Only show "In Progress" by default

  constructor(
    private maintenanceRequestService: MaintenanceRequestService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchMaintenanceRequests();
  }

  /** ================= DATA FETCH ================= */
  fetchMaintenanceRequests(): void {
  this.isLoading = true;
  this.maintenanceRequestService.getMaintenanceRequests('In Progress').subscribe({
    next: (data: any[]) => {
      console.log('Fetched maintenance requests:', data);

      // No need to remap unless your API returns inconsistent casing
      this.maintenanceRequests = data;

      // Optional: filter only "Pending" or "In Progress"
      this.filteredRequests = this.maintenanceRequests.filter(
        req => req.status === 'Pending' || req.status === 'In Progress'
      );

      // Sort by latest date
      this.filteredRequests.sort(
        (a, b) => new Date(b.dateWorkOrderReceived).getTime() - new Date(a.dateWorkOrderReceived).getTime()
      );

      this.currentPage = 1;
      this.updatePagination();
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error fetching maintenance requests:', err);
      this.error = 'Failed to load maintenance requests.';
      this.isLoading = false;
    }
  });
}


  /** ================= SEARCH ================= */
  onSearchSerialNo(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  /** ================= FILTERING ================= */
  applyFilters(): void {
    let filtered = [...this.maintenanceRequests];

    // Filter by serial number if search term exists
    const term = this.searchSerialNo.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(req =>
        req.serialNoOfEquip?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.statusFilter) {
      filtered = filtered.filter(req => req.status === this.statusFilter);
    }

    this.filteredRequests = filtered;
    this.updatePagination();
  }

  /** ================= PAGINATION ================= */
  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.itemsPerPage);
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRequests = this.filteredRequests.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  /** ================= VIEW DETAILS MODAL ================= */
  viewDetails(request: any): void {
    this.selectedRequest = { ...request };
    this.showFullDetails = false;
    this.openModalById('viewModal');
  }

  toggleFullDetails(): void {
    this.showFullDetails = !this.showFullDetails;
  }

  /** ================= EDIT MODAL ================= */
  openEditModal(request: any): void {
    this.editRequest = { ...request };
    this.openModalById('editModal');
  }

  onFullEditSubmit(): void {
    const worksOrderNumber = this.editRequest.worksOrderNumber;

    const dto = {
      serialNoOfEquip: this.editRequest.serialNoOfEquip,
      equipmentTypeId: this.editRequest.equipmentTypeId,
      model: this.editRequest.model,
      requestedBy: this.editRequest.requestedBy,
      briefDescriptionOfWork: this.editRequest.briefDescriptionOfWork,
      dateWorkOrderReceived: this.editRequest.dateWorkOrderReceived,
      statusStage: this.editRequest.statusStage
    };

    this.maintenanceRequestService.updateFullMaintenanceRequest(worksOrderNumber, dto)
      .subscribe(
        () => {
          this.fetchMaintenanceRequests();
          this.closeModalById('editModal');
          alert('Maintenance request updated successfully.');
        },
        (error) => {
          console.error('Full update failed:', error);
          alert('Failed to update request.');
        }
      );
  }

  /** ================= ACTIONS ================= */
  sendRequest(worksOrderNumber: number): void {
    this.router.navigate(['maintenance/assign-maintenance'], {
      queryParams: { worksOrderNumber }
    });
  }

  deleteRequest(request: any): void {
    if (request.status !== 'Pending') {
      alert('You cannot delete this request because it has already been sent or processed.');
      return;
    }

    if (confirm('Are you sure you want to delete this request?')) {
      this.maintenanceRequestService.deleteMaintenanceRequest(request.worksOrderNumber).subscribe(
        () => {
          this.maintenanceRequests = this.maintenanceRequests.filter(
            (req) => req.worksOrderNumber !== request.worksOrderNumber
          );
          this.applyFilters();
          alert('Request deleted successfully.');
        },
        (error) => {
          this.error = 'Failed to delete the request.';
          console.error('Deletion error:', error);
        }
      );
    }
  }

  /** ================= STATUS HELPERS ================= */
  getStatusClass(request: any): string {
    if (request.repairFinishDate) return 'badge bg-success';
    if (request.status === 'On Maintaining') return 'badge bg-info text-dark';
    if (request.status === 'In Progress') return 'badge bg-warning text-dark';
    return 'badge bg-secondary';
  }

  getStatusText(request: any): string {
    if (request.repairFinishDate) return 'Completed';
    if (request.status === 'On Maintaining') return 'On Maintaining';
    if (request.status === 'In Progress') return 'In Progress';
    return 'Unknown';
  }

  isSendRequestDisabled(status: string): boolean {
    return status !== 'Pending';
  }

  isDeleteDisabled(status: string): boolean {
    return status !== 'Pending';
  }

  /** ================= UTILITIES ================= */
  openModalById(modalId: string): void {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    } else {
      console.error(`Modal with ID "${modalId}" not found.`);
    }
  }

  closeModalById(modalId: string): void {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal?.hide();
    }
  }
}
