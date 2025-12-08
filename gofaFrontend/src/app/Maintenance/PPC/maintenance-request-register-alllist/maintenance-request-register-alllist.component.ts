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
  isLoading: boolean = true;
  errorMessage: string | null = null;
  selectedRequest: any = null;
  showFullDetails: boolean = false;

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
      case 'PTEAM_LEADER':
        return data.filter(req => req.maintenanceType?.toUpperCase() === 'POWER');

      case 'OFFICE_MACHINE':
      case 'OTEAM_LEADER':
        return data.filter(req => req.maintenanceType?.toUpperCase() === 'OFFICE_MACHINE');

      case 'RADIO_MAINTENANCE':
      case 'RTEAM_LEADER':
        return data.filter(req =>
          req.maintenanceType === 'RADIO_MAINTENANCE' );

      case 'MAINTENANCE_LEADER':
      case 'PPC':
        return data; // show all requests

      default:
        return []; // unknown role: empty list
    }
  }

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
}
