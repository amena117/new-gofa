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

    if (this.userRole === 'QUALITY') {
      url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/Qualify`;
    } else if (this.userRole === 'PPC') {
      url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/finished`;
    } else {
      this.maintenanceRequests = [];
      this.isLoading = false;
      return;
    }

    this.http.get<any[]>(url).subscribe(
      (data) => {
        if (this.userRole === 'QUALITY') {
          this.maintenanceRequests = data.filter(req => req.status === 'Quality Check');
        } else if (this.userRole === 'PPC') {
          this.maintenanceRequests = data;
        }
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching maintenance requests:', error);
        this.errorMessage = 'Waiting For Maintained Materials!';
        this.isLoading = false;
      }
    );
  }

  editRequest(request: any): void {
    console.log('Editing maintenance request:', request);
    alert(`Edit functionality triggered for Works Order Number: ${request.worksOrderNumber}`);
  }

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

    const confirmAction = confirm(
      `Are you sure you want to qualify Works Order: ${request.worksOrderNumber}?`
    );
    if (!confirmAction) return;

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
    if (
      !this.deliveryFormData.givenTo ||
      !this.deliveryFormData.approval ||
      !this.deliveryFormData.recievedDate
    ) {
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
