import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';

@Component({
  selector: 'app-receive-spare-form',
  templateUrl: './receive-spare-form.component.html',
  styleUrls: ['./receive-spare-form.component.css'],
})
export class ReceiveSpareFormComponent implements OnInit {
  formData: any = {
    worksOrderNumber: '',
    stockNumber: '',
    model: '',
    date: '',
    recievedFrom: '',
    quantityRecieved: 0,
  };

  isLoading = false;
  errorMessage: string | null = null;

  private apiBase = environment.apiBaseUrl;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const requestId = this.route.snapshot.queryParams['id'];
    if (requestId) {
      this.isLoading = true;

      this.http.get<any>(`${this.apiBase}/api/SparePartsRequest/accept/${requestId}`).subscribe({
        next: (response) => {
          this.formData.worksOrderNumber = response.worksOrderNumber;
          this.formData.stockNumber = response.stockNumber;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching request details:', error);
          this.errorMessage = 'Failed to load request details.';
          this.isLoading = false;
        },
      });
    }
  }

  submitForm(): void {
    this.isLoading = true;

    const payload = {
      stockNumber: this.formData.stockNumber,
      model: this.formData.model,
      date: this.formData.date,
      recievedFrom: this.formData.recievedFrom,
      quantityRecieved: this.formData.quantityRecieved,
    };

    console.log('Payload being sent:', payload);

    // Step 1: Check if the stockNumber exists
    this.http.get<any>(`${this.apiBase}/api/MiniStoreBinCard/check-stock/${payload.stockNumber}`)
      .subscribe({
        next: (response) => {
          if (response?.exists) {
            // Stock exists, update record
            this.http.put(`${this.apiBase}/api/MiniStoreBinCard/recieve-spare`, payload)
              .subscribe({
                next: () => {
                  alert('Spare parts received successfully.');
                  this.router.navigate(['maintenance/spare-parts-requests']);
                },
                error: (updateError) => {
                  console.error('Error updating record:', updateError);
                  this.errorMessage = 'Failed to update the record.';
                  this.isLoading = false;
                }
              });
          } else {
            this.errorMessage = 'Stock number not found in the system.';
            this.isLoading = false;
          }
        },
        error: (checkError) => {
          console.error('Error checking stock number:', checkError);
          this.errorMessage = 'Failed to check stock number.';
          this.isLoading = false;
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/spare-parts-requests']);
  }
}
