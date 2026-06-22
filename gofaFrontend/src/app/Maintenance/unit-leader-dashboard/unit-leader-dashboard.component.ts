import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unit-leader-dashboard',
  templateUrl: './unit-leader-dashboard.component.html',
  styleUrls: ['./unit-leader-dashboard.component.scss']
})
export class UnitLeaderDashboardComponent implements OnInit {

  userRole: string = '';
  departmentName: string = '';

  // Stats
  totalReceived: number = 0;
  totalMaintained: number = 0;
  totalPending: number = 0;
  totalDoOut: number = 0;
  stuckTasks: number = 0;

  technicianWorkload: { name: string, count: number }[] = [];
  frequentFailures: { serial: string, model: string, count: number }[] = [];
  statusBreakdown: { status: string, count: number }[] = [];

  isLoading: boolean = false;
  error: string = '';

  private api = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole()?.trim();
    if (!role) {
      this.router.navigate(['/login']);
      return;
    }
    this.userRole = role.toUpperCase();
    this.departmentName = this.getDepartmentLabel();

    this.loadStats();
  }

  getDepartmentLabel(): string {
    const map: Record<string, string> = {
      PTEAM_LEADER:      'Power Maintenance Unit',
      OTEAM_LEADER:      'Office Machine Maintenance Unit',
      RTEAM_LEADER:      'Radio Maintenance Unit',
    };
    return map[this.userRole] || 'Maintenance Unit';
  }

  loadStats(): void {
    this.isLoading = true;
    
    // As a simple approach for now, we will fetch all filtered requests
    // and manually calculate the numbers. 
    // Ideally, a specific backend endpoint like `/api/Dashboard/team-leader-stats` would be used.
    
    let maintenanceType = '';
    if (this.userRole === 'PTEAM_LEADER') maintenanceType = 'Power';
    else if (this.userRole === 'OTEAM_LEADER') maintenanceType = 'Office_Machine';
    else if (this.userRole === 'RTEAM_LEADER') maintenanceType = 'RADIO_MAINTENANCE';

    if (!maintenanceType) {
      this.error = 'Your role is not assigned to a specific maintenance team.';
      this.isLoading = false;
      return;
    }

    this.http.get<any[]>(`${this.api}/api/MaintenanceRequestRegister/filtered?maintenanceType=${maintenanceType}`).subscribe({
      next: (data) => {
        this.calculateStats(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load team stats:', err);
        this.error = 'Failed to load dashboard data.';
        this.isLoading = false;
      }
    });
  }

  calculateStats(requests: any[]): void {
    this.totalReceived = requests.length;
    
    this.totalMaintained = requests.filter(r => 
      r.status === 'Maintenance Finished' || 
      r.status === 'Quality Check' || 
      r.status === 'Client Received'
    ).length;

    this.totalPending = requests.filter(r => 
      r.status === 'Waiting for Approval' || 
      r.status === 'Pending' || 
      !r.status
    ).length;

    this.totalDoOut = requests.filter(r => r.status === 'Do Out').length;

    this.stuckTasks = requests.filter(r => 
      r.status === 'Waiting for Spare Part' ||
      r.status === 'Approved - Waiting for Parts'
    ).length;

    // 1. Sub-Unit Backlog (Active tasks per unit)
    const activeRequests = requests.filter(r => 
      r.status === 'On Maintaining' || 
      r.status === 'On Maintenance' || 
      r.status === 'Waiting for Spare Part' ||
      r.status === 'Approved - Waiting for Parts' ||
      r.status === 'Spare Part Issued'
    );
    const techMap = new Map<string, number>();
    activeRequests.forEach(r => {
      let unit = 'Unassigned';
      if (r.requestedTo === 'VHF_Radio Maintenance') unit = 'VHF Radio Unit';
      else if (r.requestedTo === 'HF_Radio Maintenance') unit = 'HF Radio Unit';
      else if (r.requestedTo === 'Office_Machine Maintenance') unit = 'Office Machine Unit';
      else if (r.requestedTo === 'Computer_Maintenance') unit = 'Computer Unit';
      else if (r.requestedTo === 'Electrical Maintenance') unit = 'Electrical Unit';
      else if (r.requestedTo === 'Mechanical Maintenance') unit = 'Mechanical Unit';
      else if (r.requestedTo === 'Welding Maintenance') unit = 'Welding Unit';
      else if (r.requestedTo) unit = r.requestedTo;
      
      techMap.set(unit, (techMap.get(unit) || 0) + 1);
    });
    this.technicianWorkload = Array.from(techMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Frequent Failures (Top Serials repaired > 1 time)
    const serialMap = new Map<string, { model: string, count: number }>();
    requests.forEach(r => {
      const serial = (r.serialNoOfEquip || '').trim();
      if (serial && serial.toLowerCase() !== 'n/a' && serial.toLowerCase() !== 'none') {
        const existing = serialMap.get(serial) || { model: r.model || 'Unknown', count: 0 };
        existing.count += 1;
        serialMap.set(serial, existing);
      }
    });
    this.frequentFailures = Array.from(serialMap.entries())
      .map(([serial, data]) => ({ serial, model: data.model, count: data.count }))
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Status Breakdown
    const statusMap = new Map<string, number>();
    requests.forEach(r => {
      const st = r.status || 'Pending';
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
    });
    this.statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }
}
