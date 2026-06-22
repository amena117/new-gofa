import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

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

  // Expose Math to template
  Math = Math;

  showDetailModal = false;
  selectedRequest: any = null;

  ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ',
    'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];
  ethiopianDateString: string = '';

  currentUserRole: string = '';
  selectedRoleFilter: string = ''; // New filter for role/department

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole()?.toUpperCase() || '';
    this.fetchMaintenanceRequests();
    this.loadCurrentDate(); // Convert local date to Ethiopian date
  }

  /** Fetch all maintenance requests from API */
  fetchMaintenanceRequests(): void {
    this.isLoading = true;
    
    // Default URL for regular users: only "Client Received"
    let apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-status/Client Received`;

    // For Leaders and PPC: fetch ALL requests
    if (['MAINTENANCE_LEADER', 'PPC', 'MAINTENANCE_ADMIN'].includes(this.currentUserRole)) {
      apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;
    }

    this.http.get<any[]>(apiUrl).subscribe(
      (response) => {
        let data = Array.isArray(response) ? response : [];
        // Exclude Quality Check items as requested
        this.maintenanceRequests = data.filter(r => r.status !== 'Quality Check');
        this.filteredRequests = [...this.maintenanceRequests];
        this.currentPage = 1;
        this.applyPagination();
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching maintenance requests:', error);
        this.errorMessage = 'Failed to load finished maintenance requests.';
        this.isLoading = false;
      }
    );
  }

  /** Load current local date and convert to Ethiopian date */
  loadCurrentDate(): void {
    const localDate = new Date();
    this.setEthiopianDateString(localDate);
    console.log('Local date converted to Ethiopian:', this.ethiopianDateString);
  }

  /** Convert Gregorian Date to Ethiopian string */
  private setEthiopianDateString(date: Date): void {
    const ethDate = this.toEthiopian(date);
    this.ethiopianDateString = `${ethDate.day} ${this.ethMonthNames[ethDate.month - 1]} ${ethDate.year}`;
  }

  /** Custom Ethiopian date conversion */
  private toEthiopian(date: Date): { year: number; month: number; day: number } {
    const REFERENCE_GREGORIAN = new Date(2024, 8, 11); // Sep 11, 2024
    const REFERENCE_ETH_YEAR = 2017;

    const diffInMs = date.getTime() - REFERENCE_GREGORIAN.getTime();
    let totalDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    let ethYear = REFERENCE_ETH_YEAR;

    if (totalDays >= 0) {
      while (totalDays >= (this.isLeapYear(ethYear) ? 366 : 365)) {
        totalDays -= this.isLeapYear(ethYear) ? 366 : 365;
        ethYear++;
      }
    } else {
      while (totalDays < 0) {
        ethYear--;
        totalDays += this.isLeapYear(ethYear) ? 366 : 365;
      }
    }

    let ethMonth = Math.floor(totalDays / 30) + 1;
    let ethDay = (totalDays % 30) + 1;

    // Handle Pagumen overflow
    if (ethMonth > 13) {
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - 5;
      if (this.isLeapYear(ethYear - 1)) ethDay -= 1;
    } else if (ethMonth === 13 && ethDay > (this.isLeapYear(ethYear) ? 6 : 5)) {
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - (this.isLeapYear(ethYear - 1) ? 6 : 5);
    }

    return { year: ethYear, month: ethMonth, day: ethDay };
  }

  private isLeapYear(year: number): boolean {
    return year % 4 === 0;
  }

  /** View request details in modal */
  viewRequest(request: any) {
    this.selectedRequest = request;
    this.showDetailModal = true;
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedRequest = null;
  }

  printModal() {
    window.print();
  }

  /** Reset filters */
  resetFilters(): void {
    this.selectedStatus = '';
    this.selectedRoleFilter = '';
    this.searchValue = '';
    this.filteredRequests = [...this.maintenanceRequests];
    this.currentPage = 1;
    this.applyPagination();
  }

  /** Apply all filters including status and role */
  applyFilter(): void {
    this.currentPage = 1;
    let temp = [...this.maintenanceRequests];

    // 1. Status Filter
    if (this.selectedStatus) {
      temp = temp.filter(req => req.status === this.selectedStatus);
    }

    // 2. Role/Department Filter
    if (this.selectedRoleFilter) {
      temp = temp.filter(req => {
        const type = (req.maintenanceType || '').toUpperCase();
        if (this.selectedRoleFilter === 'RADIO') return type.includes('RADIO');
        if (this.selectedRoleFilter === 'POWER') return type.includes('POWER');
        if (this.selectedRoleFilter === 'OFFICE') return type.includes('OFFICE') || type.includes('COMPUTER');
        return true;
      });
    }

    // 3. Search Filter
    if (this.searchValue.trim()) {
      const query = this.searchValue.toLowerCase();
      temp = temp.filter(req => {
        const value = String(req[this.searchType] ?? '').toLowerCase();
        return value.includes(query);
      });
    }

    this.filteredRequests = temp;
    this.applyPagination();
  }

  /** Unified search handler calling applyFilter */
  applySearch(): void {
    this.applyFilter();
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
