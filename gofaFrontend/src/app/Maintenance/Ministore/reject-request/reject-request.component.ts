import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reject-request',
  templateUrl: './reject-request.component.html',
  styleUrls: ['./reject-request.component.css']
})
export class RejectRequestComponent implements OnInit {
  worksOrderNumber!: number;
  sparePartId: number | null = null;
  reason: string = '';

  private apiBase = environment.apiBaseUrl;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const worksOrderParam = this.route.snapshot.queryParamMap.get('worksOrderNumber');
    const sparePartIdParam = this.route.snapshot.queryParamMap.get('sparePartId');

    if (sparePartIdParam) {
      this.sparePartId = Number(sparePartIdParam);
    }

    if (!worksOrderParam) {
      alert('No Works Order Number provided.');
      this.router.navigate(['/maintenance/spare-parts-requests']);
      return;
    }
    this.worksOrderNumber = Number(worksOrderParam);
  }

  submitRejection(): void {
    if (!this.reason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    const userRole = this.authService.getRole() || 'Unknown';

    if (this.sparePartId) {
      // Reject specific spare part request
      const url = `${this.apiBase}/api/SparePartsRequest/reject/${this.sparePartId}`;
      const rejectionDto = { 
        reason: this.reason,
        rejectedBy: userRole
      };

      this.http.put(url, rejectionDto).subscribe({
        next: () => {
          alert('Spare part request rejected successfully.');
          this.router.navigate(['/maintenance/spare-parts-requests']);
        },
        error: (err) => {
          console.error('Error rejecting spare part:', err);
          alert('Failed to reject the spare part request.');
        }
      });
    } else {
      // Reject entire maintenance request (existing logic)
      const url = `${this.apiBase}/api/MaintenanceRequestRegister/reject/${this.worksOrderNumber}`;
      const rejectionDto = { reason: this.reason };

      this.http.patch(url, rejectionDto).subscribe({
        next: () => {
          alert('Request rejected successfully.');
          this.router.navigate(['/maintenance/spare-parts-requests']);
        },
        error: (err) => {
          console.error('Error rejecting request:', err);
          alert('Failed to reject the request.');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/maintenance/spare-parts-requests']);
  }
}
