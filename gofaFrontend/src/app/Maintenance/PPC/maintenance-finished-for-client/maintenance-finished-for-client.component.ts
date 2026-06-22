import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-maintenance-finished-for-client',
  templateUrl: './maintenance-finished-for-client.component.html',
  styleUrls: ['./maintenance-finished-for-client.component.css']
})
export class MaintenanceFinishedForClientComponent implements OnInit {
  maintenanceRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Search & filter
  searchValue: string = '';
  selectedMaintenanceType: string = '';
  selectedRadioFilter: string = '';
  selectedOfficeFilter: string = '';
  selectedPowerFilter: string = '';
  selectedDateFilter: string = ''; // New: Filter by date range

  // Pagination
  currentPage = 1;
  pageSize = 15;

  // Delivery Form State
  showDeliveryForm: boolean = false;
  isFormLoading: boolean = false;
  formErrorMessage: string = '';
  deliveryFormData: any = {};

  // Detail modal
  viewingItem: any = null;

  userRole: string = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.fetchMaintenanceRequests();
  }

  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();
    this.userRole = role ? role.toUpperCase() : '';
  }

 fetchMaintenanceRequests(): void {
  this.isLoading = true;
  this.errorMessage = '';

  // Use the base endpoint for all roles to ensure visibility across status changes
  const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;

  this.http.get<any[]>(url).subscribe(
    (data) => {
      const matchesStage = (r: any, target: string) => {
        const stage    = (r.statusStage    || '').toUpperCase();
        const type     = (r.maintenanceType || '').toUpperCase();
        const reqTo    = (r.requestedTo    || '').toUpperCase().replace(/[_\s]/g, '');
        const t        = target.toUpperCase().replace(/[_\s]/g, '');
        return stage === target.toUpperCase() || type === target.toUpperCase() ||
               type.replace(/[_\s]/g, '') === t || reqTo.includes(t);
      };

      let filtered = data;

      if (this.userRole === 'QUALITY') {
        // Quality ONLY sees VHF and HF radios that are waiting for check OR finished
        filtered = filtered.filter(r => 
          ['Quality Check', 'Maintenance Finished'].includes(r.status) &&
          (matchesStage(r, 'VHF_RADIO') || matchesStage(r, 'HF_RADIO'))
        );
      } else if (['PPC', 'MAINTENANCE_LEADER', 'MAINTENANCE_REPORTING'].includes(this.userRole)) {
        // PPC and leader see items ready for delivery, but also those in quality check
        filtered = filtered.filter(r =>
          ['Quality Check', 'Maintenance Finished', 'Do Out', 'Client Received'].includes(r.status)
        );
      } else {
        // Technicians and team leaders only see their own finished items
        filtered = filtered.filter(r => r.status === 'Maintenance Finished');
      }

      switch (this.userRole) {
        case 'RTEAM_LEADER':
        case 'RADIO_MAINTENANCE':
          // RTEAM_LEADER sees all radio (VHF + HF + unassigned)
          filtered = filtered.filter(r =>
            matchesStage(r, 'VHF_RADIO') || matchesStage(r, 'HF_RADIO') || matchesStage(r, 'RADIO_MAINTENANCE')
          );
          break;

        case 'VTEAM_LEADER':
        case 'VHF_RADIO':
        case 'VHF_MAINTENANCE':
          filtered = filtered.filter(r =>
            (r.requestedTo || '').toLowerCase().includes('vhf')
          );
          break;

        case 'HTEAM_LEADER':
        case 'HF_RADIO':
        case 'HF_MAINTENANCE':
          filtered = filtered.filter(r =>
            (r.requestedTo || '').toLowerCase().includes('hf_radio') ||
            (r.requestedTo || '').toLowerCase().includes('hf radio')
          );
          break;

        case 'PTEAM_LEADER':
        case 'POWER':
        case 'POWER_MAINTENANCE':
          filtered = filtered.filter(r => 
            matchesStage(r, 'POWER') || matchesStage(r, 'ELECTRICAL') || matchesStage(r, 'MECHANICAL') || matchesStage(r, 'WELDING')
          );
          break;

        case 'OFFICE_MACHINE':
        case 'OFFICE_MACHINE_MAINTENANCE':
          filtered = filtered.filter(r =>
            (r.requestedTo || '').toLowerCase().includes('office_machine') ||
            (r.requestedTo || '').toLowerCase().includes('office machine')
          );
          break;

        case 'IT_MAINTENANCE':
        case 'COMPUTER_MAINTENANCE':
          filtered = filtered.filter(r =>
            (r.requestedTo || '').toLowerCase().includes('computer')
          );
          break;

        case 'ELECTRICAL_MAINTENANCE':
          filtered = filtered.filter(r => (r.requestedTo || '').toLowerCase().includes('electrical'));
          break;
        case 'MECHANICAL_MAINTENANCE':
          filtered = filtered.filter(r => (r.requestedTo || '').toLowerCase().includes('mechanical'));
          break;
        case 'WELDING_MAINTENANCE':
          filtered = filtered.filter(r => (r.requestedTo || '').toLowerCase().includes('welding'));
          break;

        case 'OTEAM_LEADER':
          filtered = filtered.filter(r => 
            matchesStage(r, 'OFFICE_MACHINE') || matchesStage(r, 'COMPUTER')
          );
          break;

        case 'PPC':
        case 'MAINTENANCE_LEADER':
        case 'MAINTENANCE_REPORTING':
        case 'QUALITY':
          // See all
          break;

        default:
          filtered = [];
      }

      this.maintenanceRequests = filtered;
      this.filteredRequests = [...filtered];
      this.currentPage = 1;
      this.applyPagination();
      this.isLoading = false;
    },
    (error) => {
      console.error('Error fetching maintenance requests:', error);
      if (error.status === 404) {
        this.maintenanceRequests = [];
        this.filteredRequests = [];
        this.paginatedRequests = [];
      } else {
        this.errorMessage = 'Failed to load maintenance data. Please try again.';
      }
      this.isLoading = false;
    }
  );
}

  // ====== SEARCH / FILTER / PAGINATION =======

  resetFilters(): void {
    this.searchValue = '';
    this.selectedMaintenanceType = '';
    this.selectedRadioFilter = '';
    this.selectedOfficeFilter = '';
    this.selectedPowerFilter = '';
    this.selectedDateFilter = '';
    this.currentPage = 1;
    this.filteredRequests = [...this.maintenanceRequests];
    this.applyPagination();
  }

  applySearchAndFilter(): void {
    this.currentPage = 1;
    let result = [...this.maintenanceRequests];

    // PPC / MAINTENANCE_LEADER: filter by maintenance type dropdown
    if (this.selectedMaintenanceType) {
      const type = this.selectedMaintenanceType;
      result = result.filter(r => {
        const mType = r.maintenanceType?.toUpperCase().trim();
        if (type === 'RADIO_MAINTENANCE') {
          return mType === 'RADIO_MAINTENANCE' || mType === 'VHF_RADIO' || mType === 'HF_RADIO';
        }
        if (type === 'OFFICE_MACHINE') {
          return mType === 'OFFICE_MACHINE' || mType === 'COMPUTER_MAINTENANCE';
        }
        return mType === type;
      });
    }

    // Date Range Filter
    if (this.selectedDateFilter) {
      const now = new Date();
      let startDate = new Date();

      switch (this.selectedDateFilter) {
        case '1w': startDate.setDate(now.getDate() - 7); break;
        case '1m': startDate.setMonth(now.getMonth() - 1); break;
        case '3m': startDate.setMonth(now.getMonth() - 3); break;
        case '6m': startDate.setMonth(now.getMonth() - 6); break;
        case '9m': startDate.setMonth(now.getMonth() - 9); break;
        case '12m': startDate.setFullYear(now.getFullYear() - 1); break;
      }

      result = result.filter(r => {
        const finishDate = r.repairFinishDate ? new Date(r.repairFinishDate) : null;
        return finishDate && finishDate >= startDate;
      });
    }

    // RTEAM_LEADER: filter by VHF or HF via requestedTo
    if (this.selectedRadioFilter === 'VHF') {
      result = result.filter(r => (r.requestedTo || '').toLowerCase().includes('vhf'));
    } else if (this.selectedRadioFilter === 'HF') {
      result = result.filter(r =>
        (r.requestedTo || '').toLowerCase().includes('hf_radio') ||
        (r.requestedTo || '').toLowerCase().includes('hf radio')
      );
    }

    // OTEAM_LEADER: filter by OFFICE_MACHINE or COMPUTER via requestedTo
    if (this.selectedOfficeFilter === 'OFFICE_MACHINE') {
      result = result.filter(r => (r.requestedTo || '').toLowerCase().includes('office_machine') || (r.requestedTo || '').toLowerCase().includes('office machine'));
    } else if (this.selectedOfficeFilter === 'COMPUTER') {
      result = result.filter(r => (r.requestedTo || '').toLowerCase().includes('computer'));
    }

    // PTEAM_LEADER: filter by POWER, ELECTRICAL, MECHANICAL or WELDING via requestedTo
    if (this.selectedPowerFilter === 'POWER') {
      result = result.filter(r => (r.requestedTo || '').toLowerCase().includes('power'));
    } else if (this.selectedPowerFilter === 'ELECTRICAL') {
      result = result.filter(r => (r.requestedTo || '').toLowerCase().includes('electrical'));
    } else if (this.selectedPowerFilter === 'MECHANICAL') {
      result = result.filter(r => (r.requestedTo || '').toLowerCase().includes('mechanical'));
    } else if (this.selectedPowerFilter === 'WELDING') {
      result = result.filter(r => (r.requestedTo || '').toLowerCase().includes('welding'));
    }

    if (this.searchValue.trim()) {
      const q = this.searchValue.toLowerCase();
      result = result.filter(r =>
        String(r.worksOrderNumber ?? '').includes(q) ||
        (r.serialNoOfEquip ?? '').toLowerCase().includes(q) ||
        (r.nomenclature ?? '').toLowerCase().includes(q) ||
        (r.maintainedBy ?? '').toLowerCase().includes(q)
      );
    }
    this.filteredRequests = result;
    this.applyPagination();
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.ceil(this.filteredRequests.length / this.pageSize); }
  previousPage(): void { if (this.currentPage > 1) { this.currentPage--; this.applyPagination(); } }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.applyPagination(); } }

  // ====== ACTIONS =======

  openDetails(item: any): void {
    this.viewingItem = item;
  }

  closeDetails(): void {
    this.viewingItem = null;
  }

  giveForClients(request: any): void {
    this.deliveryFormData = {
      worksOrderNumber: request.worksOrderNumber,
      serialNoOfEquip: request.serialNoOfEquip,
      givenTo: '',
      approval: '',
      recieverRemark: '',
      recievedDate: ''
    };
    this.showDeliveryForm = true;
  }

  qualify(request: any): void {
    if (!request || !request.worksOrderNumber) return;

    if (!confirm(`Are you sure you want to qualify Works Order: ${request.worksOrderNumber}?`))
      return;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/qualify/${request.worksOrderNumber}`;
    const body = { status: 'Maintenance Finished' };

    this.http.put(url, body, { responseType: 'text' }).subscribe(
      () => {
        alert(`Works Order ${request.worksOrderNumber} qualified successfully.`);
        this.fetchMaintenanceRequests();
      },
      (error) => {
        console.error('Error qualifying maintenance request:', error);
        alert('Failed to qualify the maintenance request.');
      }
    );
  }

  submitDeliveryForm(): void {
    if (!this.deliveryFormData.givenTo ||
        !this.deliveryFormData.approval ||
        !this.deliveryFormData.recievedDate) {
      this.formErrorMessage = 'Please fill all required fields.';
      return;
    }

    this.isFormLoading = true;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/deliver/${this.deliveryFormData.worksOrderNumber}`;
    const body = {
      GivenTo: this.deliveryFormData.givenTo,
      Approval: this.deliveryFormData.approval,
      RecieverRemark: this.deliveryFormData.recieverRemark,
      RecievedDate: this.deliveryFormData.recievedDate
    };

    this.http.put(url, body, { responseType: 'text' }).subscribe(
      () => {
        this.isFormLoading = false;
        this.showDeliveryForm = false;
        this.formErrorMessage = '';
        alert('Maintenance request delivered successfully.');
        this.fetchMaintenanceRequests();
      },
      (error) => {
        this.isFormLoading = false;
        this.formErrorMessage = 'Failed to deliver maintenance request.';
        console.error('Error delivering maintenance request:', error);
      }
    );
  }

  cancelDeliveryForm(): void {
    this.showDeliveryForm = false;
    this.deliveryFormData = {};
    this.formErrorMessage = '';
  }

  printDetails(): void {
    window.print();
  }

  downloadPdf(): void {
    if (!this.viewingItem) return;
    const r = this.viewingItem;

    const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const laborCost = (r.manHours || 0) * 250;
    const totalCost = (r.partsCost || 0) + laborCost;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow pop-ups to download PDF.'); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="UTF-8"/>
  <title>WO#${r.worksOrderNumber} — Maintenance Record</title>
  <style>
    @page { size: A4; margin: 10mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; font-size: 10pt; color: #000; }

    .header { text-align: center; margin-bottom: 8px; border-bottom: 2px double #000; padding-bottom: 6px; }
    .header .org { font-size: 11pt; font-weight: bold; line-height: 1.5; }
    .header .title { font-size: 13pt; font-weight: bold; margin-top: 4px; }
    .header .sub { font-size: 9.5pt; margin-top: 1px; }

    .wo-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 10pt; }
    .wo-row span { font-weight: bold; }

    table.info { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    table.info td { padding: 3px 8px; font-size: 9.5pt; vertical-align: top; border-bottom: 1px solid #ccc; }
    table.info tr:first-child td { border-top: 2px solid #000; }
    table.info tr:last-child  td { border-bottom: 2px solid #000; }
    table.info .label { font-weight: bold; width: 40%; }

    .note-box { background: #f9f9f9; border: 1px solid #ccc; border-radius: 3px;
                padding: 4px 8px; min-height: 22px; font-size: 9.5pt; margin-bottom: 6px; }
    .note-label { font-weight: bold; font-size: 9.5pt; margin-bottom: 2px; }

    .cost-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .cost-table th { background: #f0f0f0; padding: 4px 8px; text-align: left; border: 1px solid #ccc; font-size: 9.5pt; }
    .cost-table td { padding: 4px 8px; border: 1px solid #ccc; font-size: 9.5pt; }
    .cost-table .total td { font-weight: bold; background: #fafafa; }

    .sig-section-wrap { page-break-inside: avoid; break-inside: avoid; margin-top: 14px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .sig-block .role { font-size: 9pt; color: #444; margin-bottom: 28px; }
    .sig-block .line { border-bottom: 1.5px solid #000; margin-bottom: 4px; }
    .sig-block .name { font-size: 9pt; color: #555; }

    .footer { margin-top: 10px; text-align: center; font-size: 8pt; color: #666;
              border-top: 1px solid #ccc; padding-top: 5px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>

  <div class="header">
    <div class="org">
      በኢፌዲሪ መከላከያ ሚኒስቴር<br>
      በመገናኛና እንፎርሜሽን ዋና መምሪያ
    </div>
    <div class="title">የተጠጋኝ ንብረት መሸኛ</div>
    <div class="sub">Maintenance Register / የተመዘገቡ የሜንቴናንስ ዝርዝር</div>
  </div>

  <div class="wo-row">
    <div>Works Order No.: <span>#${r.worksOrderNumber}</span></div>
    <div>Status / ሁኔታ: <span>${r.status || '—'}</span></div>
  </div>

  <table class="info">
    <tr><td class="label">Maintenance Type / አይነት</td><td>${r.requestedTo || r.maintenanceType || '—'}</td>
        <td class="label">Nomenclature / ስም</td><td>${r.nomenclature || '—'}</td></tr>
    <tr><td class="label">Serial Number / ተ.ቁ</td><td>${r.serialNoOfEquip || '—'}</td>
        <td class="label">Model</td><td>${r.model || '—'}</td></tr>
    <tr><td class="label">Requested By / ጠያቂ</td><td>${r.requestedBy || '—'}</td>
        <td class="label">Maintained By / ጠጋኝ</td><td>${r.maintainedBy || '—'}</td></tr>
    <tr><td class="label">Date Received / የመጣበት</td><td>${fmt(r.dateWorkOrderReceived)}</td>
        <td class="label">Repair Start / ጥገና ጀምሮ</td><td>${fmt(r.repairStartDate)}</td></tr>
    <tr><td class="label">Repair Finish / ጥገና ጠናቅቆ</td><td>${fmt(r.repairFinishDate)}</td>
        <td class="label">Man Hours</td><td>${r.manHours || 0} hrs</td></tr>
    <tr><td class="label">Given To / የተቀበለው</td><td>${r.givenTo || '—'}</td>
        <td class="label">Approval / ያረጋገጠው</td><td>${r.approval || '—'}</td></tr>
    <tr><td class="label">Received Date / ቀን</td><td>${fmt(r.recievedDate)}</td>
        <td class="label">Receiver Remark</td><td>${r.recieverRemark || '—'}</td></tr>
  </table>

  <div class="note-label">Description / መግለጫ:</div>
  <div class="note-box">${r.briefDescriptionOfWork || '—'}</div>

  <div class="note-label">Solved Remark / አስተያየት:</div>
  <div class="note-box">${r.remark || '—'}</div>

  <table class="cost-table">
    <thead><tr><th>Cost Type</th><th>Amount (ETB)</th></tr></thead>
    <tbody>
      <tr><td>Labor Cost (${r.manHours || 0} hrs × 250)</td><td>${laborCost.toFixed(2)}</td></tr>
      <tr><td>Parts Cost</td><td>${(r.partsCost || 0).toFixed(2)}</td></tr>
      <tr class="total"><td>Total Cost / ጠቅላላ</td><td>${totalCost.toFixed(2)}</td></tr>
    </tbody>
  </table>

  <div class="sig-section-wrap">
    <div class="sig-grid">
      <div class="sig-block">
        <div class="role">Issued By / ያወጣው (Technician)</div>
        <div class="line"></div>
        <div class="name">Name / ስም: ${r.maintainedBy || '___________________'}</div>
      </div>
      <div class="sig-block">
        <div class="role">Received By / ተቀባዩ</div>
        <div class="line"></div>
        <div class="name">Name / ስም: ${r.givenTo || '___________________'}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Printed on ${new Date().toLocaleString('en-GB')} &nbsp;|&nbsp; የተሰራው ቀን: ${new Date().toLocaleString('en-GB')}
  </div>

</body>
</html>`);

    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }
}
