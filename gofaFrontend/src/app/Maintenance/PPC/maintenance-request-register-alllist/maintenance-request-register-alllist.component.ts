import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

// Declare the global 'bootstrap' variable to avoid TypeScript errors
declare var bootstrap: any;

@Component({
  selector: 'app-maintenance-request-register-alllist',
  templateUrl: './maintenance-request-register-alllist.component.html',
  styleUrls: ['./maintenance-request-register-alllist.component.css']
})
export class MaintenanceRequestRegisterAlllistComponent implements OnInit {
  maintenanceRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  selectedRequest: any = null;
  showFullDetails: boolean = false;

  searchValue: string = '';
  selectedStatus: string = '';
  selectedType: string = '';
  statuses: string[] = ['On Maintaining', 'Maintenance Finished', 'Client Received', 'Quality Check', 'Do Out'];
  maintenanceTypes: string[] = ['POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE', 'HF_RADIO'];

  currentPage = 1;
  pageSize = 15;

  currentUserRole: string = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    // Step 1: Get current logged-in user role from AuthService
    const role = this.authService.getRole();
    if (!role) {
      alert('User not authenticated. Please log in.');
      this.isLoading = false;
      return;
    }
    this.currentUserRole = role.toUpperCase();

    // Step 2: Fetch all maintenance requests from API
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;
    this.http.get<any[]>(apiUrl).subscribe({
      next: (data) => {
        console.log('Fetched maintenance requests:', data);

        // Step 3: Filter based on role and maintenance type
        this.maintenanceRequests = this.filterRequestsByRole(data);
        this.filteredRequests = [...this.maintenanceRequests];
        this.applyPagination();

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching maintenance requests:', error);
        this.errorMessage = 'Failed to load maintenance requests.';
        this.isLoading = false;
      }
    });
  }

  // Filter function: maps roles to maintenance types
  private filterRequestsByRole(data: any[]): any[] {
    const role = this.currentUserRole;

    switch (role) {
      case 'POWER':
      case 'POWER_MAINTENANCE':
      case 'PTEAM_LEADER':
        return data.filter(req => req.maintenanceType?.toUpperCase() === 'POWER');

      case 'OFFICE_MACHINE':
      case 'OFFICE_MACHINE_MAINTENANCE':
        return data.filter(req => req.requestedTo === 'Office_Machine Maintenance');

      case 'IT_MAINTENANCE':
      case 'COMPUTER_MAINTENANCE':
        return data.filter(req => req.requestedTo === 'Computer_Maintenance');

      case 'OTEAM_LEADER':
        return data.filter(req => req.maintenanceType?.toUpperCase() === 'OFFICE_MACHINE');

      case 'RADIO_MAINTENANCE':
      case 'RADIO_MAINTENANCE':
      case 'RTEAM_LEADER':
        return data.filter(req => req.maintenanceType?.toUpperCase() === 'RADIO_MAINTENANCE');

      case 'VHF_RADIO':
      case 'VHF_MAINTENANCE':
      case 'VTEAM_LEADER':
        return data.filter(req => req.requestedTo === 'VHF_Radio Maintenance');

      case 'HF_RADIO':
      case 'HF_MAINTENANCE':
      case 'HTEAM_LEADER':
        return data.filter(req => req.requestedTo === 'HF_Radio Maintenance');

      case 'ELECTRICAL_MAINTENANCE':
        return data.filter(req => req.requestedTo === 'Electrical Maintenance');

      case 'MECHANICAL_MAINTENANCE':
        return data.filter(req => req.requestedTo === 'Mechanical Maintenance');

      case 'WELDING_MAINTENANCE':
        return data.filter(req => req.requestedTo === 'Welding Maintenance');

      case 'MAINTENANCE_LEADER':
      case 'PPC':
        return data; // show all requests

      default:
        return []; // unknown role: empty list
    }
  }

  applySearchAndFilter(): void {
    this.currentPage = 1;
    let result = [...this.maintenanceRequests];
    if (this.selectedStatus) result = result.filter(r => r.status === this.selectedStatus);
    if (this.selectedType) result = result.filter(r => r.maintenanceType === this.selectedType);
    if (this.searchValue.trim()) {
      const q = this.searchValue.toLowerCase();
      result = result.filter(r =>
        String(r.worksOrderNumber ?? '').includes(q) ||
        (r.nomenclature ?? '').toLowerCase().includes(q) ||
        (r.serialNoOfEquip ?? '').toLowerCase().includes(q) ||
        (r.requestedBy ?? '').toLowerCase().includes(q)
      );
    }
    this.filteredRequests = result;
    this.applyPagination();
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.ceil(this.filteredRequests.length / this.pageSize); }
  previousPage(): void { if (this.currentPage > 1) { this.currentPage--; this.applyPagination(); } }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.applyPagination(); } }

  // Show modal for request details
  viewDetails(request: any): void {
    this.selectedRequest = request;
    this.showFullDetails = false;
    const modalElement = document.getElementById('viewModal');
    if (modalElement) {
      const bsModal = new bootstrap.Modal(modalElement);
      bsModal.show();
    }
  }

  // Toggle full details view
  toggleFullDetails(): void {
    this.showFullDetails = !this.showFullDetails;
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s?.includes('finished') || s?.includes('received') || s?.includes('approved')) return 'status-success';
    if (s?.includes('waiting') || s?.includes('pending') || s === 'initial') return 'status-warning';
    if (s?.includes('maintenance') || s?.includes('progress') || s?.includes('issued')) return 'status-info';
    if (s === 'do out' || s === 'rejected') return 'status-danger';
    return 'status-secondary';
  }

  getStatusText(status: string): string {
    if (status === 'Approved - Waiting for Parts') return 'Waiting for Leader';
    if (status === 'Waiting for Maintenance Leader Approval') return 'Waiting for Leader';
    if (status === 'Waiting for Ministore') return 'Waiting for Ministore';
    return status || 'Pending';
  }
}
