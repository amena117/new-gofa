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

  ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ',
    'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];
  ethiopianDateString: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchMaintenanceRequests();
    this.loadCurrentDate(); // Convert local date to Ethiopian date
  }

  /** Fetch all maintenance requests from API */
  fetchMaintenanceRequests(): void {
    this.isLoading = true;
    // Fetch only finished/completed maintenance requests
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-status?status=Client Received`;

    this.http.get<any[]>(apiUrl).subscribe(
      (response) => {
        this.maintenanceRequests = Array.isArray(response) ? response : [];
        // Additional filter to ensure we only show completed items
        this.maintenanceRequests = this.maintenanceRequests.filter(req => 
          req.status === 'Client Received' || req.status === 'Maintenance Finished'
        );
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

  /** View request details and print */
  viewRequest(request: any) {
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    const content = `
      <html>
        <head>
          <title>Maintenance Request Details</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td, th { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .print-btn {
              display: block;
              margin: 20px auto;
              padding: 10px 15px;
              background: #1976d2;
              color: #fff;
              border: none;
              border-radius: 5px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <h2>በኢፌዲሪ መከላከያ ሚኒስቴር በመገናኛና እንፎርሜሽን ዋና መምሪያ </h2>
          <h2>የጠጋኝ ንብረት መሸኛ</h2>
          <table>
            <tr><th>Works Order Number</th><td>${request.worksOrderNumber}</td></tr>
            <tr><th>Serial Number</th><td>${request.serialNoOfEquip || 'N/A'}</td></tr>
            <tr><th>Description</th><td>${request.briefDescriptionOfWork || 'N/A'}</td></tr>
            <tr><th>Date Work Order Received</th><td>${request.dateWorkOrderReceived || 'N/A'}</td></tr>
            <tr><th>Maintenance Type</th><td>${request.maintenanceType || 'N/A'}</td></tr>
            <tr><th>Repair Start Date</th><td>${request.repairStartDate || 'N/A'}</td></tr>
            <tr><th>Repair Finish Date</th><td>${request.repairFinishDate || 'N/A'}</td></tr>
            <tr><th>Maintained By</th><td>${request.maintainedBy || 'N/A'}</td></tr>
            <tr><th>Total Cost</th><td>${request.totalCost || 'N/A'}</td></tr>
            <tr><th>Status</th><td>${request.status || 'N/A'}</td></tr>
            <tr><th>Solved Remark</th><td>${request.remark || 'N/A'}</td></tr>
            <tr><th>Given To</th><td>${request.givenTo || 'N/A'}</td></tr>
            <tr><th>Approval</th><td>${request.approval || 'N/A'}</td></tr>
            <tr><th>Receiver Remark</th><td>${request.recieverRemark || 'N/A'}</td></tr>
            <tr><th>Received Date</th><td>${request.recievedDate || 'N/A'}</td></tr>
            <tr><th>Receiver Signature</th><td>_________________________</td></tr>
          </table>
          <button class="print-btn" onclick="window.print()">Print</button>
        </body>
      </html>
    `;
    printWindow!.document.write(content);
    printWindow!.document.close();
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
