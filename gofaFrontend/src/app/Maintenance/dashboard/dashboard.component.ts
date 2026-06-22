import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  isMaintenanceLeader = false;
  isLoading = true;
  error = '';
  private refreshSub?: Subscription;
  private api = environment.apiBaseUrl;

  // ── Shared stats (used by both views) ───────────────────────────────────
  totalAll            = 0;
  totalMaintained     = 0;
  totalMaintainedCost = 0;
  totalDoOut          = 0;
  totalOnMaintenance  = 0;
  totalPending        = 0;
  teamStats:      any[] = [];
  byEquipmentType:any[] = [];
  frequentItems:  any[] = [];
  statusBreakdown:any[] = [];

  // ── Leader-only stats ────────────────────────────────────────────────────
  totalActive         = 0;
  totalWaitingPart    = 0;
  totalFinished       = 0;
  spareAwaitingLeader = 0;
  spareAtMinistore    = 0;
  spareQueue:      any[] = [];
  stalledRequests: any[] = [];
  unitBreakdown:   any[] = [];
  ministoreHealth: any   = null;
  recentActivity:  any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole()?.toUpperCase() ?? '';
    this.isMaintenanceLeader = role === 'MAINTENANCE_LEADER';
    this.loadStats();
    // Auto-refresh every 60 seconds
    this.refreshSub = interval(60000).subscribe(() => this.loadStats());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadStats(): void {
    this.isLoading = true;
    this.error = '';

    if (this.isMaintenanceLeader) {
      this.http.get<any>(`${this.api}/api/Dashboard/leader-stats`).subscribe({
        next: (d) => {
          this.totalAll            = d.totalAll;
          this.totalActive         = d.totalActive;
          this.totalWaitingPart    = d.totalWaitingPart;
          this.totalFinished       = d.totalFinished;
          this.totalDoOut          = d.totalDoOut;
          this.spareAwaitingLeader = d.spareAwaitingLeader;
          this.spareAtMinistore    = d.spareAtMinistore;
          this.spareQueue          = d.spareQueue          ?? [];
          this.stalledRequests     = d.stalledRequests     ?? [];
          this.unitBreakdown       = d.unitBreakdown       ?? [];
          this.ministoreHealth     = d.ministoreHealth;
          this.statusBreakdown     = d.statusBreakdown     ?? [];
          this.recentActivity      = d.recentActivity      ?? [];
          this.frequentItems       = d.frequentItems       ?? [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Leader dashboard error:', err);
          this.error = 'Failed to load dashboard data.';
          this.isLoading = false;
        }
      });
    } else {
      this.http.get<any>(`${this.api}/api/Dashboard/maintenance-stats`).subscribe({
        next: (d) => {
          this.totalAll            = d.totalAll;
          this.totalMaintained     = d.totalMaintained;
          this.totalMaintainedCost = d.totalMaintainedCost;
          this.totalDoOut          = d.totalDoOut;
          this.totalOnMaintenance  = d.totalOnMaintenance;
          this.totalPending        = d.totalPending;
          this.teamStats           = d.teamStats           ?? [];
          this.byEquipmentType     = d.byEquipmentType     ?? [];
          this.frequentItems       = d.frequentItems       ?? [];
          this.statusBreakdown     = d.statusBreakdown     ?? [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Dashboard stats error:', err);
          this.error = 'Failed to load dashboard data.';
          this.isLoading = false;
        }
      });
    }
  }

  // ── Navigation helpers ───────────────────────────────────────────────────
  goTo(path: string): void { this.router.navigate([path]); }

  // ── Shared helpers ───────────────────────────────────────────────────────
  teamLabel(team: string): string {
    const map: Record<string, string> = {
      'POWER':            'Power Team',
      'RADIO_MAINTENANCE':'Radio Team',
      'OFFICE_MACHINE':   'IT / Office Team',
      'HF_RADIO':         'HF Radio Team',
    };
    return map[team] ?? team;
  }

  teamIcon(team: string): string {
    const map: Record<string, string> = {
      'POWER':            'bi-lightning-charge-fill',
      'RADIO_MAINTENANCE':'bi-broadcast',
      'OFFICE_MACHINE':   'bi-pc-display',
      'HF_RADIO':         'bi-reception-4',
    };
    return map[team] ?? 'bi-tools';
  }

  teamColor(team: string): string {
    const map: Record<string, string> = {
      'POWER':            '#f59e0b',
      'RADIO_MAINTENANCE':'#3b82f6',
      'OFFICE_MACHINE':   '#8b5cf6',
      'HF_RADIO':         '#10b981',
    };
    return map[team] ?? '#6b7280';
  }

  unitIcon(unit: string): string {
    const map: Record<string, string> = {
      'Power':       'bi-lightning-charge-fill',
      'Office / IT': 'bi-pc-display',
      'Radio':       'bi-broadcast',
      'VHF Radio':   'bi-wifi',
      'HF Radio':    'bi-reception-4',
    };
    return map[unit] ?? 'bi-tools';
  }

  unitColor(unit: string): string {
    const map: Record<string, string> = {
      'Power':       '#f59e0b',
      'Office / IT': '#8b5cf6',
      'Radio':       '#3b82f6',
      'VHF Radio':   '#06b6d4',
      'HF Radio':    '#10b981',
    };
    return map[unit] ?? '#6b7280';
  }

  barWidth(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  maxEquipCount(): number {
    return Math.max(...this.byEquipmentType.map(e => e.total), 1);
  }

  frequencyBadge(count: number): string {
    if (count >= 5) return 'badge-critical';
    if (count >= 3) return 'badge-high';
    return 'badge-medium';
  }

  frequencyLabel(count: number): string {
    if (count >= 5) return 'Critical';
    if (count >= 3) return 'High';
    return 'Medium';
  }

  stalledClass(days: number): string {
    if (days >= 14) return 'stalled-critical';
    if (days >= 7)  return 'stalled-warning';
    return 'stalled-mild';
  }

  requestTypeLabel(rt: string): string {
    const map: Record<string, string> = {
      'POWER':            'Power',
      'OFFICE_MACHINE':   'Office / IT',
      'VHF_RADIO':        'VHF Radio',
      'HF_RADIO':         'HF Radio',
      'RADIO_MAINTENANCE':'Radio',
    };
    return map[(rt ?? '').toUpperCase()] ?? rt;
  }

  statusClass(status: string): string {
    if (!status) return 'status-default';
    if (status === 'Maintenance Finished' || status === 'Client Received') return 'status-done';
    if (status === 'On Maintaining' || status === 'On Maintenance') return 'status-active';
    if (status === 'Waiting for Spare Part') return 'status-waiting';
    if (status === 'Do Out') return 'status-doout';
    return 'status-default';
  }
}
