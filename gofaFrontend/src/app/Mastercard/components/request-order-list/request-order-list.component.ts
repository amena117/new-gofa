// src/app/Mastercard/components/request-order-list/request-order-list.component.ts
import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../services/request.service';
import { RequestOrderForIssue } from '../../models/mastercard.model';

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
  // Removed Math: any; // Not needed, Math is global
  // Removed totalItems: any; // Not used

  // --- Add properties for Ethiopian date handling ---
  private ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ',
    'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];
  // --- End of addition ---

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    this.loadRequestOrders();
  }

  loadRequestOrders(): void {
    this.requestService.getRequestOrders().subscribe({
      next: (orders) => {
        this.requestOrders = orders;
        this.filteredOrders = [...this.requestOrders];
        this.sortOrders();
        this.updatePagination();
      },
      error: (error) => {
        console.error('Error fetching request orders:', error);
        // TODO: Handle error (e.g., show message to user)
      }
    });
  }

  // --- Add Ethiopian Date Conversion Methods ---
  /**
   * Formats a date string or Date object into both Ethiopian and Gregorian date strings.
   * @param dateInput The date input (string, Date object, undefined, or null).
   * @returns A string containing "Ethiopian Date / Gregorian Date" or 'N/A'.
   */
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

      // Format Gregorian date (using locale 'en-GB' for DD/MM/YYYY format)
      const gregorianDateString = dateObj.toLocaleDateString('en-GB'); // e.g., "18/10/2023"

      // Convert to Ethiopian date format
      const ethiopianDateString = this.toEthiopianDate(dateObj);

      // Combine both formats
      return `${ethiopianDateString} / ${gregorianDateString}`;

    } catch (error) {
      console.error('Error formatting date:', error, dateInput);
      return 'Invalid Date';
    }
  }

  /**
   * Converts a Gregorian Date object to an Ethiopian date string.
   * @param date The Gregorian Date object.
   * @returns The formatted Ethiopian date string (e.g., "18 ጥቅምት 2015").
   */
  private toEthiopianDate(date: Date): string {
    // Reference: Sept 11, 2024 Gregorian = Ethiop. Meskerem 1, 2017
    const REFERENCE_GREGORIAN = new Date(2024, 8, 11); // Month is 0-based (September = 8)
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

    const ethMonthIndex = Math.floor(totalDays / 30); // 0-based index
    const ethDay = (totalDays % 30) + 1; // 1-based day

    const validEthMonthIndex = ethMonthIndex >= 0 && ethMonthIndex < this.ethMonthNames.length ? ethMonthIndex : 0;

    return `${ethDay} ${this.ethMonthNames[validEthMonthIndex]} ${ethYear}`;
  }

  /**
   * Checks if an Ethiopian year is a leap year.
   * @param year The Ethiopian year.
   * @returns True if it's a leap year, false otherwise.
   */
  private isLeapYearEth(year: number): boolean {
    return year % 4 === 0;
  }
  // --- End of Ethiopian Date Conversion Methods ---

  onSearch(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredOrders = this.requestOrders.filter(order =>
      (order.voucherNo?.toLowerCase().includes(query) ?? false) ||
      (order.issueVoucherNo?.toLowerCase().includes(query) ?? false) ||
      (order.requestingUnit?.toLowerCase().includes(query) ?? false) ||
      (order.issuingStore?.toLowerCase().includes(query) ?? false) ||
      (order.makeAndModel?.toLowerCase().includes(query) ?? false) ||
      (order.category?.toLowerCase().includes(query) ?? false)
      // Consider searching within dates if needed, might require converting date to string first
    );
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
        const idA = a.id ?? 0;
        const idB = b.id ?? 0;
        comparison = idA - idB; // Simplified numerical comparison
      } else if (sortField === 'date') {
        // Handle potential null/undefined dates
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortField === 'voucherNo') {
        const voucherA = a.voucherNo ?? '';
        const voucherB = b.voucherNo ?? '';
        comparison = voucherA.localeCompare(voucherB);
      }
      // Add sorting for other fields if needed (makeAndModel, category, etc.)
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