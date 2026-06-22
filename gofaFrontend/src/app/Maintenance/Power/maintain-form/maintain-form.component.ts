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

  isLoading: boolean = false;
  userRole: string = '';

  get allowedStatuses(): { value: string, label: string }[] {
    const rolesSentToQuality = ['VHF_MAINTENANCE', 'HF_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO', 'RADIO_MAINTENANCE'];
    
    if (rolesSentToQuality.includes(this.userRole)) {
      // VHF/HF/Radio technicians only get "Quality Check" or "Do Out"
      return [
        { value: 'Quality Check', label: 'Quality Check' },
        { value: 'Do Out', label: 'Do Out' }
      ];
    }

    // Other roles (Power, etc.) get "Maintenance Finished" or "Do Out"
    return [
      { value: 'Maintenance Finished', label: 'Maintenance Finished' },
      { value: 'Do Out', label: 'Do Out' }
    ];
  }

  get currentUserFullName(): string {
    const firstName = this.authService.getFirstName();
    const lastName = this.authService.getLastName();
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else {
      // Fallback to username if names are not set in the database
      return this.authService.getUsername() || 'Unknown';
    }
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

    // Pre-select the most common status based on role
    const rolesSentToQuality = ['VHF_MAINTENANCE', 'HF_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO', 'RADIO_MAINTENANCE'];
    if (rolesSentToQuality.includes(this.userRole)) {
      this.formData.status = 'Quality Check';
    } else {
      this.formData.status = 'Maintenance Finished';
    }
  }

  onStatusChange(): void {
    // Clear remark when switching away from Do Out so the required hint updates correctly
    if (this.formData.status !== 'Do Out') {
      // don't clear — preserve any existing remark
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

    const maintainedBy = this.currentUserFullName;

    const updatedMaintenanceData = {
      RepairFinishDate: this.formData.repairFinishDate,
      Status: this.formData.status,
      ManHours: this.formData.manhours,
      Remark: this.formData.remark,
      MaintainedBy: maintainedBy
    };

    this.maintenanceRequestService.updateMaintenanceDetails(this.formData.worksOrderNumber, updatedMaintenanceData)
      .subscribe({
        next: () => {
          alert('✅ Maintenance Request updated successfully.');
          this.router.navigate(['/maintenance/power-maintReqList']);
        },
        error: (error) => {
          console.error('Failed to update maintenance request:', error);
          alert(`❌ Failed to update maintenance request: ${error.error?.message || 'Unknown error'}`);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/maintenance/power-maintReqList']);
  }
}
