import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { Letter } from '../../Models/letter.model';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatePipe } from '@angular/common';
import { NOTO_ETHIOPIC_BASE64 } from '../../../../assets/fonts/noto-ethiopic-base64';

@Component({
  selector: 'app-letter',
  templateUrl: './letter.component.html',
  styleUrls: ['./letter.component.css'],
  providers: [DatePipe]
})
export class LetterComponent implements OnInit {
  letters: Letter[] = [];
  filteredLetters: Letter[] = [];
  loading = false;
  error: string | null = null;

  // Filters
  searchTerm = '';
  statusFilter = '';
  dateFilter = 'ALL';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Expose Math to template
  protected readonly Math = Math;

  constructor(
    private maintenanceService: MaintenanceRequestService,
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
    const data = this.filteredLetters.map((letter, index) => ({
      'No': index + 1,
      'Letter ID': letter.letterId,
      'From': letter.from,
      'Reason': letter.recommendBy,
      'Status': letter.status,
      'Created Date': this.datePipe.transform(letter.createdDate, 'MMM d, yyyy') || '—'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = { Sheets: { 'Letters': worksheet }, SheetNames: ['Letters'] };
    XLSX.writeFile(workbook, 'Maintenance_Letters.xlsx');
  }

  exportToPDF(): void {
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4
    this.registerEthiopicFont(doc);

    const head = [['No', 'Letter ID', 'From', 'Reason', 'Status', 'Date']];
    const data = this.filteredLetters.map((letter, index) => [
      index + 1,
      `#${letter.letterId}`,
      letter.from,
      letter.recommendBy,
      letter.status,
      this.datePipe.transform(letter.createdDate, 'MMM d, yyyy') || '—'
    ]);

    this.pdfText(doc, 'Maintenance Letters / የሜንቴናንስ ደብዳቤዎች', 14, 15, 12, 'bold');
    
    autoTable(doc, {
      head: head,
      body: data,
      startY: 20,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [3, 32, 60], font: 'NotoEthiopic' },
      bodyStyles: { font: 'NotoEthiopic' }
    });

    doc.save('Maintenance_Letters.pdf');
  }

  ngOnInit(): void {
    this.loadLetters();
  }

  /** Load all letters */
  loadLetters(): void {
    this.loading = true;
    this.error = null;

    this.maintenanceService.getLetters().subscribe({
      next: (data) => {
        // Sort by letterId descending (or createdDate if preferred)
        this.letters = data.sort((a, b) => b.letterId - a.letterId);
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching letters:', err);
        this.error = 'Failed to load letters.';
        this.loading = false;
      }
    });
  }

  /** Filter logic */
  applyFilters(): void {
    let filtered = [...this.letters];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.from.toLowerCase().includes(term) || 
        l.recommendBy.toLowerCase().includes(term) ||
        l.letterId.toString().includes(term)
      );
    }

    if (this.statusFilter) {
      const filter = this.statusFilter.toLowerCase();
      filtered = filtered.filter(l => l.status?.toLowerCase() === filter);
    }

    if (this.dateFilter !== 'ALL') {
      const now = new Date();
      let filterDate = new Date();
      
      switch(this.dateFilter) {
        case '1WEEK': filterDate.setDate(now.getDate() - 7); break;
        case '1MONTH': filterDate.setMonth(now.getMonth() - 1); break;
        case '3MONTHS': filterDate.setMonth(now.getMonth() - 3); break;
        case '6MONTHS': filterDate.setMonth(now.getMonth() - 6); break;
        case '9MONTHS': filterDate.setMonth(now.getMonth() - 9); break;
        case '12MONTHS': filterDate.setFullYear(now.getFullYear() - 1); break;
      }

      // Set to start of the day (00:00:00) for a fairer filter
      filterDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter(l => {
        const letterDate = new Date(l.createdDate);
        return letterDate >= filterDate;
      });
    }

    this.filteredLetters = filtered;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  get totalLetters(): number {
    return this.letters.length;
  }

  get pendingLettersCount(): number {
    return this.letters.filter(l => l.status?.toLowerCase() === 'initial').length;
  }

  get approvedLettersCount(): number {
    return this.letters.filter(l => l.status?.toLowerCase() === 'approved').length;
  }

  /** Reset filters */
  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.dateFilter = 'ALL';
    this.applyFilters();
  }

  /** Get paged data */
  get pagedLetters(): Letter[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredLetters.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLetters.length / this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'initial')  return 'badge bg-warning';
    if (s === 'approved') return 'badge bg-success';
    if (s === 'rejected') return 'badge bg-danger';
    return 'badge bg-secondary';
  }

  /** Delete a letter */
  deleteLetter(id: number): void {
    if (!confirm('Are you sure you want to delete this letter?')) return;

    this.maintenanceService.deleteLetter(id).subscribe({
      next: () => {
        this.letters = this.letters.filter(l => l.letterId !== id);
      },
      error: (err) => {
        console.error('Error deleting letter:', err);
        this.error = 'Failed to delete letter.';
      }
    });
  }
}
