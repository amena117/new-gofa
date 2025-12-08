import { Component, OnInit } from '@angular/core';
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

  private apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/filtered`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
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
        // Sort so newest requests appear first
        this.maintenanceRequests = data.sort(
          (a, b) => b.worksOrderNumber - a.worksOrderNumber
        );
        if (data.length === 0) {
          console.log(`✅ No active requests assigned to ${requestedTo}`);
        }
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
      }
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
      }
    });
  }

  refreshList(): void {
    this.loadRequests();
  }

  /** Maps role to maintenance type shown in the filter text */
/** Maps role to maintenance type shown in the filter text */
getMaintenanceTypeByRole(role: string): string {
  const map: Record<string, string> = {
    MINISTORE: '',
    MAINTENANCE_LEADER: '',
    POWER: 'Power',
    'OFFICE_MACHINE': 'Office_Machine',
    'VHF_RADIO': 'VHF_Radio',
    'HF_RADIO': 'HF_Radio'
  };
  return map[role] || '';
}

/** Maps role to requested-to name shown in the filter text */
getRequestedToByRole(role: string): string {
  const map: Record<string, string> = {
    MINISTORE: '',
    MAINTENANCE_LEADER: '',
    POWER: 'Power Maintenance',
    'OFFICE_MACHINE': 'Office_Machine Maintenance',
    'VHF_RADIO': 'VHF_Radio Maintenance',
    'HF_RADIO': 'HF_Radio Maintenance'
  };
  return map[role] || '';
}

goToMaintainForm(request: MaintenanceRequest): void {
  console.log('Redirecting to Maintain Form for request:', request);

  // Navigate using path parameter (worksOrderNumber)
  this.router.navigate(['/maintenance/maintain', request.worksOrderNumber]);
}



}
