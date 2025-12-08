import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-deliver-for-clients-form',
  templateUrl: './deliver-for-clients-form.component.html',
  styleUrls: ['./deliver-for-clients-form.component.css']
})
export class DeliverForClientsFormComponent implements OnInit {
  isLoading: boolean = true;
  errorMessage: string = '';
  maintenanceRequest: any = {};
  deliveryDetails: any = {};

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get WorksOrderNumber from route parameters
    const worksOrderNumber = +this.route.snapshot.paramMap.get('worksOrderNumber')!;

    // Fetch maintenance request details
    this.http.get<any>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/${worksOrderNumber}`).subscribe(
      (data) => {
        console.log('Fetched maintenance request:', data);
        this.maintenanceRequest = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching maintenance request:', error);
        this.errorMessage = 'Failed to load maintenance request details.';
        this.isLoading = false;
      }
    );
  }

  submitForm(): void {
    const worksOrderNumber = this.maintenanceRequest.worksOrderNumber;

    // Call the backend API to update the delivery details
    this.http.put(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/deliver/${worksOrderNumber}`, this.deliveryDetails).subscribe(
      () => {
        alert('Delivery details updated successfully.');
        this.router.navigate(['/maintenance-finished']); // Redirect back to the list
      },
      (error) => {
        console.error('Error updating delivery details:', error);
        alert('Failed to update delivery details.');
      }
    );
  }

  cancel(): void {
    this.router.navigate(['/maintenance-finished']); // Redirect back to the list
  }
}
