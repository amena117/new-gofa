import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

interface MaintenanceRequest {
  worksOrderNumber: number;
  nomenclature: string;
  quantity: number;
  model: string;
  serialNoOfEquip: string;
  maintenanceType: string;
  requestedTo: string;
  status: string;
}

@Component({
  selector: 'app-maintenance-request-list',
  templateUrl: './maintenance-request-list.component.html',
  styleUrls: ['./maintenance-request-list.component.css'],
})
export class MaintenanceRequestListComponent implements OnInit {
  maintenanceRequests: MaintenanceRequest[] = [];
  userRole: string = '';
  assignOptions: string[] = [];
  isAssignMode: boolean = false;
  selectedRequest: MaintenanceRequest | null = null;
  recommendation: string = '';

  private apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/filtered`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Detect assign mode from query params
    this.route.queryParams.subscribe((params: { [key: string]: string | null }) => {
      const worksOrderNumberParam = params['worksOrderNumber'];
      const assignModeParam = params['assignMode'];

      if (assignModeParam && worksOrderNumberParam) {
        this.isAssignMode = true;

        this.selectedRequest =
          this.maintenanceRequests.find(
            (r) => r.worksOrderNumber.toString() === worksOrderNumberParam
          ) || null;
      } else {
        this.isAssignMode = false;
        this.selectedRequest = null;
      }
    });

    // Load all requests
    this.loadRequests();
  }

  loadRequests(): void {
    const role = this.authService.getRole()?.trim();

    if (!role) {
      console.warn('User is not authenticated or role is missing.');
      alert('Please log in again.');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.userRole = role.toUpperCase();

    const maintenanceType = this.getMaintenanceTypeByRole(this.userRole);
    const requestedTo = this.getRequestedToByRole(this.userRole);

    if (!maintenanceType || !requestedTo) {
      console.error('Unsupported role:', role);
      alert('Your account role is not authorized for this module.');
      return;
    }

    const params = { maintenanceType, requestedTo };

    this.http.get<MaintenanceRequest[]>(this.apiUrl, { params }).subscribe({
      next: (data) => {
        // Sort newest first
        this.maintenanceRequests = data.sort(
          (a, b) => b.worksOrderNumber - a.worksOrderNumber
        );
      },
      error: (error) => {
        console.error('Failed to fetch maintenance requests', error);
        if (error.status === 401 || error.status === 403) {
          alert('Access denied. Please log in again.');
          this.router.navigate(['/login'], { replaceUrl: true });
        } else if (error.status === 404) {
          this.maintenanceRequests = [];
        } else {
          alert('Unable to load data. Please try again later.');
        }
      },
    });
  }


  // Map role to maintenance type
  getMaintenanceTypeByRole(role: string): string {
    const map: Record<string, string> = {
      MINISTORE: '',
      MAINTENANCE_LEADER: '',
      POWER: 'Power',
      OFFICE_MACHINE: 'Office_Machine',
      RADIO_MAINTENANCE: 'RADIO_MAINTENANCE',
      PTEAM_LEADER: 'Power', // ✅ Added
      OTEAM_LEADER: 'Office_Machine',
      RTEAM_LEADER: 'RADIO_MAINTENANCE',
    };
    return map[role] || '';
  }

  // Map role to requestedTo value
  getRequestedToByRole(role: string): string {
    const map: Record<string, string> = {
      MINISTORE: '',
      MAINTENANCE_LEADER: '',
      POWER: 'Power Maintenance',
      PTEAM_LEADER: 'Powwer MaintenanceM',
      OTEAM_LEADER: 'Office_Machinne MaintenanceM',
      RTEAM_LEADER: 'RADIO_MAINTENANCE MaintenanceM',
      RADIO_MAINTENANCE: 'RADIO_MAINTENANCE Maintenance',
      OFFICE_MACHINE: 'Office_Machine Maintenance',
    };
    return map[role] || '';
  }

  getDataByUserRole(): void {
    const role = this.authService.getRole()?.trim().toUpperCase();
    if (!role) return;

    let maintenanceTypes: string[] = [];
    let requestedTos: string[] = [];

    switch (role) {
      case 'POWER':
        maintenanceTypes = ['POWER'];
        requestedTos = ['Power Maintenance'];
        break;
      case 'PTEAM_LEADER':
        maintenanceTypes = ['POWER'];
        requestedTos = ['Powwer MaintenanceM'];
        break;
      case 'OTEAM_LEADER':
        maintenanceTypes = ['Office_Machine'];
        requestedTos = ['Office_Machinne MaintenanceM'];
        break;
      case 'RTEAM_LEADER':
        maintenanceTypes = ['RADIO_MAINTENANCE'];
        requestedTos = ['RADIO_MAINTENANCE MaintenanceM'];
        break;
      default:
        alert('Your account role is not authorized to view maintenance data.');
        return;
    }

    if (!maintenanceTypes.length || !requestedTos.length) return;

    const params = {
      maintenanceType: maintenanceTypes.join(','),
      requestedTo: requestedTos.join(',')
    };

    this.http.get<MaintenanceRequest[]>(this.apiUrl, { params }).subscribe({
      next: (data) => {
        this.maintenanceRequests = data.sort(
          (a, b) => b.worksOrderNumber - a.worksOrderNumber
        );
      },
      error: (error) => {
        console.error('Failed to fetch maintenance requests:', error);
        alert('Unable to load data. Please try again later.');
      }
    });
  }

  requestPart(request: MaintenanceRequest): void {
    this.router.navigate(['/maintenance/spare-parts-requests/add'], {
      queryParams: {
        worksOrderNumber: request.worksOrderNumber,
        nomenclature: request.nomenclature,
        quantity: request.quantity,
        model: request.model,
        serialNoOfEquip: request.serialNoOfEquip,
      },
    });
  }

  qualifyRequest(request: MaintenanceRequest): void {
    this.router.navigate(['/maintenance/quality-unit'], {
      queryParams: {
        worksOrderNumber: request.worksOrderNumber,
        nomenclature: request.nomenclature,
        quantity: request.quantity,
        model: request.model,
        serialNoOfEquip: request.serialNoOfEquip,
      },
    });
  }

  acceptRequest(worksOrderNumber: number): void {
    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/accept/${worksOrderNumber}`;
    this.http.put(url, {}).subscribe({
      next: () => {
        alert('Request accepted successfully.');
        this.refreshList();
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          alert('Session expired. Please log in again.');
          this.router.navigate(['/login']);
        } else {
          alert('Failed to accept request.');
        }
      },
    });
  }

  maintainRequest(worksOrderNumber: number): void {
    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/maintain/${worksOrderNumber}`;
    this.http.put(url, {}).subscribe({
      next: () => {
        alert('Marked as On Maintaining.');
        this.refreshList();
        this.router.navigate(['/maintenance/spare-parts-request-form']);
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          alert('Authentication failed. Please log in again.');
          this.router.navigate(['/login']);
        } else {
          alert('Failed to update status.');
        }
      },
    });
  }

  assignRequest(request: MaintenanceRequest): void {
    console.log('Assigning maintenance request:', request);

    switch (this.userRole) {
      case 'PTEAM_LEADER':
        this.assignOptions = ['POWER Maintenance', 'Mechanical', 'Electrical'];
        break;
      case 'OTEAM_LEADER':
        this.assignOptions = ['Office_Machine Maintenance', 'Computer', 'Office Machine'];
        break;
      case 'RTEAM_LEADER':
        this.assignOptions = ['RADIO_MAINTENANCE Maintenance','VHF_Radio Maintenance', 'HF_Radio Maintenance'];
        break;
      default:
        this.assignOptions = [];
    }

    if (this.assignOptions.length) {
      request.requestedTo = this.assignOptions[0];
    }

    this.selectedRequest = request;
    this.isAssignMode = true;

    this.router.navigate([], {
      queryParams: {
        assignMode: true,
        worksOrderNumber: request.worksOrderNumber
      },
      queryParamsHandling: 'merge'
    });
  }

  submitAssignment(): void {
    if (!this.selectedRequest) return;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/assign/${this.selectedRequest.worksOrderNumber}`;
    const body = {
      requestedTo: this.selectedRequest.requestedTo,
      recommendation: this.recommendation
    };

    this.http.put(url, body).subscribe({
      next: () => {
        alert('Assignment updated successfully!');
        this.isAssignMode = false;
        this.recommendation = '';
        this.refreshList();
      },
      error: (err) => {
        console.error('Failed to update assignment:', err);
        alert('Error occurred while assigning. Please try again.');
      }
    });
  }

  refreshList(): void {
    this.loadRequests();
  }

  goToMaintainForm(request: MaintenanceRequest): void {
    this.router.navigate(['/maintenance/maintain', request.worksOrderNumber]);
  }
}
