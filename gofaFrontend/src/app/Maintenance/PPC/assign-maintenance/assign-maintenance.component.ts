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
  modelNumber: string = '';
  
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
        // by-worksorder returns minimal shape — fetch full record by id
        this.maintenanceRequestService.getMaintenanceRequestById(data.id).subscribe(
          (full: any) => {
            this.requestData = full;
            // Pre-fill model number if already set from registration
            if (full.model) this.modelNumber = full.model;
            this.isLoading = false;
          },
          () => {
            // fallback to minimal data if full fetch fails
            this.requestData = data;
            this.isLoading = false;
          }
        );
      },
      (error: any) => {
        console.error('Error loading request data:', error);
        this.isLoading = false;
        alert('Failed to load maintenance request data.');
      }
    );
  }

  updateRequestedTo(value?: string): void {
    const type = value ?? this.maintenanceType;
    const map: Record<string, string> = {
      'Office_Machine': 'OFFICE_MACHINE Maintenance',
      'Power': 'Power Maintenance',
      'RADIO_MAINTENANCE': 'RADIO_MAINTENANCE Maintenance',
    };
    this.requestedTo = map[type] || '';
  }

  onSubmit(): void {
    if (!this.maintenanceType || !this.requestedTo || !this.modelNumber) {
      alert('Please fill in all required fields.');
      return;
    }

    const updateData = {
      maintenanceType: this.maintenanceType,
      model: this.modelNumber,
      requestedTo: this.requestedTo,
      status: 'On Maintaining',
    };

    console.log('Request Payload:', updateData);

    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update/${this.worksOrderNumber}`;

    console.log('API URL:', apiUrl);

    this.http.put(apiUrl, updateData).subscribe(
      (response) => {
        console.log('Maintenance request updated successfully:', response);
        this.maintenanceRequestService.triggerNotificationsRefresh();
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