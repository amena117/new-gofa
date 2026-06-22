import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatePipe } from '@angular/common';
import { NOTO_ETHIOPIC_BASE64 } from '../../../../assets/fonts/noto-ethiopic-base64';

interface SerialDetailDto {
  serialNumber: string;
  inDate: string | null;
  status: string;
}

interface MiniStoreSerialDetailDto {
  stockNumber: number;
  model: string;
  serials: SerialDetailDto[];
}

@Component({
  selector: 'app-view-serial',
  templateUrl: './view-serial.component.html',
  styleUrls: ['./view-serial.component.css'],
  providers: [DatePipe]
})
export class ViewSerialComponent implements OnInit {

  stockNumbers: any[] = []; // Changed to any[] to handle potential string/number mix or objects
  filteredStockNumbers: any[] = [];
  stockSearchTerm: string = '';
  
  selectedStockNumber: any | null = null;
  model: string = '';
  serials: SerialDetailDto[] = [];
  paginatedSerials: SerialDetailDto[] = [];
  message: string = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;

  constructor(private http: HttpClient, private datePipe: DatePipe) {}

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

  exportToExcel(): void {
    if (!this.selectedStockNumber) return;

    const data = this.serials.map((s, i) => ({
      '#': i + 1,
      'Stock Number': this.selectedStockNumber,
      'Model': this.model,
      'Serial Number': s.serialNumber,
      'In Date': this.datePipe.transform(s.inDate, 'dd/MM/yyyy') || 'N/A',
      'Status': s.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Serials');
    XLSX.writeFile(workbook, `Serial_Details_${this.selectedStockNumber}.xlsx`);
  }

  exportToPDF(): void {
    if (!this.selectedStockNumber) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    this.registerEthiopicFont(doc);
    
    // Header
    this.pdfText(doc, 'በኢፌዲሪ መከላከያ ሚኒስቴር በመገናኛና እንፎርሜሽን ዋና መምሪያ', 105, 15, 10, 'normal', [30, 60, 114], 'center');
    this.pdfText(doc, 'Serial Number Details / ስሪያል ቁጥር ዝርዝሮች', 105, 22, 14, 'bold', [30, 60, 114], 'center');

    // Summary Info
    this.pdfText(doc, `Stock Number / የስቶክ ቁጥር: ${this.selectedStockNumber}`, 14, 35, 11);
    this.pdfText(doc, `Model / ሞዴል: ${this.model || 'N/A'}`, 14, 42, 11);
    this.pdfText(doc, `Total Serials / ጠቅላላ ብዛት: ${this.serials.length}`, 14, 49, 11);

    // Table
    const head = [['#', 'Serial Number', 'In Date', 'Status']];
    const body = this.serials.map((s, i) => [
      i + 1,
      s.serialNumber,
      this.datePipe.transform(s.inDate, 'dd/MM/yyyy') || 'N/A',
      s.status
    ]);

    autoTable(doc, {
      head: head,
      body: body,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [30, 60, 114], textColor: 255, font: 'NotoEthiopic' },
      bodyStyles: { font: 'NotoEthiopic' },
      styles: { fontSize: 9 }
    });

    doc.save(`Serial_Details_${this.selectedStockNumber}.pdf`);
  }

  ngOnInit(): void {
    this.fetchStockNumbers();
  }

  fetchStockNumbers(): void {
    const url = `${environment.apiBaseUrl}/api/MiniStoreBinCard/all-stock-numbers`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.stockNumbers = data;
        this.filteredStockNumbers = data;
      },
      error: (err) => {
        console.error('Error loading stock numbers:', err);
        this.message = 'Failed to load stock numbers.';
      }
    });
  }

  filterStockNumbers(): void {
    const term = this.stockSearchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredStockNumbers = this.stockNumbers;
    } else {
      this.filteredStockNumbers = this.stockNumbers.filter(s => 
        String(s).toLowerCase().includes(term)
      );
    }
  }

  selectStock(stock: any): void {
    this.stockSearchTerm = String(stock);
    this.fetchSerialDetails(stock);
    this.filteredStockNumbers = []; // Hide list after selection
  }

  fetchSerialDetails(stockNumber: any): void {
    const url = `${environment.apiBaseUrl}/api/MiniStoreBinCard/${stockNumber}/serials-detailed`;
    this.http.get<MiniStoreSerialDetailDto>(url).subscribe({
      next: (data) => {
        this.selectedStockNumber = stockNumber;
        this.model = data.model;

        // Normalize serials and reverse to show newest first
        this.serials = data.serials.map(s => ({
          serialNumber: s.serialNumber,
          inDate: s.inDate ?? 'N/A',
          status: s.status || 'N/A'
        })).reverse();

        this.currentPage = 1;
        this.updatePagination();
      },
      error: (err) => {
        console.error('Error loading serial details:', err);
        this.message = 'Failed to load serial details.';
        this.serials = [];
        this.updatePagination();
      }
    });
  }

  onStockNumberSelect(stockNumber: any | null): void {
  if (stockNumber !== null) {
    this.fetchSerialDetails(stockNumber);
  }
}


  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedSerials = this.serials.slice(start, end);
  }

  totalPages(): number {
    return Math.ceil(this.serials.length / this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }
}
