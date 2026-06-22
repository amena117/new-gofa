import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { AuthService } from '../../../services/auth.service';

const MAN_HOUR_RATE = 250;

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

  isSubmitting = false;
  userRole: string = '';

  // Cost display
  get laborCost(): number { return this.formData.manhours * MAN_HOUR_RATE; }

  get statusOptions(): { value: string, label: string }[] {
    const rolesSentToQuality = ['VHF_MAINTENANCE', 'HF_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO', 'RADIO_MAINTENANCE'];
    
    if (rolesSentToQuality.includes(this.userRole)) {
      // VHF/HF/Radio technicians only get "Quality Check", "Do Out", or "Waiting for Spare Part"
      return [
        { value: 'Quality Check', label: 'Quality Check' },
        { value: 'Do Out', label: 'Do Out' },
        { value: 'Waiting for Spare Part', label: 'Waiting for Spare Part' }
      ];
    }

    // Other roles get "Maintenance Finished", "Do Out", or "Waiting for Spare Part"
    return [
      { value: 'Maintenance Finished', label: 'Maintenance Finished' },
      { value: 'Do Out', label: 'Do Out' },
      { value: 'Waiting for Spare Part', label: 'Waiting for Spare Part' }
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private maintenanceRequestService: MaintenanceRequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.trim().toUpperCase() || '';
    const worksOrderNumber = this.route.snapshot.paramMap.get('worksOrderNumber');
    if (worksOrderNumber) {
      this.formData.worksOrderNumber = Number(worksOrderNumber);
    }
    // Auto-set today's date
    this.formData.repairFinishDate = new Date().toISOString().split('T')[0];

    // Pre-select the most common status based on role
    const rolesSentToQuality = ['VHF_MAINTENANCE', 'HF_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO', 'RADIO_MAINTENANCE'];
    if (rolesSentToQuality.includes(this.userRole)) {
      this.formData.status = 'Quality Check';
    } else {
      this.formData.status = 'Maintenance Finished';
    }
  }

  get isDoOut(): boolean {
    return this.formData.status === 'Do Out';
  }

  onSubmit(): void {
    if (!this.formData.status) {
      alert('Please select a status.');
      return;
    }

    // Remark is required when marking as Do Out
    if (this.isDoOut && !this.formData.remark.trim()) {
      alert('⚠️ Remark is required when marking an item as "Do Out". Please explain why the item cannot be repaired.');
      return;
    }

    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const maintainedBy = this.authService.getUsername?.() || 'Unknown';

    const payload = {
      RepairFinishDate: this.formData.repairFinishDate,
      Status: this.formData.status,
      ManHours: this.formData.manhours,
      Remark: this.formData.remark,
      MaintainedBy: maintainedBy
    };

    this.maintenanceRequestService.updateMaintenanceDetails(this.formData.worksOrderNumber, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          alert('✅ Maintenance updated successfully.');
          this.router.navigate(['/maintenance/power-maintReqList']);
        },
        error: (error) => {
          this.isSubmitting = false;
          alert(`❌ Failed to update: ${error?.error?.message || 'Unknown error'}`);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/maintenance/power-maintReqList']);
  }
}
