import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reject-request',
  templateUrl: './reject-request.component.html',
  styleUrls: ['./reject-request.component.css']
})
export class RejectRequestComponent implements OnInit {
  worksOrderNumber!: number;
  reason: string = '';

  private apiBase = environment.apiBaseUrl;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const worksOrderParam = this.route.snapshot.queryParamMap.get('worksOrderNumber');
    if (!worksOrderParam) {
      alert('No Works Order Number provided.');
      this.router.navigate(['/maintenance/spare-parts-request-list']);
      return;
    }
    this.worksOrderNumber = Number(worksOrderParam);
  }

  submitRejection(): void {
    if (!this.reason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    if (!this.worksOrderNumber || this.worksOrderNumber <= 0) {
      alert('Invalid Works Order Number.');
      return;
    }

    const url = `${this.apiBase}/api/MaintenanceRequestRegister/reject/${this.worksOrderNumber}`;
    const rejectionDto = { reason: this.reason };

    this.http.patch(url, rejectionDto).subscribe({
      next: () => {
        alert('Request rejected successfully.');
        this.router.navigate(['/maintenance/spare-parts-request-list']);
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        alert('Failed to reject the request.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/maintenance/spare-parts-request-list']);
  }
}
