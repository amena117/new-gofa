import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';

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
  styleUrls: ['./view-serial.component.css']
})
export class ViewSerialComponent implements OnInit {

  stockNumbers: number[] = [];
  selectedStockNumber: number | null = null;
  model: string = '';
  serials: SerialDetailDto[] = [];
  paginatedSerials: SerialDetailDto[] = [];
  message: string = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchStockNumbers();
  }

  fetchStockNumbers(): void {
    const url = `${environment.apiBaseUrl}/api/MiniStoreBinCard/all-stock-numbers`;
    this.http.get<number[]>(url).subscribe({
      next: (data) => this.stockNumbers = data,
      error: (err) => {
        console.error('Error loading stock numbers:', err);
        this.message = 'Failed to load stock numbers.';
      }
    });
  }

  fetchSerialDetails(stockNumber: number): void {
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
      }
    });
  }

  onStockNumberSelect(stockNumber: number | null): void {
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
