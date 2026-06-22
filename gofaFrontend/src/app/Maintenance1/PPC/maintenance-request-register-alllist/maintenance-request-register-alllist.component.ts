import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-maintenance-request-register-alllist',
  templateUrl: './maintenance-request-register-alllist.component.html',
  styleUrls: ['./maintenance-request-register-alllist.component.css']
})
export class MaintenanceRequestRegisterAlllistComponent implements OnInit {
  allRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  selectedRequest: any = null;

  // Search & Filter
  searchTerm = '';
  searchType = 'worksOrderNumber';
  selectedStatus = '';
  selectedMaintenanceType = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;

  statuses = ['Pending', 'On Maintaining', 'On Maintenance', 'Quality Check', 'Maintenance Finished', 'Client Received', 'Do Out', 'Waiting for Spare Part'];
  maintenanceTypes = ['POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO'];
  searchTypes = [
    { value: 'worksOrderNumber', label: 'Works Order No' },
    { value: 'serialNoOfEquip', label: 'Serial No' },
    { value: 'nomenclature', label: 'Nomenclature' },
    { value: 'requestedBy', label: 'Requested By' },
    { value: 'model', label: 'Model' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchRequests();
  }

  fetchRequests(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`).subscribe(
      (data) => {
        this.allRequests = data;
        this.filteredRequests = [...data];
        this.currentPage = 1;
        this.applyPagination();
        this.isLoading = false;
      },
      () => {
        this.errorMessage = 'Failed to load maintenance requests.';
        this.isLoading = false;
      }
    );
  }

  applySearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredRequests = this.allRequests.filter(req => {
      const matchesSearch = !this.searchTerm.trim() ||
        String(req[this.searchType] ?? '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.selectedStatus || req.status === this.selectedStatus;
      const matchesType = !this.selectedMaintenanceType || req.statusStage === this.selectedMaintenanceType;
      return matchesSearch && matchesStatus && matchesType;
    });
    this.applyPagination();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedMaintenanceType = '';
    this.currentPage = 1;
    this.filteredRequests = [...this.allRequests];
    this.applyPagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyPagination();
    }
  }

  previousPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  viewDetails(request: any): void {
    this.selectedRequest = request;
    const modalEl = document.getElementById('viewModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Maintenance Finished': return 'badge bg-success';
      case 'Client Received': return 'badge bg-primary';
      case 'On Maintaining':
      case 'On Maintenance': return 'badge bg-info text-dark';
      case 'Quality Check': return 'badge bg-warning text-dark';
      case 'Do Out': return 'badge bg-secondary';
      case 'Waiting for Spare Part': return 'badge bg-danger';
      default: return 'badge bg-light text-dark';
    }
  }
}
