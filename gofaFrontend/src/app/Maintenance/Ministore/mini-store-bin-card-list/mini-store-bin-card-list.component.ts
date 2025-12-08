import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mini-store-bin-card-list',
  templateUrl: './mini-store-bin-card-list.component.html',
  styleUrls: ['./mini-store-bin-card-list.component.css']
})
export class MiniStoreBinCardListComponent implements OnInit {
  miniStoreBinCards: any[] = [];
  filteredItems: any[] = [];
  serialNumbers: string[] = [];
  userRole: string = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalItems = 0;

  // Search
  searchTerm = '';
  searchBy = 'stockNumber';

  apiUrl = `${environment.apiBaseUrl}/api/MiniStoreBinCard`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

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
