import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MaintenanceRequestService } from '../../services/maintenance-request.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-details',
  templateUrl: './request-details.component.html',
  styleUrls: ['./request-details.component.css'],
  imports: [
  CommonModule,
  FormsModule,
  ReactiveFormsModule // if needed
],
standalone: true,
  providers: [MaintenanceRequestService]
})
export class RequestDetailsComponent implements OnInit {
  request: any = null; // Holds the selected request details
  isLoading = true; // Indicates if data is being loaded
  error: string | null = null; // Stores error messages

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private maintenanceRequestService: MaintenanceRequestService
  ) {}

  ngOnInit(): void {
    // Get the worksOrderNumber from the route parameters
    const worksOrderNumber = +this.route.snapshot.paramMap.get('id')!;
    this.fetchRequestDetails(worksOrderNumber);
  }

  fetchRequestDetails(worksOrderNumber: number): void {
    console.log('Fetching details for worksOrderNumber:', worksOrderNumber); // Log the ID
    this.isLoading = true;
    this.maintenanceRequestService.getMaintenanceRequestById(worksOrderNumber).subscribe(
      (data) => {
        if (!data) {
          this.error = 'No data found for the selected request.';
          this.isLoading = false;
          return;
        }
        this.request = data;
        this.isLoading = false;
      },
      (error) => {
        this.error = 'Failed to load maintenance request details. Please try again later.';
        this.isLoading = false;
        console.error('Error fetching request details:', error);
      }
    );
  }

  goBack(): void {
    // Navigate back to the maintenance request list
    this.router.navigate(['/maintenance/request-list']);
  }
}