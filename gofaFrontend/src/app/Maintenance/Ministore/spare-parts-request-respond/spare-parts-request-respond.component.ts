import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-spare-parts-request-respond',
  templateUrl: './spare-parts-request-respond.component.html',
  styleUrls: ['./spare-parts-request-respond.component.css']
})
export class SparePartsRequestRespondComponent implements OnInit {

  allRecords: any[] = [];
  filteredRecords: any[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  searchTerm = '';
  statusFilter = 'all';
  timeFilter = 'all';
  departmentFilter = 'all';

  // Derived list of available departments from loaded data
  availableDepartments: string[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 15;

  // Detail modal
  selectedRecord: any = null;

  private apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchHistory();
  }

  fetchHistory(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${this.apiBase}/api/SparePartsRequest/all`).subscribe({
      next: (data) => {
        // Show all records that have been processed (have an approval date or quantity approved)
        this.allRecords = data
          .filter(r => r.quantityApproved >= 1 || r.status === 'Issued to Technician' || r.status === 'Issued')
          .sort((a, b) => {
            const dateA = new Date(a.approvalDate || a.requestDate || 0).getTime();
            const dateB = new Date(b.approvalDate || b.requestDate || 0).getTime();
            return dateB - dateA;
          });

        // Build the unique sorted list of departments for the filter dropdown
        const depts = new Set<string>();
        this.allRecords.forEach(r => { if (r.department) depts.add(r.department); });
        this.availableDepartments = Array.from(depts).sort();

        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `Failed to load history. (${err.status})`;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.allRecords];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(r =>
        String(r.worksOrderNumber).includes(term) ||
        (r.stockNumber && r.stockNumber.toLowerCase().includes(term)) ||
        (r.requestedBy && r.requestedBy.toLowerCase().includes(term)) ||
        (r.model && r.model.toLowerCase().includes(term)) ||
        (r.serialNumber && r.serialNumber.toLowerCase().includes(term)) ||
        (r.department && r.department.toLowerCase().includes(term))
      );
    }

    if (this.statusFilter !== 'all') {
      result = result.filter(r => r.status === this.statusFilter);
    }

    if (this.departmentFilter !== 'all') {
      result = result.filter(r => r.department === this.departmentFilter);
    }

    if (this.timeFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (this.timeFilter) {
        case '1w':
          startDate.setDate(now.getDate() - 7);
          break;
        case '1m':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3m':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '12m':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      result = result.filter(r => {
        const recordDate = new Date(r.approvalDate || r.requestDate);
        return recordDate >= startDate;
      });
    }

    this.filteredRecords = result;
    this.currentPage = 1;
  }

  get pagedRecords(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRecords.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRecords.length / this.pageSize);
  }

  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  openDetail(record: any): void { this.selectedRecord = record; }
  closeDetail(): void { this.selectedRecord = null; }

  getTotalPartsCost(): number {
    return this.filteredRecords.reduce((sum, r) => sum + ((r.partCost || 0) * (r.quantityApproved ?? 1)), 0);
  }

  printReport(): void {
    window.print();
  }

  exportToExcel(): void {
    const reportData = this.filteredRecords.map((r, index) => ({
      '#': index + 1,
      'Works Order No': r.worksOrderNumber,
      'Stock Number': r.stockNumber,
      'Department': r.department || '—',
      'Model': r.model || '—',
      'Serial Number': r.serialNumber || '—',
      'Quantity Issued': r.quantityApproved,
      'Requested By': r.requestedBy || '—',
      'Approved By': r.approvedBy || '—',
      'Part Cost (ETB)': r.partCost || 0,
      'Labour Cost (ETB)': r.labourCost || 0,
      'Total Cost (ETB)': r.totalCost || 0,
      'Issue Date': r.approvalDate ? new Date(r.approvalDate).toLocaleDateString() : '—',
      'Reason': r.reason || '—',
      'Remark': r.remark || '—',
      'Status': r.status
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(reportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // #
      { wch: 15 }, // Works Order No
      { wch: 20 }, // Stock Number
      { wch: 18 }, // Department
      { wch: 20 }, // Model
      { wch: 20 }, // Serial Number
      { wch: 15 }, // Quantity Issued
      { wch: 25 }, // Requested By
      { wch: 25 }, // Approved By
      { wch: 15 }, // Part Cost
      { wch: 15 }, // Labour Cost
      { wch: 15 }, // Total Cost
      { wch: 15 }, // Issue Date
      { wch: 30 }, // Reason
      { wch: 30 }, // Remark
      { wch: 25 }  // Status
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Spare Parts History');

    const fileName = `Spare_Parts_Issuance_History_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}
