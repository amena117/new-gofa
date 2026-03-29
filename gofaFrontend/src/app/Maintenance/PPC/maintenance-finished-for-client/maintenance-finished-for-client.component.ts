import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-maintenance-finished-for-client',
  templateUrl: './maintenance-finished-for-client.component.html',
  styleUrls: ['./maintenance-finished-for-client.component.css']
})
export class MaintenanceFinishedForClientComponent implements OnInit {
  maintenanceRequests: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Delivery Form State
  showDeliveryForm: boolean = false;
  isFormLoading: boolean = false;
  formErrorMessage: string = '';
  deliveryFormData: any = {};

  userRole: string = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.fetchMaintenanceRequests();
  }

  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();
    this.userRole = role ? role.toUpperCase() : '';
  }

 fetchMaintenanceRequests(): void {
  this.isLoading = true;
  this.errorMessage = '';

  let url = '';

  // QUALITY sees only quality records
  if (this.userRole === 'QUALITY') {
    url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/Qualify`;
  } 
  // PPC and MAINTENANCE_LEADER see finished items ready for delivery
  else if (this.userRole === 'PPC' || this.userRole === 'MAINTENANCE_LEADER') {
    url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-status?status=Maintenance Finished`;
  }
  // Team leaders see their own finished items
  else {
    url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-status?status=Maintenance Finished`;
  }

  this.http.get<any[]>(url).subscribe(
    (data) => {
      let filtered = data;

      // QUALITY role sees only "Quality Check" status
      if (this.userRole === 'QUALITY') {
        filtered = filtered.filter(r => r.status === 'Quality Check');
      }
      // PPC and MAINTENANCE_LEADER see "Maintenance Finished" status
      else if (this.userRole === 'PPC' || this.userRole === 'MAINTENANCE_LEADER') {
        filtered = filtered.filter(r => r.status === 'Maintenance Finished');
      }

      // Role-based filtering by maintenance type for team leaders and technicians
      switch (this.userRole) {
        case 'RTEAM_LEADER':
        case 'VHF_MAINTENANCE':
        case 'HF_MAINTENANCE':
        case 'RADIO_MAINTENANCE':
          filtered = filtered.filter(r => 
            r.statusStage === 'VHF_RADIO' || r.statusStage === 'HF_RADIO'
          );
          break;

        case 'HTEAM_LEADER':
          filtered = filtered.filter(r => r.statusStage === 'HF_RADIO');
          break;

        case 'PTEAM_LEADER':
        case 'POWER_MAINTENANCE':
          filtered = filtered.filter(r => r.statusStage === 'POWER');
          break;

        case 'OTEAM_LEADER':
        case 'OFFICE_MACHINE_MAINTENANCE':
        case 'IT_MAINTENANCE':
          filtered = filtered.filter(r => r.statusStage === 'OFFICE_MACHINE');
          break;

        case 'PPC':
        case 'MAINTENANCE_LEADER':
        case 'QUALITY':
          // These roles see all (already filtered above)
          break;

        default:
          filtered = [];
      }

      this.maintenanceRequests = filtered;
      this.isLoading = false;
    },
    (error) => {
      console.error('Error fetching maintenance requests:', error);
      this.errorMessage = 'No finished maintenance items found. / ምንም የተጠገኑ ንብረቶች አልተገኙም።';
      this.isLoading = false;
    }
  );
}

  // ====== ACTIONS =======

  giveForClients(request: any): void {
    this.deliveryFormData = {
      worksOrderNumber: request.worksOrderNumber,
      serialNoOfEquip: request.serialNoOfEquip,
      givenTo: '',
      approval: '',
      recieverRemark: '',
      recievedDate: ''
    };
    this.showDeliveryForm = true;
  }

  qualify(request: any): void {
    if (!request || !request.worksOrderNumber) return;

    if (!confirm(`Are you sure you want to qualify Works Order: ${request.worksOrderNumber}?`))
      return;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/qualify/${request.worksOrderNumber}`;
    const body = { status: 'Maintenance Finished' };

    this.http.put(url, body, { responseType: 'text' }).subscribe(
      () => {
        alert(`Works Order ${request.worksOrderNumber} qualified successfully.`);
        this.fetchMaintenanceRequests();
      },
      (error) => {
        console.error('Error qualifying maintenance request:', error);
        alert('Failed to qualify the maintenance request.');
      }
    );
  }

  submitDeliveryForm(): void {
    if (!this.deliveryFormData.givenTo ||
        !this.deliveryFormData.approval ||
        !this.deliveryFormData.recievedDate) {
      this.formErrorMessage = 'Please fill all required fields.';
      return;
    }

    this.isFormLoading = true;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/deliver/${this.deliveryFormData.worksOrderNumber}`;
    const body = {
      GivenTo: this.deliveryFormData.givenTo,
      Approval: this.deliveryFormData.approval,
      RecieverRemark: this.deliveryFormData.recieverRemark,
      RecievedDate: this.deliveryFormData.recievedDate
    };

    this.http.put(url, body, { responseType: 'text' }).subscribe(
      () => {
        this.isFormLoading = false;
        this.showDeliveryForm = false;
        this.formErrorMessage = '';
        alert('Maintenance request delivered successfully.');
        this.fetchMaintenanceRequests();
      },
      (error) => {
        this.isFormLoading = false;
        this.formErrorMessage = 'Failed to deliver maintenance request.';
        console.error('Error delivering maintenance request:', error);
      }
    );
  }

  cancelDeliveryForm(): void {
    this.showDeliveryForm = false;
    this.deliveryFormData = {};
    this.formErrorMessage = '';
  }
}
