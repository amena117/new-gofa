import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';

// Declare the global 'bootstrap' variable to avoid TypeScript errors
declare var bootstrap: any;

@Component({
  selector: 'app-maintenance-edit-request',
  templateUrl: './maintenance-request-edit.component.html',
  styleUrls: ['./maintenance-request-edit.component.css']
})
export class MaintenanceRequestEditComponent implements OnInit {
  isLoading = false;
  error = '';
  maintenanceRequests: any[] = [];
  editRequest: any = {}; // Property to hold the request being edited

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchMaintenanceRequests();
  }

  // Fetch all maintenance requests
  fetchMaintenanceRequests(): void {
    this.isLoading = true;
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;
    this.http.get<any[]>(apiUrl).subscribe(
      (requests) => {
        this.maintenanceRequests = requests;
        this.isLoading = false;
      },
      (error) => {
        this.error = 'Failed to load maintenance requests.';
        this.isLoading = false;
        console.error('Error fetching maintenance requests:', error);
      }
    );
  }

  // Open the edit modal and populate the form with the selected request
  openEditModal(request: any): void {
    console.log('Edit button clicked:', request); // Debugging line
    this.editRequest = { ...request }; // Copy the request to avoid direct mutation
    const editModal = document.getElementById('editModal');
    if (editModal) {
      console.log('Edit modal found:', editModal); // Debugging line
      const modal = new bootstrap.Modal(editModal); // Use Bootstrap Modal API
      modal.show();
    } else {
      console.error('Edit modal not found!');
    }
  }

  // Handle form submission for editing a request
  onEditSubmit(): void {
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update/${this.editRequest.worksOrderNumber}`;
    this.http.put(apiUrl, this.editRequest).subscribe(
      (response) => {
        console.log('Maintenance request updated successfully:', response);

        // Refresh the maintenance requests list
        this.fetchMaintenanceRequests();

        // Close the modal
        const editModal = document.getElementById('editModal');
        if (editModal) {
          const modal = bootstrap.Modal.getInstance(editModal); // Use Bootstrap Modal API
          modal?.hide();
        }
      },
      (error) => {
        console.error('Error updating maintenance request:', error);
        alert('Failed to update maintenance request.');
      }
    );
  }
}
