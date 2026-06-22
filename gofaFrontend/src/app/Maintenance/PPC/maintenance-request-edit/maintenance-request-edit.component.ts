import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-maintenance-edit-request',
  templateUrl: './maintenance-request-edit.component.html',
  styleUrls: ['./maintenance-request-edit.component.css']
})
export class MaintenanceRequestEditComponent implements OnInit {
  isLoading = false;
  error = '';
  editRequest: any = {}; // holds the specific request being edited

 constructor(
  private http: HttpClient,
  private route: ActivatedRoute,
  public router: Router
) {}

  

  ngOnInit(): void {
    this.loadRequest();
  }

  /** ================= FETCH ONE REQUEST ================= */
  loadRequest(): void {
    const worksOrderNumber = this.route.snapshot.paramMap.get('worksOrderNumber');
    if (!worksOrderNumber) {
      this.error = 'Invalid request number.';
      return;
    }

    this.isLoading = true;
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-worksorder/${worksOrderNumber}`;
    this.http.get<any>(apiUrl).subscribe(
      (data) => {
        this.editRequest = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching maintenance request:', error);
        this.error = 'Failed to load maintenance request.';
        this.isLoading = false;
      }
    );
  }

  /** ================= SUBMIT EDIT ================= */
  onSubmit(): void {
    const apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update/${this.editRequest.worksOrderNumber}`;
    this.isLoading = true;

    this.http.put(apiUrl, this.editRequest).subscribe(
      () => {
        alert('Maintenance request updated successfully.');
        this.router.navigate(['/maintenance/register-list']); // redirect back to list
      },
      (error) => {
        console.error('Error updating maintenance request:', error);
        alert('Failed to update maintenance request.');
        this.isLoading = false;
      }
    );
  }
}
