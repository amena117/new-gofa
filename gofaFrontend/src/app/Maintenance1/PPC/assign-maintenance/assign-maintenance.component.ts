import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-assign-maintenance',
  templateUrl: './assign-maintenance.component.html',
  styleUrls: ['./assign-maintenance.component.css'],
})
export class AssignMaintenanceComponent implements OnInit {
  worksOrderNumber: number | null = null;
  modelNumber: string = '';
  maintenanceType: string = '';
  requestedTo: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.worksOrderNumber = params['worksOrderNumber'];
      console.log('Works Order Number:', this.worksOrderNumber);
    });
  }

  updateRequestedTo(): void {
    switch (this.maintenanceType) {
      case 'Office_machine':
        this.requestedTo = 'Office_machine Maintenance';
        break;
      case 'POWER':
        this.requestedTo = 'POWER Maintenance';
        break;
      case 'Vhf_radio':
        this.requestedTo = 'Vhf_radio Maintenance';
        break;
        case 'HF_RADIO':
        this.requestedTo = 'HF_RADIO Maintenance';
        break;
      default:
        this.requestedTo = '';
    }
  }

  onSubmit(): void {
    if (!this.modelNumber || !this.maintenanceType || !this.requestedTo) {
      alert('Please fill in all fields.');
      return;
    }

    const updateData = {
      maintenanceType: this.maintenanceType,
      model: this.modelNumber,
      requestedTo: this.requestedTo,
      status: 'On Maintaining', // Add this field
    };

    console.log('Request Payload:', updateData);

    // const apiUrl = `${environment.apiBaseUrl}api/MaintenanceRequestRegister/update/${this.worksOrderNumber}`;

    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update/${this.worksOrderNumber}`;

    console.log('API URL:', apiUrl);

    this.http.put(apiUrl, updateData).subscribe(
      (response) => {
        console.log('Maintenance request updated successfully:', response);
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