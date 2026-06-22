import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

// Maps team leader / technician roles to their statusStage
// Roles mapped to null/undefined see ALL maintained items (supervisors, quality control)
const ROLE_TO_STAGE: Record<string, string> = {
  POWER:                      'POWER',
  POWER_MAINTENANCE:          'POWER',
  PTEAM_LEADER:               'POWER',
  ELECTRICAL_MAINTENANCE:     'ELECTRICAL_MAINTENANCE',
  MECHANICAL_MAINTENANCE:     'MECHANICAL_MAINTENANCE',
  WELDING_MAINTENANCE:        'WELDING_MAINTENANCE',
  OFFICE_MACHINE:             'OFFICE_MACHINE',
  OFFICE_MACHINE_MAINTENANCE: 'OFFICE_MACHINE',
  IT_MAINTENANCE:             'OFFICE_MACHINE',
  OTEAM_LEADER:               'OFFICE_MACHINE',
  VHF_RADIO:                  'VHF_RADIO',
  VHF_MAINTENANCE:            'VHF_RADIO',
  VTEAM_LEADER:               'VHF_RADIO',
  HF_RADIO:                   'HF_RADIO',
  HF_MAINTENANCE:             'HF_RADIO',
  HTEAM_LEADER:               'HF_RADIO',
  RTEAM_LEADER:               'RADIO_MAINTENANCE',
  RADIO_MAINTENANCE:          'RADIO_MAINTENANCE',
  // Quality / supervisor roles — no stage filter, they see everything
  QUALITY:                    '',
  MAINTENANCE_LEADER:         '',
  COMPUTER_MAINTENANCE:       'OFFICE_MACHINE',
};

@Component({
  selector: 'app-maintained-list',
  templateUrl: './maintained-list.component.html',
  styleUrls: ['./maintained-list.component.css']
})
export class MaintainedListComponent implements OnInit {
  allItems: any[] = [];
  filteredItems: any[] = [];
  paginatedItems: any[] = [];
  isLoading = true;
  errorMessage = '';
  userRole = '';

  searchTerm = '';
  searchType = 'worksOrderNumber';
  selectedStatus = '';
  currentPage = 1;
  pageSize = 20;

  // Detail modal
  viewingItem: any = null;

  searchTypes = [
    { value: 'worksOrderNumber', label: 'Works Order No' },
    { value: 'serialNoOfEquip', label: 'Serial No' },
    { value: 'nomenclature', label: 'Nomenclature' },
    { value: 'maintainedBy', label: 'Maintained By' },
    { value: 'model', label: 'Model' },
  ];

  statuses = ['Quality Check', 'Maintenance Finished', 'Client Received', 'Do Out'];

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.trim().toUpperCase() || '';
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`).subscribe({
      next: (data) => {
        const stage = ROLE_TO_STAGE[this.userRole];
        const maintained = data.filter(r =>
          r.repairFinishDate ||
          ['Quality Check', 'Maintenance Finished', 'Client Received', 'Do Out'].includes(r.status)
        );

        this.allItems = (stage !== undefined && stage !== '')
          ? maintained.filter(r => {
              const recordStage = (r.statusStage    || '').toUpperCase();
              const recordType  = (r.maintenanceType || '').toUpperCase();
              const recordReqTo = (r.requestedTo    || '').toLowerCase();
              const target      = stage.toUpperCase();

              // VHF / HF must match on requestedTo since statusStage is always RADIO_MAINTENANCE
              if (target === 'VHF_RADIO') return recordReqTo.includes('vhf');
              if (target === 'HF_RADIO')  return recordReqTo.includes('hf_radio') || recordReqTo.includes('hf radio');
              if (target === 'ELECTRICAL_MAINTENANCE') return recordReqTo.includes('electrical');
              if (target === 'MECHANICAL_MAINTENANCE') return recordReqTo.includes('mechanical');
              if (target === 'WELDING_MAINTENANCE')    return recordReqTo.includes('welding');

              return recordStage === target || recordType === target ||
                     recordType.replace(/[_\s]/g, '') === target.replace(/[_\s]/g, '');
            })
          : (this.userRole === 'QUALITY' 
              ? maintained.filter(r => {
                  const reqTo = (r.requestedTo || '').toLowerCase();
                  const type = (r.maintenanceType || '').toUpperCase();
                  return reqTo.includes('vhf') || reqTo.includes('hf') || type.includes('RADIO');
                })
              : maintained);

        this.filteredItems = [...this.allItems];
        this.currentPage = 1;
        this.applyPagination();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load maintained items.';
        this.isLoading = false;
      }
    });
  }

  applySearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredItems = this.allItems.filter(r => {
      const matchSearch = !this.searchTerm.trim() ||
        String(r[this.searchType] ?? '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.selectedStatus || r.status === this.selectedStatus;
      return matchSearch && matchStatus;
    });
    this.applyPagination();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.filteredItems = [...this.allItems];
    this.currentPage = 1;
    this.applyPagination();
  }

  get totalPages(): number { return Math.ceil(this.filteredItems.length / this.pageSize); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedItems = this.filteredItems.slice(start, start + this.pageSize);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.applyPagination(); }
  }
  previousPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  getLaborCost(manHours: number): number { return (manHours || 0) * 250; }
  getTotalCost(r: any): number { return (r.partsCost || 0) + this.getLaborCost(r.manHours); }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Maintenance Finished': return 'badge bg-success';
      case 'Client Received': return 'badge bg-primary';
      case 'Quality Check': return 'badge bg-warning text-dark';
      case 'Do Out': return 'badge bg-secondary';
      default: return 'badge bg-light text-dark';
    }
  }

  // ── Detail modal ──────────────────────────────────────────────
  openDetails(item: any): void {
    this.viewingItem = item;
  }

  closeDetails(): void {
    this.viewingItem = null;
  }

  // ── Qualify: Quality Check → Maintenance Finished ─────────────
  canQualify(item: any): boolean {
    return item.status === 'Quality Check' &&
      ['PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER',
       'MAINTENANCE_LEADER', 'QUALITY'].includes(this.userRole);
  }

  qualify(item: any): void {
    if (!confirm(`Mark Works Order #${item.worksOrderNumber} as Maintenance Finished?`)) return;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/qualify/${item.worksOrderNumber}`;
    this.http.put(url, {}).subscribe({
      next: () => {
        // Update the item in both allItems and filteredItems in-place
        // so it survives re-filters without disappearing
        const inAll = this.allItems.find(r => r.worksOrderNumber === item.worksOrderNumber);
        if (inAll) inAll.status = 'Maintenance Finished';
        const inFiltered = this.filteredItems.find(r => r.worksOrderNumber === item.worksOrderNumber);
        if (inFiltered) inFiltered.status = 'Maintenance Finished';
        item.status = 'Maintenance Finished';

        this.applyPagination();

        // If detail modal is open, update it too
        if (this.viewingItem?.worksOrderNumber === item.worksOrderNumber) {
          this.viewingItem = { ...item };
        }
        alert('✅ Qualified successfully. Status updated to Maintenance Finished.');
      },
      error: (err) => {
        console.error('Qualify failed:', err);
        alert('❌ Failed to qualify. Please try again.');
      }
    });
  }
}
