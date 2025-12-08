import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-maintain-form',
  templateUrl: './maintain-form.component.html',
  styleUrls: ['./maintain-form.component.css']
})
export class MaintainFormComponent implements OnInit {
  formData = {
    worksOrderNumber: 0,
    status: '',
    repairFinishDate: '',
    manhours: 0,
    remark: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private maintenanceRequestService: MaintenanceRequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const worksOrderNumber = this.route.snapshot.paramMap.get('worksOrderNumber');
    if (worksOrderNumber) {
      this.formData.worksOrderNumber = Number(worksOrderNumber);
    }
  }

  onSubmit(): void {
    const maintainedBy = this.authService.getUsername?.() || 'Unknown';

    const updatedMaintenanceData = {
      RepairFinishDate: this.formData.repairFinishDate,
      Status: this.formData.status,
      ManHours: this.formData.manhours,
      Remark: this.formData.remark,
      MaintainedBy: maintainedBy
    };

    this.maintenanceRequestService.updateMaintenanceOnly(this.formData.worksOrderNumber, updatedMaintenanceData)
      .subscribe({
        next: () => {
          alert('✅ Maintenance Request updated successfully.');
          this.router.navigate(['/maintenance-list']);
        },
        error: (error) => {
          console.error('Failed to update maintenance request:', error);
          alert(`❌ Failed to update maintenance request: ${error.error?.message || 'Unknown error'}`);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/maintenance-list']);
  }
}
