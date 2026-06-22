import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { AuthService } from '../../../services/auth.service';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatePipe } from '@angular/common';
import { NOTO_ETHIOPIC_BASE64 } from '../../../../assets/fonts/noto-ethiopic-base64';

@Component({
  selector: 'app-do-out',
  templateUrl: './do-out.component.html',
  styleUrl: './do-out.component.css',
  providers: [DatePipe]
})
export class DoOutComponent implements OnInit {
  doOutRequests: any[] = [];
  filteredRequests: any[] = [];
  userRole: string | null = null;
  isLoading: boolean = false;
  searchTerm: string = '';
  selectedRoleFilter: string = 'ALL';
  selectedDateFilter: string = 'ALL';
  selectedSubUnitFilter: string = 'ALL'; // New filter for sub-units
  today: Date = new Date();

  constructor(
    private maintenanceService: MaintenanceRequestService,
    private authService: AuthService,
    private datePipe: DatePipe
  ) {}

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
    color: [number, number, number] = [3, 32, 60],
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

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.toUpperCase() ?? null;
    this.loadDoOutRequests();
  }

  isManager(): boolean {
    return this.userRole === 'MAINTENANCE_LEADER' || this.userRole === 'PPC' || this.userRole === 'SUPER_ADMIN' || this.userRole === 'MAINTENANCE_ADMIN';
  }

  loadDoOutRequests(): void {
    this.isLoading = true;
    this.maintenanceService.getDoOutRequests().subscribe({
      next: (data) => {
        // Sort by date (recent to old) - Using repairFinishDate if available, otherwise dateWorkOrderReceived
        this.doOutRequests = data.sort((a, b) => {
          const dateA = new Date(a.repairFinishDate || a.dateWorkOrderReceived || 0).getTime();
          const dateB = new Date(b.repairFinishDate || b.dateWorkOrderReceived || 0).getTime();
          return dateB - dateA;
        });
        this.applySearch();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading do out requests:', err);
        this.isLoading = false;
      }
    });
  }

  onSearchChange(): void {
    this.applySearch();
  }

  onFilterChange(): void {
    this.applySearch();
  }

  applySearch(): void {
    let requests = [...this.doOutRequests];

    // 1. Role-based filtering for Non-Managers
    if (!this.isManager()) {
      const roleMap: { [key: string]: string[] } = {
        'POWER': ['POWER'],
        'POWER_MAINTENANCE': ['POWER'],
        'ELECTRICAL_MAINTENANCE': ['POWER'],
        'MECHANICAL_MAINTENANCE': ['POWER'],
        'WELDING_MAINTENANCE': ['POWER'],
        'PTEAM_LEADER': ['POWER'],
        'OFFICE_MACHINE': ['OFFICE_MACHINE'],
        'OFFICE_MACHINE_MAINTENANCE': ['OFFICE_MACHINE'],
        'IT_MAINTENANCE': ['OFFICE_MACHINE'],
        'COMPUTER_MAINTENANCE': ['OFFICE_MACHINE', 'COMPUTER_MAINTENANCE'],
        'OTEAM_LEADER': ['OFFICE_MACHINE', 'COMPUTER_MAINTENANCE'],
        'RADIO_MAINTENANCE': ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
        'RTEAM_LEADER': ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
        'VHF_RADIO': ['VHF_RADIO', 'RADIO_MAINTENANCE'],
        'VHF_MAINTENANCE': ['VHF_RADIO', 'RADIO_MAINTENANCE'],
        'VTEAM_LEADER': ['VHF_RADIO', 'RADIO_MAINTENANCE'],
        'HF_RADIO': ['HF_RADIO', 'RADIO_MAINTENANCE'],
        'HF_MAINTENANCE': ['HF_RADIO', 'RADIO_MAINTENANCE'],
        'HTEAM_LEADER': ['HF_RADIO', 'RADIO_MAINTENANCE']
      };
      const targetTypes = roleMap[this.userRole!] || [];
      requests = requests.filter(req => {
        const mType = req.maintenanceType?.toUpperCase().trim();
        const sStage = req.statusStage?.toUpperCase().trim();
        return targetTypes.some(type => 
          mType === type.toUpperCase() || sStage === type.toUpperCase()
        );
      });

      // Sub-unit filtering for team leaders
      if (this.selectedSubUnitFilter !== 'ALL') {
        requests = requests.filter(req => req.requestedTo === this.selectedSubUnitFilter);
      }
    } else {
      // 2. Role filtering for Managers
      if (this.selectedRoleFilter !== 'ALL') {
        requests = requests.filter(req => {
          const mType = req.maintenanceType?.toUpperCase().trim();
          if (this.selectedRoleFilter === 'RADIO') {
            return ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'].includes(mType);
          }
          return mType === this.selectedRoleFilter;
        });
      }
    }

    // 3. Date filtering
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

      requests = requests.filter(req => {
        const reqDate = new Date(req.repairFinishDate || req.dateWorkOrderReceived);
        return reqDate >= filterDate;
      });
    }

    // 4. Search term filtering
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      requests = requests.filter(req => 
        req.worksOrderNumber?.toString().toLowerCase().includes(term) ||
        req.nomenclature?.toLowerCase().includes(term) ||
        req.serialNoOfEquip?.toLowerCase().includes(term) ||
        req.model?.toLowerCase().includes(term) ||
        req.requestedBy?.toLowerCase().includes(term) ||
        req.maintainedBy?.toLowerCase().includes(term)
      );
    }

    this.filteredRequests = requests;
  }

  downloadExcel(): void {
    const exportData = this.filteredRequests.map(req => ({
      'Works Order #': req.worksOrderNumber,
      'Category Type': req.nomenclature || 'N/A',
      'Serial No': req.serialNoOfEquip || 'N/A',
      'Model': req.model || 'N/A',
      'Maintenance Type': req.maintenanceType || 'N/A',
      'Requested By': req.requestedBy || 'N/A',
      'Do Out By': req.maintainedBy || 'N/A',
      'Status': req.status,
      'Requested Date': req.dateWorkOrderReceived ? new Date(req.dateWorkOrderReceived).toLocaleDateString() : 'N/A',
      'Do Out Date': req.repairFinishDate ? new Date(req.repairFinishDate).toLocaleDateString() : 'N/A'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = { Sheets: { 'DoOutList': worksheet }, SheetNames: ['DoOutList'] };
    XLSX.writeFile(workbook, `DoOutList_${new Date().toLocaleDateString()}.xlsx`);
  }

  downloadPDF(): void {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit
    this.registerEthiopicFont(doc);

    // Header
    this.pdfText(doc, 'በኢፌዲሪ መከላከያ ሚኒስቴር በመገናኛና እንፎርሜሽን ዋና መምሪያ', 148, 15, 10, 'normal', [30, 60, 114], 'center');
    this.pdfText(doc, 'Do Out List / ጠጋኝ ንብረት የ Do Out ዝርዝር', 148, 22, 14, 'bold', [30, 60, 114], 'center');

    // Table
    const head = [['Order #', 'Category', 'Serial No', 'Model', 'Maint. Type', 'Requested By', 'Status', 'Do Out Date']];
    const body = this.filteredRequests.map(req => [
      req.worksOrderNumber,
      req.nomenclature || 'N/A',
      req.serialNoOfEquip || 'N/A',
      req.model || 'N/A',
      req.maintenanceType || 'N/A',
      req.requestedBy || 'N/A',
      req.status,
      this.datePipe.transform(req.repairFinishDate, 'MMM d, y') || 'N/A'
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

    doc.save(`DoOut_Report_${new Date().toLocaleDateString()}.pdf`);
  }
}
