import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

const ROLE_TO_STAGE: Record<string, string> = {
  PTEAM_LEADER: 'POWER', OTEAM_LEADER: 'OFFICE_MACHINE',
  VTEAM_LEADER: 'VHF_RADIO', HTEAM_LEADER: 'HF_RADIO',
  POWER: 'POWER', OFFICE_MACHINE: 'OFFICE_MACHINE',
  VHF_RADIO: 'VHF_RADIO', HF_RADIO: 'HF_RADIO',
};

@Component({
  selector: 'app-team-leader-report',
  templateUrl: './team-leader-report.component.html',
  styleUrls: ['./team-leader-report.component.css']
})
export class TeamLeaderReportComponent implements OnInit {
  allItems: any[] = [];
  isLoading = true;
  errorMessage = '';
  userRole = '';

  // Summary stats
  totalMaintained = 0;
  totalOnMaintenance = 0;
  totalDueOut = 0;
  totalWaitingSpare = 0;
  totalLaborCost = 0;
  totalPartsCost = 0;
  totalCost = 0;

  // Breakdown by status
  statusBreakdown: { status: string; count: number; laborCost: number; partsCost: number; total: number }[] = [];

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.trim().toUpperCase() || '';
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`).subscribe({
      next: (data) => {
        const stage = ROLE_TO_STAGE[this.userRole];
        this.allItems = stage ? data.filter(r => r.statusStage === stage) : data;
        this.calculateSummary();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load report data.';
        this.isLoading = false;
      }
    });
  }

  calculateSummary(): void {
    this.totalMaintained = this.allItems.filter(r =>
      ['Maintenance Finished', 'Client Received', 'Quality Check'].includes(r.status)
    ).length;
    this.totalOnMaintenance = this.allItems.filter(r =>
      r.status === 'On Maintenance' || r.status === 'On Maintaining'
    ).length;
    this.totalDueOut = this.allItems.filter(r => r.status === 'Do Out').length;
    this.totalWaitingSpare = this.allItems.filter(r => r.status === 'Waiting for Spare Part').length;

    this.totalLaborCost = this.allItems.reduce((s, r) => s + (r.manHours || 0) * 250, 0);
    this.totalPartsCost = this.allItems.reduce((s, r) => s + (r.partsCost || 0), 0);
    this.totalCost = this.totalLaborCost + this.totalPartsCost;

    // Group by status
    const map = new Map<string, { count: number; labor: number; parts: number }>();
    this.allItems.forEach(r => {
      const s = r.status || 'Unknown';
      const existing = map.get(s) || { count: 0, labor: 0, parts: 0 };
      existing.count++;
      existing.labor += (r.manHours || 0) * 250;
      existing.parts += r.partsCost || 0;
      map.set(s, existing);
    });

    this.statusBreakdown = Array.from(map.entries()).map(([status, v]) => ({
      status,
      count: v.count,
      laborCost: v.labor,
      partsCost: v.parts,
      total: v.labor + v.parts
    })).sort((a, b) => b.count - a.count);
  }

  printReport(): void { window.print(); }
}
