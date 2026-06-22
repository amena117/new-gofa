import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

interface TechPerformance {
  technicianName: string;
  totalTasks: number;
  maintainedCount: number;
  doOutCount: number;
  pendingCount: number;
  avgManHours: number;
  totalManHours: number;
  successRate: number;
  tasks: any[]; // Store individual tasks for detail view
}

@Component({
  selector: 'app-maintenance-performance',
  templateUrl: './maintenance-performance.component.html',
  styleUrls: ['./maintenance-performance.component.css']
})
export class MaintenancePerformanceComponent implements OnInit {
  performanceData: TechPerformance[] = [];
  filteredData: TechPerformance[] = [];
  isLoading = false;
  errorMessage = '';
  userRole = '';
  searchTerm = '';

  // Detail view properties
  selectedTech: TechPerformance | null = null;
  showDetails = false;

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.trim().toUpperCase() || '';
    this.loadPerformance();
  }

  loadPerformance(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`).subscribe({
      next: (requests) => {
        this.processData(requests);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading performance:', err);
        this.errorMessage = 'Failed to load performance data.';
        this.isLoading = false;
      }
    });
  }

  processData(requests: any[]): void {
    // Filter by role if team leader
    let filteredRequests = requests;
    if (this.userRole !== 'MAINTENANCE_LEADER' && this.userRole !== 'PPC') {
      let maintenanceType = '';
      if (this.userRole === 'PTEAM_LEADER') maintenanceType = 'POWER';
      else if (this.userRole === 'OTEAM_LEADER') maintenanceType = 'OFFICE_MACHINE';
      else if (this.userRole === 'RTEAM_LEADER') maintenanceType = 'RADIO_MAINTENANCE';

      if (maintenanceType) {
        filteredRequests = requests.filter(r => 
          (r.maintenanceType || '').toUpperCase() === maintenanceType ||
          (r.requestedTo || '').toUpperCase().includes(maintenanceType)
        );
      }
    }

    const techMap = new Map<string, any>();

    filteredRequests.forEach(r => {
      const tech = r.maintainedBy;
      if (!tech) return; // Skip unassigned tasks in technician performance report

      if (!techMap.has(tech)) {
        techMap.set(tech, {
          technicianName: tech,
          totalTasks: 0,
          maintainedCount: 0,
          doOutCount: 0,
          pendingCount: 0,
          totalManHours: 0,
          tasks: [] // Initialize tasks array
        });
      }

      const stats = techMap.get(tech);
      stats.totalTasks++;
      stats.tasks.push(r); // Add task to technician's list
      
      if (r.status === 'Maintenance Finished' || r.status === 'Client Received') {
        stats.maintainedCount++;
      } else if (r.status === 'Do Out') {
        stats.doOutCount++;
      } else {
        stats.pendingCount++;
      }

      stats.totalManHours += (r.manHours || 0);
    });

    this.performanceData = Array.from(techMap.values()).map(stats => {
      const finished = stats.maintainedCount + stats.doOutCount;
      return {
        ...stats,
        // Average Hours: Total time spent / Total tasks actually handled (Finished)
        avgManHours: finished > 0 ? stats.totalManHours / finished : 0,
        // Success Rate: Out of what they FINISHED, how many were fixed?
        successRate: finished > 0 ? (stats.maintainedCount / finished) * 100 : 0
      };
    }).sort((a, b) => b.maintainedCount - a.maintainedCount);

    this.applySearch();
  }

  applySearch(): void {
    if (!this.searchTerm) {
      this.filteredData = [...this.performanceData];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredData = this.performanceData.filter(d => 
        d.technicianName.toLowerCase().includes(term)
      );
    }
  }

  viewTechDetails(tech: TechPerformance): void {
    this.selectedTech = tech;
    this.showDetails = true;
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedTech = null;
  }

  navigateToRequest(woNumber: any): void {
    this.router.navigate(['/maintenance/request-details', woNumber]);
  }
}
