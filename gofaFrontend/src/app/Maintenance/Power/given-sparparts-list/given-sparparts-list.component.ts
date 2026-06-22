import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { environment } from './../../../../environments/environment';

interface SparePartsRequest {
  id: number;
  worksOrderNumber: string;
  requestType: string;
  approvedBy: string;
  quantityAsked: number;
  stockNumber?: string;
  serialNumber?: string;
  requestedBy?: string;
  reason?: string;
  quantityApproved?: number;
  remark?: string;
  status?: string;
}

interface MaintenanceRecord {
  worksOrderNumber: string;
  maintenanceType: string;
  requestedTo: string;
  repairFinishDate: string;
  status: string;
  manHours: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  remark: string;
  serialNoOfEquip?: string;
  maintainedBy?: string;
}

interface Batch {
  worksOrderNumber: string;
  parts: SparePartsRequest[];
  stockSummary: string;
  requestedBy: string;
  requestType: string;
  maintenanceStatus: string; // status from MaintenanceRequestRegister
  maintenanceType?: string;
  repairFinishDate?: string;
  maintainedBy?: string;
  serialNoOfEquip?: string;
}

@Component({
  selector: 'app-given-sparparts-list',
  templateUrl: './given-sparparts-list.component.html',
  styleUrls: ['./given-sparparts-list.component.css']
})
export class GivenSparpartsListComponent implements OnInit {

  allSparePartsRequests: SparePartsRequest[] = [];
  maintenanceRegister: MaintenanceRecord[] = [];

  groupedBatches: Batch[] = [];
  filteredBatches: Batch[] = [];
  paginatedBatches: Batch[] = [];

  viewingBatch: Batch | null = null;
  maintenanceData: Partial<MaintenanceRecord> = {};

  isLoading = true;
  errorMessage = '';
  userRole: string = '';
  searchTerm: string = '';

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  isTeamLeader(): boolean {
    const teamLeaderRoles = ['PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'MAINTENANCE_LEADER'];
    return teamLeaderRoles.includes(this.userRole);
  }

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.loadData();
  }

  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();
    if (!role) {
      this.errorMessage = 'Session expired or role not found. Please log in again.';
      this.isLoading = false;
      return;
    }
    this.userRole = role.toUpperCase();
  }

  loadData(): void {
    const spareParts$ = this.http.get<SparePartsRequest[]>(`${environment.apiBaseUrl}/api/SparePartsRequest/all`);
    const maintenance$ = this.http.get<MaintenanceRecord[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`);

    forkJoin([spareParts$, maintenance$]).subscribe({
      next: ([spareParts, maintenance]) => {
        this.allSparePartsRequests = spareParts;
        this.maintenanceRegister = maintenance;
        this.buildBatches();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.errorMessage = 'Failed to load data from server.';
        this.isLoading = false;
      }
    });
  }

  buildBatches(): void {
    const maintenanceMap = new Map<string, MaintenanceRecord>(
      this.maintenanceRegister.map(r => [String(r.worksOrderNumber), r])
    );

    const maintenanceTypeMap = new Map<string, string>(
      this.maintenanceRegister.map(r => [String(r.worksOrderNumber), r.maintenanceType?.toUpperCase()])
    );
    const requestedToMap = new Map<string, string>(
      this.maintenanceRegister.map(r => [String(r.worksOrderNumber), (r.requestedTo || '').toLowerCase()])
    );

    // Only issued parts
    const issuedRequests = this.allSparePartsRequests.filter(req =>
      req.status === 'Issued' || req.status === 'Issued to Technician'
    );

    // Filter by role
    const filtered = issuedRequests.filter(req => {
      const key = String(req.worksOrderNumber);
      const mType = maintenanceTypeMap.get(key) || '';
      const reqTo = requestedToMap.get(key) || '';
      const rType = (req.requestType || '').toUpperCase();

      switch (this.userRole) {
        case 'PTEAM_LEADER':
        case 'POWER':
        case 'POWER_MAINTENANCE':
          return mType === 'POWER' || rType === 'POWER';

        case 'OTEAM_LEADER':
        case 'OFFICE_MACHINE':
        case 'OFFICE_MACHINE_MAINTENANCE':
        case 'IT_MAINTENANCE':
        case 'COMPUTER_MAINTENANCE':
          return mType === 'OFFICE_MACHINE' || rType === 'OFFICE_MACHINE';

        case 'RTEAM_LEADER':
        case 'RADIO_MAINTENANCE':
          return mType === 'RADIO_MAINTENANCE' || rType === 'RADIO_MAINTENANCE' ||
                 rType === 'VHF_RADIO' || rType === 'HF_RADIO';

        case 'VTEAM_LEADER':
        case 'VHF_RADIO':
        case 'VHF_MAINTENANCE':
          return rType === 'VHF_RADIO' || reqTo.includes('vhf');

        case 'HTEAM_LEADER':
        case 'HF_RADIO':
        case 'HF_MAINTENANCE':
          return rType === 'HF_RADIO' || reqTo.includes('hf_radio');

        case 'ELECTRICAL_MAINTENANCE':
          return rType === 'POWER' || reqTo.includes('electrical');

        case 'MECHANICAL_MAINTENANCE':
          return rType === 'POWER' || reqTo.includes('mechanical');

        case 'WELDING_MAINTENANCE':
          return rType === 'POWER' || reqTo.includes('welding');

        case 'MAINTENANCE_LEADER':
        case 'PPC':
        case 'MAINTENANCE_ADMIN':
          return true;

        default:
          return false;
      }
    });

    // Group by worksOrderNumber
    const groups = new Map<string, SparePartsRequest[]>();
    filtered.forEach(req => {
      const key = String(req.worksOrderNumber);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(req);
    });

    this.groupedBatches = Array.from(groups.entries())
      .map(([woNum, parts]) => {
        const mRecord = maintenanceMap.get(woNum);
        return {
          worksOrderNumber: woNum,
          parts,
          stockSummary: [...new Set(parts.map(p => p.stockNumber).filter(Boolean))].join(', '),
          requestedBy: parts[0].requestedBy || 'N/A',
          requestType: parts[0].requestType || 'N/A',
          maintenanceStatus: mRecord?.status || '',
          maintenanceType: mRecord?.maintenanceType || '',
          repairFinishDate: mRecord?.repairFinishDate || '',
          maintainedBy: mRecord?.maintainedBy || '',
          serialNoOfEquip: mRecord?.serialNoOfEquip || ''
        };
      })
      .sort((a, b) => Number(b.worksOrderNumber) - Number(a.worksOrderNumber));

    this.filterBatches();
  }

  filterBatches(): void {
    if (!this.searchTerm) {
      this.filteredBatches = [...this.groupedBatches];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredBatches = this.groupedBatches.filter(batch =>
        batch.worksOrderNumber.toLowerCase().includes(term) ||
        batch.requestedBy.toLowerCase().includes(term) ||
        batch.stockSummary.toLowerCase().includes(term) ||
        batch.requestType.toLowerCase().includes(term) ||
        batch.maintenanceStatus.toLowerCase().includes(term)
      );
    }
    this.totalPages = Math.ceil(this.filteredBatches.length / this.itemsPerPage);
    this.changePage(1);
  }

  changePage(page: number): void {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) return;
    if (this.totalPages === 0 && page > 1) return;
    this.currentPage = page;
    const start = (page - 1) * this.itemsPerPage;
    this.paginatedBatches = this.filteredBatches.slice(start, start + this.itemsPerPage);
  }

  openBatch(batch: Batch): void {
    this.viewingBatch = batch;
    this.maintenanceData = {};
    this.fetchMaintenanceData(batch.worksOrderNumber);
  }

  /** Sum partCost × quantityApproved for all issued parts in this batch */
  private calcBatchPartsCost(worksOrderNumber: string): number {
    return this.allSparePartsRequests
      .filter(r => String(r.worksOrderNumber) === String(worksOrderNumber) &&
                   (r.status === 'Issued' || r.status === 'Issued to Technician'))
      .reduce((sum, r) => sum + ((r as any).partCost || 0) * (r.quantityApproved ?? 1), 0);
  }

  fetchMaintenanceData(worksOrderNumber: string): void {
    this.http.get<any>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-worksorder/${worksOrderNumber}`)
      .subscribe({
        next: (record) => {
          // Fetch full record by id
          this.http.get<MaintenanceRecord>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/${record.id}`)
            .subscribe({
              next: (full) => {
                const autoPartsCost = this.calcBatchPartsCost(worksOrderNumber);
                const manHours = full?.manHours || 0;
                const laborCost = manHours * 250;
                this.maintenanceData = {
                  repairFinishDate: full?.repairFinishDate || '',
                  status: full?.status || '',
                  manHours,
                  partsCost: autoPartsCost,
                  laborCost,
                  totalCost: autoPartsCost + laborCost,
                  remark: full?.remark || ''
                };
              },
              error: (err) => console.error('Error fetching full maintenance record:', err)
            });
        },
        error: (err) => console.error('Error fetching maintenance record by works order:', err)
      });
  }

  onManHoursChange(): void {
    const manHours = this.maintenanceData.manHours || 0;
    const partsCost = this.maintenanceData.partsCost || 0;
    this.maintenanceData.laborCost = manHours * 250;
    this.maintenanceData.totalCost = partsCost + this.maintenanceData.laborCost;
  }

  onPartsCostChange(): void {
    // partsCost is auto-calculated — kept for safety but not triggered by user input
    const manHours = this.maintenanceData.manHours || 0;
    const partsCost = this.maintenanceData.partsCost || 0;
    this.maintenanceData.laborCost = manHours * 250;
    this.maintenanceData.totalCost = partsCost + this.maintenanceData.laborCost;
  }

  submitMaintenance(): void {
    if (!this.viewingBatch) return;

    if (!this.maintenanceData.status) {
      alert('Please select a status.');
      return;
    }
    if (!this.maintenanceData.repairFinishDate) {
      alert('Please enter the repair finish date.');
      return;
    }

    const worksOrderNumber = this.viewingBatch.worksOrderNumber;
    const firstName = this.authService.getFirstName() || '';
    const lastName = this.authService.getLastName() || '';
    const maintainedBy = `${firstName} ${lastName}`.trim() || this.authService.getUsername?.() || 'Unknown';

    const updatedMaintenanceData = {
      RepairFinishDate: new Date(this.maintenanceData.repairFinishDate).toISOString(),
      Status: this.maintenanceData.status,
      ManHours: this.maintenanceData.manHours ?? 0,
      PartsCost: this.maintenanceData.partsCost ?? 0,
      Remark: this.maintenanceData.remark || null,
      MaintainedBy: maintainedBy
    };

    const maintenanceUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update-maintenance/${worksOrderNumber}`;
    this.http.put(maintenanceUrl, updatedMaintenanceData).subscribe({
      next: () => {
        alert('✅ Maintenance updated successfully.');
        this.cancel();
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to save maintenance:', err);
        alert('❌ Failed to save maintenance: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  cancel(): void {
    this.viewingBatch = null;
    this.maintenanceData = {};
  }

  isTechnician(): boolean {
    return ['POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO',
            'POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'VHF_MAINTENANCE',
            'HF_MAINTENANCE', 'IT_MAINTENANCE', 'COMPUTER_MAINTENANCE'].includes(this.userRole);
  }

  isVhfHfRole(): boolean {
    return ['VHF_RADIO', 'HF_RADIO', 'VHF_MAINTENANCE', 'HF_MAINTENANCE'].includes(this.userRole);
  }

  isMaintenanceAlreadySaved(): boolean {
    const locked = ['Quality Check', 'Do Out', 'Maintenance Finished'];
    return locked.includes(this.maintenanceData.status || '');
  }

  isMaintenanceDone(batch: Batch): boolean {
    const activeStatuses = ['On Maintenance', 'On Maintaining', 'Waiting for Spare Part'];
    return !!batch.maintenanceStatus && !activeStatuses.includes(batch.maintenanceStatus);
  }
}
