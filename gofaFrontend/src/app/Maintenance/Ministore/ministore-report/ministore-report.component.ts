import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';

@Component({
  selector: 'app-ministore-report',
  templateUrl: './ministore-report.component.html',
  styleUrls: ['./ministore-report.component.css']
})
export class MinistoreReportComponent implements OnInit {
  reportData: any[] = [];
  isLoading = true;
  errorMessage = '';

  // Pagination
  pageSize = 10;
  currentPage = 1;

  apiUrl = `${environment.apiBaseUrl}/api/MiniStoreBinCard/report`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchReport();
  }

  // Fetch report data from API
  fetchReport(): void {
    this.isLoading = true;
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching MiniStore report:', error);
        this.errorMessage = 'Failed to load MiniStore report.';
        this.isLoading = false;
      }
    });
  }

  // Paginated data with newest-first
  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.reportData
      .slice()
      .reverse() // newest first
      .slice(start, end);
  }

  // Total pages for pagination
  get totalPages(): number {
    return Math.ceil(this.reportData.length / this.pageSize);
  }

  // Navigate pages
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
}
