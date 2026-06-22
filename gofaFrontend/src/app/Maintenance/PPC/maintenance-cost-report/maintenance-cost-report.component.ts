import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NOTO_ETHIOPIC_BASE64 } from '../../../../assets/fonts/noto-ethiopic-base64';

@Component({
  selector: 'app-maintenance-cost-report',
  templateUrl: './maintenance-cost-report.component.html',
  styleUrls: ['./maintenance-cost-report.component.css'],
  providers: [DatePipe]
})
export class MaintenanceCostReportComponent implements OnInit {
  maintenanceRequests: any[] = [];
  filteredRequests: any[] = [];
  isLoading = true;
  errorMessage = '';
  userRole: string = '';

  // Filters
  searchTerm = '';
  selectedMaintenanceType = '';
  selectedDateFilter = 'ALL';
  selectedSubUnitFilter = ''; // New filter for team leaders sub-units

  maintenanceTypes = ['POWER', 'RADIO_MAINTENANCE', 'OFFICE_MACHINE'];

  constructor(
    private http: HttpClient, 
    private datePipe: DatePipe,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.toUpperCase() || '';
    this.fetchData();
  }

  isManager(): boolean {
    return ['MAINTENANCE_LEADER', 'PPC', 'SUPER_ADMIN', 'MAINTENANCE_ADMIN', 'MAINTENANCE_REPORTING'].includes(this.userRole);
  }

  fetchData(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`).subscribe({
      next: (data) => {
        this.maintenanceRequests = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load maintenance data.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  applyFilters(): void {
    // 1. Initial status filtering (Do Out or Finished)
    let temp = this.maintenanceRequests.filter(r => 
      r.status === 'Maintenance Finished' || 
      r.status === 'Client Received' || 
      r.status === 'Do Out'
    );

    // 2. Role-based restriction for Team Leaders
    if (!this.isManager()) {
      if (this.userRole === 'PTEAM_LEADER') {
        temp = temp.filter(r => r.maintenanceType === 'POWER');
      } else if (this.userRole === 'OTEAM_LEADER') {
        temp = temp.filter(r => 
          r.maintenanceType === 'OFFICE_MACHINE' || 
          r.maintenanceType === 'COMPUTER_MAINTENANCE'
        );
      } else if (['RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER'].includes(this.userRole)) {
        temp = temp.filter(r => 
          r.maintenanceType === 'RADIO_MAINTENANCE' || 
          r.maintenanceType === 'VHF_RADIO' || 
          r.maintenanceType === 'HF_RADIO'
        );
      }

      // Apply sub-unit filter if selected
      if (this.selectedSubUnitFilter) {
        temp = temp.filter(r => r.requestedTo === this.selectedSubUnitFilter);
      }
    }

    // 3. Search
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      temp = temp.filter(r => 
        r.worksOrderNumber?.toString().includes(q) ||
        r.nomenclature?.toLowerCase().includes(q) ||
        r.serialNoOfEquip?.toLowerCase().includes(q)
      );
    }

    // 4. Maintenance Type (Manager only)
    if (this.isManager() && this.selectedMaintenanceType) {
      const type = this.selectedMaintenanceType;
      temp = temp.filter(r => {
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

    // 5. Date Filter
    if (this.selectedDateFilter !== 'ALL') {
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
      temp = temp.filter(r => new Date(r.dateWorkOrderReceived) >= filterDate);
    }

    this.filteredRequests = temp;
  }

  // Summary stats
  get totalPartsCost(): number {
    return this.filteredRequests.reduce((sum, r) => sum + (r.partsCost || 0), 0);
  }

  get totalLaborCost(): number {
    return this.filteredRequests.reduce((sum, r) => sum + (r.laborCost || 0), 0);
  }

  get grandTotalCost(): number {
    return this.totalPartsCost + this.totalLaborCost;
  }

  // Export
  exportToExcel(): void {
    const data = this.filteredRequests.map(r => ({
      'Order #': r.worksOrderNumber,
      'Item': r.nomenclature,
      'Serial': r.serialNoOfEquip,
      'Type': r.maintenanceType,
      'Status': r.status,
      'Parts Cost': r.partsCost || 0,
      'Labor Cost': r.laborCost || 0,
      'Total Cost': r.totalCost || 0,
      'Date': this.datePipe.transform(r.dateWorkOrderReceived, 'yyyy-MM-dd')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MaintenanceCosts');
    XLSX.writeFile(wb, `Maintenance_Cost_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private registerEthiopicFont(doc: jsPDF): void {
    doc.addFileToVFS('NotoSerifEthiopic.ttf', NOTO_ETHIOPIC_BASE64);
    doc.addFont('NotoSerifEthiopic.ttf', 'NotoEthiopic', 'normal');
    doc.addFont('NotoSerifEthiopic.ttf', 'NotoEthiopic', 'bold');
  }

  exportToPDF(): void {
    const doc = new jsPDF('l', 'mm', 'a4');
    this.registerEthiopicFont(doc);

    doc.setFont('NotoEthiopic', 'normal');
    doc.text('በኢፌዲሪ መከላከያ ሚኒስቴር በመገናኛና እንፎርሜሽን ዋና መምሪያ', 148, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Maintenance Cost Report / የጥገና ወጪ ሪፖርት', 148, 22, { align: 'center' });

    const head = [['Order #', 'Item', 'Type', 'Status', 'Parts Cost', 'Labor Cost', 'Total Cost', 'Date']];
    const body = this.filteredRequests.map(r => [
      r.worksOrderNumber,
      r.nomenclature || 'N/A',
      r.maintenanceType || 'N/A',
      r.status || 'N/A',
      (r.partsCost || 0).toLocaleString(),
      (r.laborCost || 0).toLocaleString(),
      (r.totalCost || 0).toLocaleString(),
      this.datePipe.transform(r.dateWorkOrderReceived, 'yyyy-MM-dd')
    ]);

    autoTable(doc, {
      head: head,
      body: body,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [30, 60, 114], font: 'NotoEthiopic' },
      bodyStyles: { font: 'NotoEthiopic' }
    });

    doc.save(`Maintenance_Cost_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}
