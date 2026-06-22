import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatePipe } from '@angular/common';
import { NOTO_ETHIOPIC_BASE64 } from '../../../../assets/fonts/noto-ethiopic-base64';

interface MaintenanceRequest {
  worksOrderNumber: number;
  nomenclature: string;
  quantity: number;
  model: string;
  serialNoOfEquip: string;
  maintenanceType: string;
  requestedTo: string;
  requestedBy: string;
  dateWorkOrderReceived: string;
  status: string;
  maintainedBy?: string;
  repairStartDate?: string;
  repairFinishDate?: string;
  equipmentType?: {
    equipmentTypeName: string;
  };
}

@Component({
  selector: 'app-maintenance-request-list',
  templateUrl: './maintenance-request-list.component.html',
  styleUrls: ['./maintenance-request-list.component.css'],
  providers: [DatePipe]
})
export class MaintenanceRequestListComponent implements OnInit {
  maintenanceRequests: MaintenanceRequest[] = [];
  filteredRequests: MaintenanceRequest[] = [];
  paginatedRequests: MaintenanceRequest[] = [];

  userRole: string = '';
  searchTerm: string = '';
  selectedRoleFilter: string = '';
  selectedRadioFilter: string = '';
  selectedOfficeFilter: string = '';
  selectedStatusFilter: string = ''; // New filter for status
  selectedDateFilter: string = ''; // New filter for date

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;

  // Team-leader assign mode
  assignOptions: string[] = [];
  isAssignMode: boolean = false;
  selectedRequest: MaintenanceRequest | null = null;
  recommendation: string = '';

  // Detail Modal view
  viewingRequest: any = null;
  showFullDetails: boolean = false;

  private apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/filtered`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: any) => {
      if (params['assignMode'] && params['worksOrderNumber']) {
        this.isAssignMode = true;
        this.selectedRequest =
          this.maintenanceRequests.find(
            (r) => r.worksOrderNumber.toString() === params['worksOrderNumber']
          ) || null;
      } else {
        this.isAssignMode = false;
        this.selectedRequest = null;
      }
    });

    this.loadRequests();
  }

  // ─── DATA LOAD ────────────────────────────────────────────────────────────

  loadRequests(): void {
    const role = this.authService.getRole()?.trim();

    if (!role) {
      alert('Please log in again.');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.userRole = role.toUpperCase();

    const maintenanceType = this.getMaintenanceTypeByRole(this.userRole);
    const requestedTo = this.getRequestedToByRole(this.userRole);

    let fetchUrl = this.apiUrl;
    const params: any = {};

    if (['PPC', 'MAINTENANCE_LEADER', 'MAINTENANCE_ADMIN', 'QUALITY'].includes(this.userRole)) {
      fetchUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;
    } else {
      // Must have at least one filter
      if (!maintenanceType && !requestedTo) {
        alert('Your account role is not authorized for this module.');
        return;
      }
      if (maintenanceType) params['maintenanceType'] = maintenanceType;
      if (requestedTo) params['requestedTo'] = requestedTo;
    }

    this.http.get<MaintenanceRequest[]>(fetchUrl, { params }).subscribe({
      next: (data) => {
        this.maintenanceRequests = data.sort(
          (a, b) => b.worksOrderNumber - a.worksOrderNumber
        );
        this.applyFilters();
      },
      error: (error) => {
        if (error.status === 401 || error.status === 403) {
          alert('Access denied. Please log in again.');
          this.router.navigate(['/login'], { replaceUrl: true });
        } else if (error.status === 404) {
          this.maintenanceRequests = [];
          this.filteredRequests = [];
          this.paginatedRequests = [];
        } else {
          alert('Unable to load data. Please try again later.');
        }
      },
    });
  }

  // ─── SEARCH & FILTERING ───────────────────────────────────────────────────

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let temp = [...this.maintenanceRequests];

    // 1. Search Term Filter
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      temp = temp.filter(r =>
        r.serialNoOfEquip?.toLowerCase().includes(term) ||
        r.model?.toLowerCase().includes(term) ||
        r.requestedBy?.toLowerCase().includes(term) ||
        r.nomenclature?.toLowerCase().includes(term) ||
        r.worksOrderNumber?.toString().includes(term)
      );
    }

    // 1.5 Status Filter - Updated for maintenance leader requests
    if (this.selectedStatusFilter) {
      temp = temp.filter(r => {
        const s = r.status || 'Pending';
        if (this.selectedStatusFilter === 'PENDING') {
          return s === 'Pending' || s === 'Waiting for Approval';
        }
        if (this.selectedStatusFilter === 'PROGRESS') {
          return s === 'On Maintaining' || s === 'On Maintenance' || s === 'In Progress';
        }
        if (this.selectedStatusFilter === 'SPARE') {
          return s === 'Waiting for Spare Part' || s === 'Approved - Waiting for Parts' || s === 'Waiting for Ministore';
        }
        if (this.selectedStatusFilter === 'COMPLETED') {
          return s === 'Maintenance Finished' || s === 'Client Received';
        }
        if (this.selectedStatusFilter === 'QUALITY') {
          return s === 'Quality Check';
        }
        if (this.selectedStatusFilter === 'DO_OUT') {
          return s === 'Do Out';
        }
        return true;
      });
    }

    // 2. Manager (MAINTENANCE_LEADER) Role Filter
    if (this.userRole === 'MAINTENANCE_LEADER' && this.selectedRoleFilter) {
      temp = temp.filter(r => {
        const stage = (r as any).statusStage || '';
        const type = r.maintenanceType || '';
        const reqTo = r.requestedTo || '';

        if (this.selectedRoleFilter === 'POWER') {
          return stage === 'POWER' || type.toLowerCase().includes('power');
        }
        if (this.selectedRoleFilter === 'OFFICE_MACHINE') {
          return stage === 'OFFICE_MACHINE' || type.toLowerCase().includes('office');
        }
        if (this.selectedRoleFilter === 'RADIO_MAINTENANCE') {
          return stage === 'RADIO_MAINTENANCE' || 
                 reqTo.toLowerCase().includes('radio') || 
                 reqTo.toLowerCase().includes('vhf') || 
                 reqTo.toLowerCase().includes('hf');
        }
        return true;
      });
    }

    // 3. RTEAM_LEADER Radio Sub-unit Filter
    if (this.userRole === 'RTEAM_LEADER' && this.selectedRadioFilter) {
      temp = temp.filter(r => {
        const reqTo = r.requestedTo || '';
        if (this.selectedRadioFilter === 'VHF') {
          return reqTo === 'VHF_Radio Maintenance';
        }
        if (this.selectedRadioFilter === 'HF') {
          return reqTo === 'HF_Radio Maintenance';
        }
        if (this.selectedRadioFilter === 'NOT_ASSIGNED') {
          return !reqTo || reqTo === 'RADIO_MAINTENANCE Maintenance';
        }
        return true;
      });
    }

    // 4. OTEAM_LEADER Office Sub-unit Filter
    if (this.userRole === 'OTEAM_LEADER' && this.selectedOfficeFilter) {
      temp = temp.filter(r => {
        const reqTo = r.requestedTo || '';
        if (this.selectedOfficeFilter === 'OFFICE_MACHINE') {
          return reqTo === 'Office_Machine Maintenance';
        }
        if (this.selectedOfficeFilter === 'COMPUTER') {
          return reqTo === 'Computer_Maintenance';
        }
        if (this.selectedOfficeFilter === 'NOT_ASSIGNED') {
          return !reqTo || reqTo === 'OFFICE_MACHINE Maintenance';
        }
        return true;
      });
    }

    // 5. Date Filter
    if (this.selectedDateFilter) {
      const now = new Date();
      let filterDate = new Date();
      
      switch(this.selectedDateFilter) {
        case '1WEEK': filterDate.setDate(now.getDate() - 7); break;
        case '1MONTH': filterDate.setMonth(now.getMonth() - 1); break;
        case '3MONTHS': filterDate.setMonth(now.getMonth() - 3); break;
        case '6MONTHS': filterDate.setMonth(now.getMonth() - 6); break;
        case '9MONTHS': filterDate.setMonth(now.getMonth() - 9); break;
        case '12MONTHS': filterDate.setFullYear(now.getFullYear() - 1); break;
      }

      temp = temp.filter(r => {
        const reqDate = new Date(r.dateWorkOrderReceived);
        return reqDate >= filterDate;
      });
    }

    this.filteredRequests = temp;
    this.currentPage = 1;
    this.updatePagination();
  }

  // ─── DOWNLOADS ────────────────────────────────────────────────────────────

  private registerEthiopicFont(doc: jsPDF): void {
    doc.addFileToVFS('NotoSerifEthiopic.ttf', NOTO_ETHIOPIC_BASE64);
    doc.addFont('NotoSerifEthiopic.ttf', 'NotoEthiopic', 'normal');
    doc.addFont('NotoSerifEthiopic.ttf', 'NotoEthiopic', 'bold');
  }

  private pdfText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    size: number,
    weight: 'normal' | 'bold' = 'normal',
    color: [number, number, number] = [30, 60, 114],
    align: 'left' | 'center' | 'right' = 'left'
  ): void {
    const hasEthiopic = /[\u1200-\u137F]/.test(text);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    
    if (hasEthiopic) {
      doc.setFont('NotoEthiopic', 'normal');
    } else {
      doc.setFont('helvetica', weight);
    }
    
    doc.text(text, x, y, { align });
    doc.setFont('helvetica', 'normal');
  }

  downloadExcel(): void {
    const data = this.filteredRequests.map((r, i) => ({
      '#': i + 1,
      'Order #': r.worksOrderNumber,
      'Model': r.model || 'N/A',
      'Serial': r.serialNoOfEquip || 'N/A',
      'Category': r.nomenclature || 'N/A',
      'Qty': r.quantity,
      'Requested By': r.requestedBy || 'N/A',
      'Maintained By': r.maintainedBy || 'N/A',
      'Date': this.datePipe.transform(r.dateWorkOrderReceived, 'MMM d, y') || 'N/A',
      'Status': r.status || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MaintenanceRequests');
    XLSX.writeFile(workbook, `Maintenance_Requests_${new Date().toLocaleDateString()}.xlsx`);
  }

  downloadPDF(): void {
    const doc = new jsPDF('l', 'mm', 'a4');
    this.registerEthiopicFont(doc);

    // Header
    this.pdfText(doc, 'በኢፌዲሪ መከላከያ ሚኒስቴር በመገናኛና እንፎርሜሽን ዋና መምሪያ', 148, 15, 10, 'normal', [30, 60, 114], 'center');
    this.pdfText(doc, 'Maintenance Request List / የጥገና መጠየቂያ ዝርዝር', 148, 22, 14, 'bold', [30, 60, 114], 'center');

    const head = [['#', 'Order #', 'Model', 'Serial', 'Category', 'Qty', 'Requested By', 'Date', 'Status']];
    const body = this.filteredRequests.map((r, i) => [
      i + 1,
      r.worksOrderNumber,
      r.model || 'N/A',
      r.serialNoOfEquip || 'N/A',
      r.nomenclature || 'N/A',
      r.quantity,
      r.requestedBy || 'N/A',
      this.datePipe.transform(r.dateWorkOrderReceived, 'MMM d, y') || 'N/A',
      r.status || 'N/A'
    ]);

    autoTable(doc, {
      head: head,
      body: body,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [30, 60, 114], textColor: 255, font: 'NotoEthiopic' },
      bodyStyles: { font: 'NotoEthiopic', fontSize: 8 },
      styles: { fontSize: 8 }
    });

    doc.save(`Maintenance_Requests_${new Date().toLocaleDateString()}.pdf`);
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatusFilter = status;
    this.applyFilters();
  }

  // ─── PAGINATION ───────────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.itemsPerPage);
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  // ─── STATS ────────────────────────────────────────────────────────────────

  getPendingCount(): number {
    return this.filteredRequests.filter(r =>
      r.status === 'Waiting for Approval' ||
      r.status === 'Pending' ||
      !r.status
    ).length;
  }

  getInProgressCount(): number {
    return this.filteredRequests.filter(r =>
      r.status === 'On Maintaining' ||
      r.status === 'On Maintenance' ||
      r.status === 'In Progress' ||
      r.status === 'Spare Part Rejected' ||
      r.status === 'Rejected by Maintenance Leader'
    ).length;
  }

  getWaitingSparePartCount(): number {
    return this.filteredRequests.filter(r => 
      r.status === 'Waiting for Spare Part' || 
      r.status === 'Approved - Waiting for Parts' ||
      r.status === 'Waiting for Maintenance Leader Approval' ||
      r.status === 'Waiting for Ministore'
    ).length;
  }

  getCompletedCount(): number {
    return this.filteredRequests.filter(r =>
      r.status === 'Maintenance Finished' ||
      r.status === 'Client Received'
    ).length;
  }

  getQualityCheckCount(): number {
    return this.filteredRequests.filter(r => r.status === 'Quality Check').length;
  }

  getDoOutCount(): number {
    return this.filteredRequests.filter(r => r.status === 'Do Out').length;
  }

  // ─── STATUS HELPERS ───────────────────────────────────────────────────────

  getStatusClass(request: MaintenanceRequest): string {
    switch (request.status) {
      case 'Maintenance Finished':
      case 'Client Received':
        return 'badge bg-success';
      case 'Quality Check':
      case 'On Maintaining':
      case 'On Maintenance':
        return 'badge bg-info text-dark';
      case 'Waiting for Approval':
        return 'badge bg-warning text-dark';
      case 'Waiting for Spare Part':
        return 'badge bg-warning text-dark';
      case 'Approved - Waiting for Parts':
        return 'badge bg-warning text-dark';
      case 'Waiting for Maintenance Leader Approval':
        return 'badge bg-warning text-dark';
      case 'Waiting for Ministore':
        return 'badge bg-warning text-dark';
      case 'Do Out':
        return 'badge bg-danger';
      case 'Spare Part Rejected':
      case 'Rejected by Maintenance Leader':
        return 'badge bg-danger text-white';
      default:
        return 'badge bg-secondary';
    }
  }

  getStatusText(request: MaintenanceRequest): string {
    if (request.status === 'Approved - Waiting for Parts') return 'Waiting for Leader';
    if (request.status === 'Waiting for Maintenance Leader Approval') return 'Waiting for Leader';
    if (request.status === 'Waiting for Ministore') return 'Waiting for Ministore';
    if (request.status === 'Spare Part Rejected') return 'Part Rejected';
    if (request.status === 'Rejected by Maintenance Leader') return 'Rejected by Leader';
    return request.status || 'Pending';
  }

  // ─── ROLE MAPS ────────────────────────────────────────────────────────────

  getDepartmentLabel(): string {
    const map: Record<string, string> = {
      POWER:                         'Power Maintenance',
      POWER_MAINTENANCE:             'Power Maintenance',
      PTEAM_LEADER:                  'Power Maintenance',
      OFFICE_MACHINE:                'Office Machine Maintenance',
      OFFICE_MACHINE_MAINTENANCE:    'Office Machine Maintenance',
      OTEAM_LEADER:                  'Office Machine Maintenance (All)',
      IT_MAINTENANCE:                'Office Machine Maintenance',
      COMPUTER_MAINTENANCE:          'Computer Maintenance',
      ELECTRICAL_MAINTENANCE:        'Electrical Maintenance',
      MECHANICAL_MAINTENANCE:        'Mechanical Maintenance',
      WELDING_MAINTENANCE:           'Welding Maintenance',
      RADIO_MAINTENANCE:             'Radio Maintenance Department',
      RTEAM_LEADER:                  'Radio Maintenance Department (All)',
      VTEAM_LEADER:                  'VHF Radio Maintenance (Leader)',
      HTEAM_LEADER:                  'HF Radio Maintenance (Leader)',
      VHF_RADIO:                     'VHF Radio Maintenance',
      VHF_MAINTENANCE:               'VHF Radio Maintenance',
      HF_RADIO:                      'HF Radio Maintenance',
      HF_MAINTENANCE:                'HF Radio Maintenance',
      PPC:                           'Production Planning & Control (All)',
      MAINTENANCE_LEADER:            'Maintenance Leader (All)',
      MAINTENANCE_ADMIN:             'Maintenance Admin (All)',
      QUALITY:                       'Quality Control (All)',
    };
    return map[this.userRole] || this.userRole;
  }

  getMaintenanceTypeByRole(role: string): string {
    const map: Record<string, string> = {
      POWER:                         'Power',
      POWER_MAINTENANCE:             'Power',
      PTEAM_LEADER:                  'Power',
      OFFICE_MACHINE:                'Office_Machine',
      OFFICE_MACHINE_MAINTENANCE:    'Office_Machine',
      OTEAM_LEADER:                  'Office_Machine',
      IT_MAINTENANCE:                'Office_Machine',
      COMPUTER_MAINTENANCE:          'Office_Machine',
      ELECTRICAL_MAINTENANCE:        'Power',
      MECHANICAL_MAINTENANCE:        'Power',
      WELDING_MAINTENANCE:           'Power',
      RADIO_MAINTENANCE:             'RADIO_MAINTENANCE',
      RTEAM_LEADER:                  'RADIO_MAINTENANCE',
      VTEAM_LEADER:                  '',
      HTEAM_LEADER:                  '',
      VHF_RADIO:                     '',
      VHF_MAINTENANCE:               '',
      HF_RADIO:                      '',
      HF_MAINTENANCE:                '',
    };
    return map[role] || '';
  }

  getRequestedToByRole(role: string): string {
    const map: Record<string, string> = {
      POWER:                         'Power Maintenance',
      POWER_MAINTENANCE:             'Power Maintenance',
      PTEAM_LEADER:                  '',                          // sees all power maintenance requests
      OFFICE_MACHINE:                'Office_Machine Maintenance',
      OFFICE_MACHINE_MAINTENANCE:    'Office_Machine Maintenance',
      OTEAM_LEADER:                  '',                          // sees all office machine requests
      IT_MAINTENANCE:                'Office_Machine Maintenance',
      COMPUTER_MAINTENANCE:          'Computer_Maintenance',
      ELECTRICAL_MAINTENANCE:        'Electrical Maintenance',
      MECHANICAL_MAINTENANCE:        'Mechanical Maintenance',
      WELDING_MAINTENANCE:           'Welding Maintenance',
      RADIO_MAINTENANCE:             'RADIO_MAINTENANCE Maintenance',
      RTEAM_LEADER:                  '',
      VTEAM_LEADER:                  'VHF_Radio Maintenance',
      HTEAM_LEADER:                  'HF_Radio Maintenance',
      VHF_RADIO:                     'VHF_Radio Maintenance',
      VHF_MAINTENANCE:               'VHF_Radio Maintenance',
      HF_RADIO:                      'HF_Radio Maintenance',
      HF_MAINTENANCE:                'HF_Radio Maintenance',
    };
    return map[role] || '';
  }

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  requestPart(request: MaintenanceRequest): void {
    this.router.navigate(['/maintenance/spare-parts-requests/add'], {
      queryParams: {
        worksOrderNumber: request.worksOrderNumber,
        nomenclature: request.nomenclature,
        quantity: request.quantity,
        model: request.model,
        serialNoOfEquip: request.serialNoOfEquip,
      },
    });
  }

  goToMaintainForm(request: MaintenanceRequest): void {
    this.router.navigate(['/maintenance/maintain', request.worksOrderNumber]);
  }

  acceptRequest(worksOrderNumber: number): void {
    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/accept/${worksOrderNumber}`;
    this.http.put(url, {}).subscribe({
      next: () => { alert('Request accepted successfully.'); this.loadRequests(); },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        } else {
          alert('Failed to accept request.');
        }
      },
    });
  }

  assignRequest(request: MaintenanceRequest): void {
    // RTEAM_LEADER picks VHF or HF sub-unit
    if (this.userRole === 'RTEAM_LEADER') {
      this.assignOptions = ['VHF_Radio Maintenance', 'HF_Radio Maintenance'];
      request.requestedTo = this.assignOptions[0];
      this.selectedRequest = request;
      this.isAssignMode = true;
      return;
    }

    // OTEAM_LEADER picks Office Machine or Computer sub-unit
    if (this.userRole === 'OTEAM_LEADER') {
      this.assignOptions = ['Office_Machine Maintenance', 'Computer_Maintenance'];
      request.requestedTo = this.assignOptions[0];
      this.selectedRequest = request;
      this.isAssignMode = true;
      return;
    }

    // PTEAM_LEADER picks Electrical, Mechanical or Welding sub-unit
    if (this.userRole === 'PTEAM_LEADER') {
      this.assignOptions = ['Electrical Maintenance', 'Mechanical Maintenance', 'Welding Maintenance'];
      request.requestedTo = this.assignOptions[0];
      this.selectedRequest = request;
      this.isAssignMode = true;
      return;
    }

    // Default — approve directly
    this.approveDirectly(request);
  }

  approveDirectly(request: MaintenanceRequest): void {
    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/assign/${request.worksOrderNumber}`;
    const body = { requestedTo: request.requestedTo, recommendation: '' };

    this.http.put(url, body).subscribe({
      next: () => {
        alert('Request approved and assigned to technicians.');
        this.loadRequests();
      },
      error: (err) => {
        console.error('Failed to approve request:', err);
        alert('Error occurred while approving. Please try again.');
      },
    });
  }

  submitAssignment(): void {
    if (!this.selectedRequest) return;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/assign/${this.selectedRequest.worksOrderNumber}`;
    const body = { requestedTo: this.selectedRequest.requestedTo, recommendation: this.recommendation };

    console.log('Submitting assignment:', body);

    this.http.put(url, body).subscribe({
      next: () => {
        alert('Assignment updated successfully!');
        this.isAssignMode = false;
        this.recommendation = '';
        this.loadRequests();
      },
      error: (err) => {
        console.error('Failed to update assignment:', err);
        alert('Error occurred while assigning. Please try again.');
      },
    });
  }

  viewDetails(request: any): void {
    this.viewingRequest = request;
    this.showFullDetails = false;
    const modalElement = document.getElementById('viewModal');
    if (modalElement) {
      const bootstrap = (window as any).bootstrap;
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  toggleFullDetails(): void {
    this.showFullDetails = !this.showFullDetails;
  }
}
