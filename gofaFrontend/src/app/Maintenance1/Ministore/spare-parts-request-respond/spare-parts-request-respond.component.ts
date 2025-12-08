import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface SparePartsRequest {
  id: number;
  stockNumber: string;
  worksOrderNumber: number;
  quantityApproved: number;
  partCost: number;
  labourCost: number;
  totalCost: number;
}

@Component({
  selector: 'app-spare-parts-request-respond',
  templateUrl: './spare-parts-request-respond.component.html',
  styleUrls: ['./spare-parts-request-respond.component.css']
})
export class SparePartsRequestRespondComponent implements OnInit {
  sparePartsRequests: SparePartsRequest[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  selectedRequest: SparePartsRequest | null = null;
  partCost = 0;

  private apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchRequests();
  }

fetchRequests(): void {
  this.isLoading = true;
  this.http.get<SparePartsRequest[]>(`${this.apiBase}/api/SparePartsRequest/all`)
    .subscribe({
      next: (data) => {
        this.sparePartsRequests = data.filter(req => req.quantityApproved >= 1);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.errorMessage = `Failed to load spare parts requests. (${err.status} ${err.statusText})`;
        this.isLoading = false;
      }
    });
}



  selectRequestForCost(request: SparePartsRequest): void {
    this.selectedRequest = request;
    this.partCost = request.partCost ?? 0;
  }

  cancelCost(): void {
    this.selectedRequest = null;
    this.partCost = 0;
  }

  submitCost(): void {
    if (!this.selectedRequest) return;

    const worksOrderNumber = this.selectedRequest.worksOrderNumber;

    this.http.put(`${this.apiBase}/api/SparePartsRequest/update-part-cost/${worksOrderNumber}`, this.partCost)
      .subscribe({
        next: () => {
          alert('✅ Part cost updated successfully in both tables!');
          this.cancelCost();
          this.fetchRequests();
        },
        error: (err) => {
          console.error('Error updating part cost:', err);
          alert('❌ Failed to update part cost.');
        }
      });
  }
}
