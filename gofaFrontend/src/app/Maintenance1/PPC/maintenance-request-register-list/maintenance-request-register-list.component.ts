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
  // Data & State
  maintenanceRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];

  isLoading = true;
  error: string | null = null;
  searchSerialNo: string = '';

  // Modals
  editRequest: any = {};

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;

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
  this.maintenanceRequestService.getMaintenanceRequests().subscribe(
    (response) => {
      this.maintenanceRequests = response.items || response;

      // 👇 SIMPLE SORT: Latest first (assuming 'requestDate' is your date field)
      this.maintenanceRequests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

      this.filteredRequests = [...this.maintenanceRequests];
      this.currentPage = 1;
      this.updatePagination();
      this.isLoading = false;
    },
    (error) => {
      this.error = 'Failed to load maintenance requests.';
      this.isLoading = false;
    }
  );
}

  /** ================= SEARCH ================= */
  onSearchSerialNo(): void {
    const term = this.searchSerialNo.trim().toLowerCase();
    if (term) {
      this.filteredRequests = this.maintenanceRequests.filter((request) =>
        request.serialNoOfEquip?.toLowerCase().includes(term)
      );
    } else {
      this.filteredRequests = [...this.maintenanceRequests];
    }
    this.currentPage = 1; // reset to first page after search
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

  /** ================= MODALS ================= */
  viewDetails(request: any): void {
    // Navigate to request details page using worksOrderNumber
    this.router.navigate(['/maintenance/request-details', request.worksOrderNumber]);
  }

  openEditModal(request: any): void {
    this.editRequest = { ...request };
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      this.openModalById('editModal');
    }, 0);
  }

  onEditSubmit(): void {
    const id = this.editRequest.id;
    const updatedData = {
      nomenclature: this.editRequest.nomenclature,
      quantity: this.editRequest.quantity,
      requestedBy: this.editRequest.requestedBy,
      serialNoOfEquip: this.editRequest.serialNoOfEquip,
      briefDescriptionOfWork: this.editRequest.briefDescriptionOfWork,
      dateWorkOrderReceived: this.editRequest.dateWorkOrderReceived,
      equipmentTypeId: this.editRequest.equipmentTypeId,
      statusStage: this.editRequest.statusStage,
      letterId: this.editRequest.letterId,
      currentHandler: this.editRequest.currentHandler
    };

    this.maintenanceRequestService.updateMaintenanceRequestById(id, updatedData).subscribe(
      () => {
        alert('Request updated successfully! / መጠየቂያው በተሳካ ሁኔታ ተዘምኗል!');
        this.fetchMaintenanceRequests();
        this.closeModalById('editModal');
      },
      (error) => {
        console.error('Update failed:', error);
        alert('Failed to update request. Please try again. / መጠየቂያውን ማዘመን አልተሳካም። እባክዎ እንደገና ይሞክሩ።');
      }
    );
  }

  /** ================= ACTIONS ================= */
  sendRequest(worksOrderNumber: number): void {
    this.router.navigate(['maintenance/assign-maintenance'], {
      queryParams: { worksOrderNumber }
    });
  }

  deleteRequest(id: number): void {
    if (confirm('Are you sure you want to delete this request?')) {
      this.maintenanceRequestService.deleteMaintenanceRequest(id).subscribe(
        () => {
          this.maintenanceRequests = this.maintenanceRequests.filter(
            (req) => req.id !== id
          );
          this.applyFilter();
          alert('Request deleted successfully.');
        },
        (error) => {
          this.error = 'Failed to delete the request.';
          console.error('Deletion error:', error);
          alert('Failed to delete the request. Please try again.');
        }
      );
    }
  }

  /** ================= STATUS HELPERS ================= */
  getStatusClass(request: any): string {
    if (request.repairFinishDate) return 'badge-success';
    if (request.status === 'On Maintaining') return 'badge-info';
    return 'badge-warning';
  }

  getStatusText(request: any): string {
    if (request.repairFinishDate) return 'Completed';
    if (request.status === 'On Maintaining') return 'On Maintaining';
    return 'In Progress';
  }

  isSendRequestDisabled(status: string): boolean {
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

  applyFilter(): void {
    this.onSearchSerialNo();
  }
}
