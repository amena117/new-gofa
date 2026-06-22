import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { AuthService } from '../../../services/auth.service';

// Roles that see ALL do-out items
const ADMIN_ROLES = ['PPC', 'MAINTENANCE_LEADER', 'QUALITY'];

// Maps technician/team roles to their statusStage value
const ROLE_TO_STAGE: Record<string, string> = {
  POWER: 'POWER',
  OFFICE_MACHINE: 'OFFICE_MACHINE',
  VHF_RADIO: 'VHF_RADIO',
  HF_RADIO: 'HF_RADIO',
  PTEAM_LEADER: 'POWER',
  OTEAM_LEADER: 'OFFICE_MACHINE',
  VTEAM_LEADER: 'VHF_RADIO',
  HTEAM_LEADER: 'HF_RADIO',
};

@Component({
  selector: 'app-do-out',
  templateUrl: './do-out.component.html',
  styleUrl: './do-out.component.css'
})
export class DoOutComponent implements OnInit {
  allRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];
  isLoading = true;
  errorMessage = '';
  userRole = '';

  searchTerm = '';
  searchType = 'worksOrderNumber';
  currentPage = 1;
  pageSize = 20;

  searchTypes = [
    { value: 'worksOrderNumber', label: 'Works Order No' },
    { value: 'serialNoOfEquip', label: 'Serial No' },
    { value: 'nomenclature', label: 'Nomenclature' },
    { value: 'requestedBy', label: 'Requested By' },
    { value: 'model', label: 'Model' },
    { value: 'maintenanceType', label: 'Maintenance Type' },
  ];

  constructor(
    private maintenanceService: MaintenanceRequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.trim().toUpperCase() || '';
    this.maintenanceService.getDoOutRequests().subscribe({
      next: (data) => {
        // Filter by role — admin roles see everything, others see only their stage
        const stage = ROLE_TO_STAGE[this.userRole];
        this.allRequests = ADMIN_ROLES.includes(this.userRole)
          ? data
          : stage
            ? data.filter(r => r.statusStage === stage)
            : [];

        this.filteredRequests = [...this.allRequests];
        this.applyPagination();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load Do Out requests.';
        this.isLoading = false;
      }
    });
  }

  applySearch(): void {
    this.currentPage = 1;
    if (!this.searchTerm.trim()) {
      this.filteredRequests = [...this.allRequests];
    } else {
      const q = this.searchTerm.toLowerCase();
      this.filteredRequests = this.allRequests.filter(r =>
        String(r[this.searchType] ?? '').toLowerCase().includes(q)
      );
    }
    this.applyPagination();
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.filteredRequests = [...this.allRequests];
    this.currentPage = 1;
    this.applyPagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyPagination();
    }
  }

  previousPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  get isAdminRole(): boolean {
    return ADMIN_ROLES.includes(this.userRole);
  }
}
