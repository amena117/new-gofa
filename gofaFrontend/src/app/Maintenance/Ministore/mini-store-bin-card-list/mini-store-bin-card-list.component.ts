import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatePipe } from '@angular/common';
import { NOTO_ETHIOPIC_BASE64 } from '../../../../assets/fonts/noto-ethiopic-base64';

@Component({
  selector: 'app-mini-store-bin-card-list',
  templateUrl: './mini-store-bin-card-list.component.html',
  styleUrls: ['./mini-store-bin-card-list.component.css'],
  providers: [DatePipe]
})
export class MiniStoreBinCardListComponent implements OnInit {
  miniStoreBinCards: any[] = [];
  filteredItems: any[] = [];
  serialNumbers: string[] = [];
  userRole: string = '';
  lowStockCount = 0;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Search
  searchTerm = '';
  searchBy = 'stockNumber';

  apiUrl = `${environment.apiBaseUrl}/api/MiniStoreBinCard`;

  constructor(
    private http: HttpClient,
    private router: Router,
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

  exportToExcel(): void {
    const data = this.filteredItems.map((item, index) => ({
      'No': index + 1,
      'Stock Number': item.stockNumber,
      'Description': item.description,
      'Location': item.location || '—',
      'Category': item.category || '—',
      'Balance': item.balance ?? 0,
      'Model': item.model || '—',
      'Date': this.datePipe.transform(item.date, 'yyyy-MM-dd') || '—',
      'Posted By': item.postedBy || '—'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    XLSX.writeFile(workbook, 'MiniStore_Bin_Cards.xlsx');
  }

  exportToPDF(): void {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
    this.registerEthiopicFont(doc);

    const head = [['No', 'Stock Number', 'Description', 'Location', 'Category', 'Balance', 'Model', 'Date', 'Posted By']];
    const data = this.filteredItems.map((item, index) => [
      index + 1,
      item.stockNumber,
      item.description,
      item.location || '—',
      item.category || '—',
      item.balance ?? 0,
      item.model || '—',
      this.datePipe.transform(item.date, 'yyyy-MM-dd') || '—',
      item.postedBy || '—'
    ]);

    this.pdfText(doc, 'MiniStore Bin Card List / የቢን ካርድ ዝርዝር', 14, 15, 12, 'bold');
    
    autoTable(doc, {
      head: head,
      body: data,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [3, 32, 60], font: 'NotoEthiopic' },
      bodyStyles: { font: 'NotoEthiopic' }
    });

    doc.save('MiniStore_Bin_Cards.pdf');
  }

  ngOnInit(): void {
    this.loadUserRole();
    this.fetchData();
  }

  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();
    this.userRole = role ? role.toUpperCase() : '';
  }

  fetchData(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.miniStoreBinCards = [...data].reverse(); // Newest first
        this.filteredItems = this.miniStoreBinCards;
        this.totalItems = this.filteredItems.length;
        this.lowStockCount = this.miniStoreBinCards.filter(i => (i.balance ?? 0) < 10).length;
      },
      error: (error) => {
        console.error('Error fetching MiniStore Bin Cards:', error);
      }
    });
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredItems = this.miniStoreBinCards;
    } else {
      this.filteredItems = this.miniStoreBinCards.filter(item => {
        const value = String(item[this.searchBy] || '').toLowerCase();
        return value.includes(term);
      });
    }
    this.currentPage = 1;
    this.totalItems = this.filteredItems.length;
  }

  get paginatedItems(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  updateItem(id: number): void {
    this.router.navigate([`maintenance/update/${id}`]);
  }

  deleteItem(id: number): void {
    if (!confirm('Are you sure you want to delete this item?')) return;

    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.miniStoreBinCards = this.miniStoreBinCards.filter(item => item.id !== id);
        this.onSearch(); // Reapply search and pagination
      },
      error: (error) => {
        console.error('Error deleting MiniStore item:', error);
      }
    });
  }

  

  viewSerialNumbers(id: number): void {
    const url = `${this.apiUrl}/${id}/serial-numbers`;
    this.http.get<string[]>(url).subscribe({
      next: (data) => this.serialNumbers = data,
      error: (error) => console.error('Error fetching serial numbers:', error)
    });
  }

  closeSerialNumbers(): void {
    this.serialNumbers = [];
  }

  isMinistore(): boolean {
    return this.userRole === 'MINISTORE';
  }
}
