import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';

@Component({
  selector: 'app-assign-maintenance',
  templateUrl: './assign-maintenance.component.html',
  styleUrls: ['./assign-maintenance.component.css'],
})
export class AssignMaintenanceComponent implements OnInit {
  worksOrderNumber: number | null = null;
  maintenanceType: string = '';
  requestedTo: string = '';
  
  // Existing request data
  requestData: any = null;
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient,
    private maintenanceRequestService: MaintenanceRequestService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.worksOrderNumber = params['worksOrderNumber'];
      console.log('Works Order Number:', this.worksOrderNumber);
      
      if (this.worksOrderNumber) {
        this.loadRequestData();
      }
    });
  }

  loadRequestData(): void {
    this.maintenanceRequestService.getMaintenanceRequestByWorksOrder(this.worksOrderNumber!).subscribe(
      (data: any) => {
        this.requestData = data;
        this.isLoading = false;
        console.log('Loaded request data:', data);
      },
      (error: any) => {
        console.error('Error loading request data:', error);
        this.isLoading = false;
        alert('Failed to load maintenance request data.');
      }
    );
  }

  updateRequestedTo(): void {
    switch (this.maintenanceType) {
      case 'Office_machine':
        this.requestedTo = 'Office_machine Maintenance';
        break;
      case 'POWER':
        this.requestedTo = 'POWER Maintenance';
        break;
      case 'RADIO_MAINTENANCE':
        this.requestedTo = 'RADIO_MAINTENANCE Maintenance';
        break;
      case 'HF_RADIO':
        this.requestedTo = 'HF_RADIO Maintenance';
        break;
      default:
        this.requestedTo = '';
    }
  }

  onSubmit(): void {
    if (!this.maintenanceType || !this.requestedTo) {
      alert('Please fill in all required fields.');
      return;
    }

    const updateData = {
      maintenanceType: this.maintenanceType,
      model: this.requestData.model,
      requestedTo: this.requestedTo,
      status: 'On Maintaining',
    };

    console.log('Request Payload:', updateData);

    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update/${this.worksOrderNumber}`;

    console.log('API URL:', apiUrl);

    this.http.put(apiUrl, updateData).subscribe(
      (response) => {
        console.log('Maintenance request updated successfully:', response);
        alert('Maintenance assigned successfully!');
        this.router.navigate(['/maintenance/request-list']);
      },
      (error) => {
        console.error('Error updating maintenance request:', error);
        const errorMessage = error.error?.message || 'Unknown error';
        alert(`Failed to update maintenance request: ${errorMessage}`);
      }
    );
  }
}