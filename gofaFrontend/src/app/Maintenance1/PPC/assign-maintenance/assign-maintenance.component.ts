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
  isSubmitting = false;

  // Full request data for display
  requestData: any = null;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.worksOrderNumber = params['worksOrderNumber'];
      if (this.worksOrderNumber) {
        this.fetchRequestData();
      }
    });
  }

  fetchRequestData(): void {
    this.isLoading = true;
    this.http.get<any>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-worksorder/${this.worksOrderNumber}`)
      .subscribe({
        next: (data) => {
          // by-worksorder returns minimal shape — fetch full record by id
          this.http.get<any>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/${data.id}`)
            .subscribe({
              next: (full) => {
                this.requestData = full;
                // Pre-fill model number if already set
                if (full.model) this.modelNumber = full.model;
                this.isLoading = false;
              },
              error: () => {
                this.requestData = data;
                this.isLoading = false;
              }
            });
        },
        error: () => { this.isLoading = false; }
      });
  }

  updateRequestedTo(): void {
    const map: Record<string, string> = {
      'Office_Machine': 'OFFICE_MACHINE Maintenance',
      'Power': 'Power Maintenance',
      'VHF_Radio': 'VHF_Radio Maintenance',
      'HF_Radio': 'HF_Radio Maintenance',
      'RADIO_MAINTENANCE': 'RADIO_MAINTENANCE Maintenance',
    };
    this.requestedTo = map[this.maintenanceType] || '';
  }

  onSubmit(): void {
    if (!this.modelNumber || !this.maintenanceType || !this.requestedTo) {
      alert('Please fill in all fields.');
      return;
    }
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const updateData = {
      maintenanceType: this.maintenanceType,
      model: this.modelNumber,
      requestedTo: this.requestedTo,
      status: 'On Maintaining',
    };

    this.http.put(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update/${this.worksOrderNumber}`, updateData)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/maintenance/request-list']);
        },
        error: (error) => {
          this.isSubmitting = false;
          alert(`Failed to update: ${error.error?.message || 'Unknown error'}`);
        }
      });
  }
}