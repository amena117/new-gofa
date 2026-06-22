import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';

@Component({
  selector: 'app-reassign-maintenance',
  templateUrl: './reassign-maintenance.component.html',
  styleUrls: ['./reassign-maintenance.component.css'],
})
export class ReassignMaintenanceComponent implements OnInit {
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
            // Pre-fill existing values
            if (full.model) this.modelNumber = full.model;
            if (full.maintenanceType) {
              this.maintenanceType = full.maintenanceType;
              this.updateRequestedTo();
            }
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
    if (!this.maintenanceType || !this.requestedTo) {
      alert('Please select a maintenance type.');
      return;
    }

    // Ensure model is included - use existing model from request data
    const modelToSend = this.modelNumber || this.requestData.model || '';

    if (!modelToSend) {
      alert('Model number is required. Please ensure the request has a model number.');
      return;
    }

    // Preserve existing status or set to "On Maintaining" if reassigning
    const statusToSend = this.requestData.status || 'On Maintaining';

    const updateData = {
      maintenanceType: this.maintenanceType,
      model: modelToSend,
      requestedTo: this.requestedTo,
      status: statusToSend,       // Required by backend validation
      statusStage: this.maintenanceType, // Keep statusStage in sync so details page shows correct dept
    };

    console.log('Reassignment Payload:', updateData);

    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update/${this.worksOrderNumber}`;

    console.log('API URL:', apiUrl);

    this.http.put(apiUrl, updateData).subscribe(
      (response) => {
        console.log('Maintenance request reassigned successfully:', response);
        alert('Department changed successfully!');
        this.router.navigate(['/maintenance/request-list']);
      },
      (error) => {
        console.error('Error reassigning maintenance request:', error);
        console.error('Error details:', error.error);
        const errorMessage = error.error?.message || error.error?.title || 'Unknown error';
        
        // Check for validation errors
        if (error.error?.errors) {
          const validationErrors = Object.entries(error.error.errors)
            .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          alert(`Validation errors:\n${validationErrors}`);
        } else {
          alert(`Failed to change department: ${errorMessage}`);
        }
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/maintenance/request-list']);
  }
}
