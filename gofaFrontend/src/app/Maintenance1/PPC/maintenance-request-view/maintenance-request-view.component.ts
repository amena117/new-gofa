import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-maintenance-request-view',
  templateUrl: './maintenance-request-view.component.html',
  styleUrls: ['./maintenance-request-view.component.css']
})
export class MaintenanceRequestViewComponent implements OnInit {
  maintenanceRequests: any[] = [];   // All fetched data
  filteredRequests: any[] = [];      // Filtered data (search + status)
  paginatedRequests: any[] = [];     // Data for current page

  isLoading = true;
  errorMessage = '';

  selectedStatus = '';               // Status filter
  searchType: string = 'worksOrderNumber'; // Default search type
  searchValue: string = '';          // Search input value

  currentPage = 1;                   // Current page number
  pageSize = 20;                     // Rows per page (configurable)

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchMaintenanceRequests();
  }

  /** Fetch all maintenance requests from API */
  fetchMaintenanceRequests(): void {
    this.isLoading = true;
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;

    this.http.get<any[]>(apiUrl)
      .subscribe(
        (response) => {
          this.maintenanceRequests = Array.isArray(response) ? response : [];
          this.filteredRequests = [...this.maintenanceRequests];
          this.currentPage = 1;
          this.applyPagination();
          this.isLoading = false;
        },
        (error) => {
          console.error('Error fetching maintenance requests:', error);
          this.errorMessage = 'Failed to load maintenance requests.';
          this.isLoading = false;
        }
      );
  }

  /** Reset filters */
  resetFilters(): void {
    this.selectedStatus = '';
    this.searchValue = '';
    this.filteredRequests = [...this.maintenanceRequests];
    this.currentPage = 1;
    this.applyPagination();
  }

  /** Apply status filter */
  applyFilter(): void {
    this.currentPage = 1;
    this.filteredRequests = this.selectedStatus
      ? this.maintenanceRequests.filter(req => req.status === this.selectedStatus)
      : [...this.maintenanceRequests];
    this.applyPagination();
  }

  /** Apply search filter */
  applySearch(): void {
    this.currentPage = 1;
    if (!this.searchValue.trim()) {
      this.filteredRequests = [...this.maintenanceRequests];
    } else {
      const query = this.searchValue.toLowerCase();
      this.filteredRequests = this.maintenanceRequests.filter(req => {
        const value = String(req[this.searchType] ?? '').toLowerCase();
        return value.includes(query);
      });
    }
    this.applyPagination();
  }

  /** Apply pagination slice */
  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(start, end);
  }

  /** Navigate pages */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyPagination();
    }
  }

  /** Template helpers */
  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
