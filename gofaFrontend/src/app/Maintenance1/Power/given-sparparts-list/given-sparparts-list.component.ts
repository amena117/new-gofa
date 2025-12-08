import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

  // 🔽 Add these missing ones
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
  repairFinishDate: string;
  status: string;
  manHours: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  remark: string;
}

@Component({
  selector: 'app-given-sparparts-list',
  templateUrl: './given-sparparts-list.component.html',
  styleUrls: ['./given-sparparts-list.component.css']
})
export class GivenSparpartsListComponent implements OnInit {
  @ViewChild('formSection') formSection!: ElementRef;

  allSparePartsRequests: SparePartsRequest[] = [];
  sparePartsRequests: SparePartsRequest[] = [];
  paginatedRequests: SparePartsRequest[] = [];
  selectedRequest: SparePartsRequest | null = null;
  maintenanceData: Partial<MaintenanceRecord> = {};
  approvalData: any = {};
  isLoading = true;
  errorMessage = '';
  isMaintenanceMode = true;
  userRole: string = '';
  maintenanceRegister: MaintenanceRecord[] = [];

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.loadData();
  }

  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();
    if (!role) {
      console.warn('User role not found.');
      this.errorMessage = 'Session expired or role not found. Please log in again.';
      this.isLoading = false;
      return;
    }
    this.userRole = role.toUpperCase();
  }

  private loadData(): void {
    const spareParts$ = this.http.get<SparePartsRequest[]>(`${environment.apiBaseUrl}/api/SparePartsRequest/all`);
    const maintenance$ = this.http.get<MaintenanceRecord[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`);

    forkJoin([spareParts$, maintenance$]).subscribe({
      next: ([spareParts, maintenance]) => {
        this.allSparePartsRequests = spareParts;
        this.maintenanceRegister = maintenance;
        this.applyRoleBasedFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.errorMessage = 'Failed to load data from server.';
        this.isLoading = false;
      }
    });
  }

  applyRoleBasedFilter(): void {
    if (!this.userRole) {
      this.sparePartsRequests = [];
      this.updatePagination();
      return;
    }

    const maintenanceTypeMap = new Map<string, string>(
      this.maintenanceRegister.map(r => [r.worksOrderNumber, r.maintenanceType?.toUpperCase()])
    );

    let filteredRequests: SparePartsRequest[] = [];

    switch (this.userRole) {
      case 'PTEAM_LEADER':
        filteredRequests = this.allSparePartsRequests.filter(req =>
          maintenanceTypeMap.get(req.worksOrderNumber) === 'POWER' &&
          req.approvedBy === 'MINISTORE' &&
          req.requestType === 'POWER'
        );
        break;
      case 'OTEAM_LEADER':
        filteredRequests = this.allSparePartsRequests.filter(req =>
          maintenanceTypeMap.get(req.worksOrderNumber) === 'OFFICE_MACHINE' &&
          req.approvedBy === 'MINISTORE' &&
          req.requestType === 'OFFICE_MACHINE'
        );
        break;
      case 'VTEAM_LEADER':
        filteredRequests = this.allSparePartsRequests.filter(req =>
          maintenanceTypeMap.get(req.worksOrderNumber) === 'VHF_RADIO' &&
          req.approvedBy === 'MINISTORE' &&
          req.requestType === 'VHF_RADIO'
        );
        break;
      case 'HTEAM_LEADER':
        filteredRequests = this.allSparePartsRequests.filter(req =>
          maintenanceTypeMap.get(req.worksOrderNumber) === 'HF_RADIO' &&
          req.approvedBy === 'MINISTORE' &&
          req.requestType === 'HF_RADIO'
        );
        break;
      case 'POWER':
        filteredRequests = this.allSparePartsRequests.filter(req => req.approvedBy === 'PTEAM_LEADER');
        break;
      case 'OFFICE_MACHINE':
        filteredRequests = this.allSparePartsRequests.filter(req => req.approvedBy === 'OTEAM_LEADER');
        break;
      case 'VHF_RADIO':
      case 'HF_RADIO':
        filteredRequests = this.allSparePartsRequests.filter(req =>
          req.approvedBy === 'VTEAM_LEADER' || req.approvedBy === 'HTEAM_LEADER'
        );
        break;
      default:
        filteredRequests = [];
    }

    this.sparePartsRequests = filteredRequests.sort((a, b) => b.id - a.id);
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.sparePartsRequests.length / this.itemsPerPage);
    this.changePage(this.currentPage);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRequests = this.sparePartsRequests.slice(startIndex, endIndex);
  }

  getActionButtonLabel(): string {
    if (['POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO'].includes(this.userRole)) return 'Maintain';
    if (['PTEAM_LEADER', 'OTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER'].includes(this.userRole)) return 'Approve';
    return 'Action';
  }

  onManHoursChange(): void {
    const manHours = this.maintenanceData.manHours || 0;
    const partsCost = this.maintenanceData.partsCost || 0;
    this.maintenanceData.laborCost = manHours * 250;
    this.maintenanceData.totalCost = partsCost + this.maintenanceData.laborCost;
  }

  openForm(request: SparePartsRequest): void {
    this.selectedRequest = { ...request };
    this.isMaintenanceMode = ['POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO'].includes(this.userRole);

    if (this.isMaintenanceMode) this.fetchMaintenanceData(request.worksOrderNumber);
    else this.approvalData = { quantityApproved: request.quantityAsked, remark: '' };

    setTimeout(() => {
      this.formSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  fetchMaintenanceData(worksOrderNumber: string): void {
    this.maintenanceData = {};
    this.http.get<MaintenanceRecord>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/${worksOrderNumber}`)
      .subscribe({
        next: (record) => {
          this.maintenanceData = {
            repairFinishDate: record?.repairFinishDate || '',
            status: record?.status || '',
            manHours: record?.manHours || 0,
            partsCost: record?.partsCost || 0,
            laborCost: record?.laborCost || 0,
            totalCost: record?.totalCost || 0,
            remark: record?.remark || ''
          };
        },
        error: (err) => console.error('Error fetching maintenance record:', err)
      });
  }

  submitMaintenance(): void {
    if (!this.selectedRequest) return;
    const worksOrderNumber = this.selectedRequest.worksOrderNumber;
    const requestId = this.selectedRequest.id;
    const maintenanceUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/update-maintenance/${worksOrderNumber}`;
    const sparePartsRequestUrl = `${environment.apiBaseUrl}/api/SparePartsRequest/update-status/${requestId}`;
    const maintainedBy = this.authService.getUsername?.() || 'Unknown';

    const updatedMaintenanceData = {
      repairFinishDate: this.maintenanceData.repairFinishDate,
      status: this.maintenanceData.status,
      manHours: this.maintenanceData.manHours,
      remark: this.maintenanceData.remark,
      maintainedBy
    };

    this.http.put(maintenanceUrl, updatedMaintenanceData).subscribe({
      next: () => {
        this.http.put(sparePartsRequestUrl, { status: 'Quality Check' }).subscribe({
          next: () => {
            alert('✅ Maintenance and Spare Parts Request updated successfully.');
            this.cancel();
            this.loadData();
          },
          error: (err) => alert(`⚠️ Maintenance saved, but failed to update request status.`)
        });
      },
      error: (err) => alert(`❌ Failed to save maintenance.`)
    });
  }

  submitApproval(): void {
    if (!this.selectedRequest) return;
    const requestId = this.selectedRequest.id;
    const url = `${environment.apiBaseUrl}/api/SparePartsRequest/approve/${requestId}`;
    const updatedData = {
      quantityApproved: this.approvalData.quantityApproved,
      approvedBy: this.userRole,
      approvalDate: new Date().toISOString(),
      remark: this.approvalData.remark || ''
    };

    this.http.put(url, updatedData).subscribe({
      next: () => {
        alert('✅ Approval saved successfully.');
        this.cancel();
        this.loadData();
      },
      error: (err) => alert(`❌ Failed to save approval.`)
    });
  }

  cancel(): void {
    this.selectedRequest = null;
    this.maintenanceData = {};
    this.approvalData = {};
  }
}
