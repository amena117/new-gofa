import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-ministore-report',
  templateUrl: './ministore-report.component.html',
  styleUrls: ['./ministore-report.component.css']
})
export class MinistoreReportComponent implements OnInit {
  reportData: any[] = [];
  isLoading = true;
  errorMessage = '';

  pageSize = 10;
  currentPage = 1;

  inventorySearch = '';
  inventoryStatusFilter = 'all';

  apiUrl = `${environment.apiBaseUrl}/api/MiniStoreBinCard/report`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchReport();
  }

  fetchReport(): void {
    this.isLoading = true;
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => { this.reportData = data; this.isLoading = false; },
      error: () => { this.errorMessage = 'Failed to load report.'; this.isLoading = false; }
    });
  }

  get filteredInventory(): any[] {
    let result = [...this.reportData];
    
    if (this.inventorySearch) {
      const q = this.inventorySearch.toLowerCase();
      result = result.filter(item => 
        item.stockNumber.toLowerCase().includes(q) ||
        (item.serialNumbers && item.serialNumbers.some((sn: any) => sn.serialNumber.toLowerCase().includes(q)))
      );
    }

    if (this.inventoryStatusFilter !== 'all') {
      if (this.inventoryStatusFilter === 'low') {
        result = result.filter(item => (item.balance ?? 0) < 10);
      } else if (this.inventoryStatusFilter === 'out') {
        result = result.filter(item => (item.balance ?? 0) === 0);
      }
    }

    return result;
  }

  get totalInventoryItems(): number {
    return this.reportData.length;
  }

  get lowStockCount(): number {
    return this.reportData.filter(item => (item.balance ?? 0) < 10 && (item.balance ?? 0) > 0).length;
  }

  get outOfStockCount(): number {
    return this.reportData.filter(item => (item.balance ?? 0) === 0).length;
  }

  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredInventory.slice().reverse().slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredInventory.length / this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  exportInventoryExcel(): void {
    const exportData = this.reportData.map(item => ({
      'Stock Number': item.stockNumber,
      'Balance': item.balance,
      'Total Serials': item.serialNumbers?.length || 0,
      'Available': item.serialNumbers?.filter((sn:any) => sn.status === 'Available in stock').length || 0,
      'Issued': item.serialNumbers?.filter((sn:any) => sn.status !== 'Available in stock').length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `Ministore_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
