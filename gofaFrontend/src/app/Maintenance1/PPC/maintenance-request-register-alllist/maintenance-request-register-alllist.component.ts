import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;

    this.http.get<any[]>(apiUrl).subscribe(
      (data) => {
        console.log('Fetched maintenance requests:', data);
        this.maintenanceRequests = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching maintenance requests:', error);
        this.errorMessage = 'Failed to load maintenance requests.';
        this.isLoading = false;
      }
    );
  }

  viewDetails(request: any): void {
    this.selectedRequest = request;
    this.showFullDetails = false;
    const modalElement = document.getElementById('viewModal');
    if (modalElement) {
      const bsModal = new bootstrap.Modal(modalElement);
      bsModal.show();
    }
  }

  toggleFullDetails(): void {
    this.showFullDetails = !this.showFullDetails;
  }
}
