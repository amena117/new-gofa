// src/app/Mastercard/components/request-order-list/request-order-list.component.ts
import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../services/request.service';
import { RequestOrderForIssue } from '../../models/mastercard.model';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-request-order-list',
  templateUrl: './request-order-list.component.html',
  styleUrls: ['./request-order-list.component.css']
})
export class RequestOrderListComponent implements OnInit {
  requestOrders: RequestOrderForIssue[] = [];
  filteredOrders: RequestOrderForIssue[] = [];
  paginatedOrders: RequestOrderForIssue[] = [];

  searchQuery: string = '';
  selectedSort: string = 'id-asc';
  sortOptions: { value: string; viewValue: string }[] = [
    { value: 'id-asc', viewValue: 'Sort by ID (Asc)' },
    { value: 'id-desc', viewValue: 'Sort by ID (Desc)' },
    { value: 'date-asc', viewValue: 'Sort by Date (Asc)' },
    { value: 'date-desc', viewValue: 'Sort by Date (Desc)' },
    { value: 'voucherNo-asc', viewValue: 'Sort by Voucher No (Asc)' },
    { value: 'voucherNo-desc', viewValue: 'Sort by Voucher No (Desc)' }
  ];

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;

  private ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ',
    'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

  constructor(
    private requestService: RequestService,
    public authService: AuthService,

  ) {}

  ngOnInit(): void {
    this.loadRequestOrders();
  }

  loadRequestOrders(): void {
    const userRole = this.authService.getRole();
    const validStores = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];

    if (!userRole) {
      console.error('User role not found!');
      this.resetLists();
      return;
    }

    this.requestService.getRequestOrders().subscribe({
      next: (orders) => {
        // Normalize status to 'Pending' if missing
        const normalizedOrders = orders.map(order => ({
          ...order,
          status: order.status || 'Pending'
        }));

        if (userRole === 'PROPERTY_CONTROL') {
          this.requestOrders = [...normalizedOrders];
        } else if (validStores.includes(userRole)) {
          this.requestOrders = normalizedOrders.filter(order =>
            order.issuingStore?.trim().toUpperCase() === userRole.trim().toUpperCase()
          );
        } else {
          this.requestOrders = [];
        }

        this.filteredOrders = [...this.requestOrders];
        this.sortOrders();
        this.updatePagination();
      },
      error: (error) => {
        console.error('Error fetching request orders:', error);
        this.resetLists();
      }
    });
  }

  private resetLists(): void {
    this.requestOrders = [];
    this.filteredOrders = [];
    this.updatePagination();
  }

  // --- Ethiopian Date Conversion Methods ---
  formatDate(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return 'N/A';

    let dateObj: Date;
    try {
      if (dateInput instanceof Date) {
        dateObj = dateInput;
      } else if (typeof dateInput === 'string') {
        const trimmedInput = dateInput.trim();
        if (trimmedInput.startsWith('0001-01-01') || trimmedInput.startsWith('0000-12-31')) {
          return 'N/A';
        }
        dateObj = new Date(dateInput);
      } else {
        console.warn('Unexpected date input type for formatDate:', typeof dateInput, dateInput);
        return 'Invalid Date';
      }

      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid Date object created from input:', dateInput);
        return 'Invalid Date';
      }

      const gregorianDateString = dateObj.toLocaleDateString('en-GB');
      const ethiopianDateString = this.toEthiopianDate(dateObj);
      return `${ethiopianDateString} / ${gregorianDateString}`;
    } catch (error) {
      console.error('Error formatting date:', error, dateInput);
      return 'Invalid Date';
    }
  }

  private toEthiopianDate(date: Date): string {
    const REFERENCE_GREGORIAN = new Date(2024, 8, 11);
    const REFERENCE_ETH_YEAR = 2017;
    const diffInMs = date.getTime() - REFERENCE_GREGORIAN.getTime();
    let totalDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    let ethYear = REFERENCE_ETH_YEAR;

    if (totalDays >= 0) {
      while (totalDays >= (this.isLeapYearEth(ethYear) ? 366 : 365)) {
        totalDays -= this.isLeapYearEth(ethYear) ? 366 : 365;
        ethYear++;
      }
    } else {
      while (totalDays < 0) {
        ethYear--;
        totalDays += this.isLeapYearEth(ethYear) ? 366 : 365;
      }
    }

    const ethMonthIndex = Math.floor(totalDays / 30);
    const ethDay = (totalDays % 30) + 1;
    const validEthMonthIndex = ethMonthIndex >= 0 && ethMonthIndex < this.ethMonthNames.length ? ethMonthIndex : 0;
    return `${ethDay} ${this.ethMonthNames[validEthMonthIndex]} ${ethYear}`;
  }

  private isLeapYearEth(year: number): boolean {
    return year % 4 === 0;
  }
  // --- End Ethiopian Methods ---

  acceptOrder(id: number): void {
    this.requestService.acceptRequestOrder(id).subscribe({
      next: (updatedOrder) => {
        const index = this.requestOrders.findIndex(o => o.id === id);
        if (index !== -1) {
          this.requestOrders[index] = { ...updatedOrder, status: updatedOrder.status || 'Accepted' };
          this.onSearch();
        }
      },
      error: (err) => {
        console.error('Accept failed', err);
        alert('Failed to accept the request order.');
      }
    });
  }

  rejectOrder(id: number): void {
    this.requestService.rejectRequestOrder(id).subscribe({
      next: (updatedOrder) => {
        const index = this.requestOrders.findIndex(o => o.id === id);
        if (index !== -1) {
          this.requestOrders[index] = { ...updatedOrder, status: updatedOrder.status || 'Rejected' };
          this.onSearch();
        }
      },
      error: (err) => {
        console.error('Reject failed', err);
        alert('Failed to reject the request order.');
      }
    });
  }
  // In RequestOrderListComponent
issuingStores = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
selectedIssuingStore: string | null = null; // null = show all

onSearch(): void {
  const query = this.searchQuery.toLowerCase();

  this.filteredOrders = this.requestOrders.filter(order => {
    const matchesSearch =
      (order.voucherNo?.toLowerCase().includes(query) ?? false) ||
      (order.issueVoucherNo?.toLowerCase().includes(query) ?? false) ||
      (order.requestingUnit?.toLowerCase().includes(query) ?? false) ||
      (order.issuingStore?.toLowerCase().includes(query) ?? false) ||
      (order.makeAndModel?.toLowerCase().includes(query) ?? false) ||
      (order.category?.toLowerCase().includes(query) ?? false);

    // ✅ Treat empty string as "show all"
    const matchesStore =
      this.selectedIssuingStore === '' ||
      order.issuingStore === this.selectedIssuingStore;

    return matchesSearch && matchesStore;
  });

  this.currentPage = 1;
  this.sortOrders();
  this.updatePagination();
}
  onSortChange(): void {
    this.sortOrders();
    this.updatePagination();
  }

  sortOrders(): void {
    const [sortField, sortDirection] = this.selectedSort.split('-');
    this.filteredOrders.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') {
        comparison = (a.id ?? 0) - (b.id ?? 0);
      } else if (sortField === 'date') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortField === 'voucherNo') {
        const voucherA = a.voucherNo ?? '';
        const voucherB = b.voucherNo ?? '';
        comparison = voucherA.localeCompare(voucherB);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pageNumbers: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  }
}