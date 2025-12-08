import { Component, OnInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { AuthService } from '../services/auth.service';
import { TransactionEntryDto, Item } from '../model/item.model';
import { catchError, finalize, switchMap, map } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

interface TransactionDisplay {
  id: number;
  itemName: string;
  action: string;
  quantity: number;
  voucherNumber: string;
  recipient: string;
  registeredBy: string;
  date: string;
  role: string;
}

@Component({
  selector: 'app-item-transaction-history',
  templateUrl: './item-transaction-history.component.html',
  styleUrls: ['./item-transaction-history.component.css']
})
export class ItemTransactionHistoryComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;
  searchQuery: string = '';

  // Pagination
  pageSize = 10;
  currentPage = 0;

  // Sorting
  sortColumn: keyof TransactionDisplay = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Data
  allTransactions: TransactionDisplay[] = [];
  filteredTransactions: TransactionDisplay[] = [];
  pagedTransactions: TransactionDisplay[] = [];

  private userRole: string | null = null;
  private itemCache = new Map<number, Item>();

  constructor(private itemService: ItemService, private authService: AuthService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.userRole) {
      this.errorMessage = 'የተጠቃሚ ሚና አልተገኘም። እባክዎ ይግቡ።';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.itemService.getAllTransactionHistories().pipe(
      switchMap(transactions => {
        const receiveTransactions = transactions.filter(t => t.action.toUpperCase() === 'RECEIVE');
        if (receiveTransactions.length === 0) {
          return of([]);
        }
        const itemRequests = receiveTransactions.map(t => {
          if (this.itemCache.has(t.itemId)) {
            return of({ transaction: t, role: this.itemCache.get(t.itemId)!.role });
          }
          return this.itemService.getItem(t.itemId).pipe(
            map((item: Item) => {
              this.itemCache.set(t.itemId, item);
              return { transaction: t, role: item.role };
            }),
            catchError(() => of({ transaction: t, role: null }))
          );
        });
        return forkJoin(itemRequests);
      }),
      catchError(error => {
        this.errorMessage = 'የተቀበሉ ግብይቶችን መጫን አልተሳካም። እባክዎ እንደገና ይሞክሩ።';
        console.error('Error fetching receive transactions:', error);
        return of([]);
      }),
      finalize(() => this.isLoading = false)
    ).subscribe(results => {
      this.allTransactions = results
        .filter(result => result.role === this.userRole)
        .map(result => {
          const t = result.transaction;
          return {
            id: t.id,
            itemName: t.description || 'ያልታወቀ',
            action: 'RECEIVE',
            quantity: t.quantity,
            voucherNumber: t.voucherNumber || '',
            recipient: this.getRecipient(t),
            registeredBy: this.getRegisteredBy(t.details),
            date: t.date,
            role: result.role || 'ያልታወቀ'
          };
        });

      if (this.allTransactions.length === 0) {
        this.errorMessage = `ለሚና ${this.userRole} ምንም ተቀበሉ ግብይቶች አልተገኙም።`;
      }

      this.filteredTransactions = [...this.allTransactions];
      this.applyFilter();
    });
  }

  applyFilter(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredTransactions = [...this.allTransactions];
    } else {
      this.filteredTransactions = this.allTransactions.filter(t =>
        t.itemName.toLowerCase().includes(query) ||
        t.action.toLowerCase().includes(query) ||
        t.voucherNumber.toLowerCase().includes(query) ||
        t.recipient.toLowerCase().includes(query) ||
        t.registeredBy.toLowerCase().includes(query) ||
        this.formatEthiopianDate(t.date).toLowerCase().includes(query)
      );
    }
    this.sortTable(this.sortColumn);
    this.currentPage = 0;
  }

  sortTable(column: keyof TransactionDisplay): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const multiplier = this.sortDirection === 'asc' ? 1 : -1;

    this.filteredTransactions.sort((a, b) => {
      let valueA: any = a[column];
      let valueB: any = b[column];

      if (column === 'date') {
        valueA = this.convertToSortableDate(a.date);
        valueB = this.convertToSortableDate(b.date);
      } else {
        valueA = (valueA ?? '').toString().toLowerCase();
        valueB = (valueB ?? '').toString().toLowerCase();
      }

      if (valueA < valueB) return -1 * multiplier;
      if (valueA > valueB) return 1 * multiplier;
      return 0;
    });

    this.updatePagedTransactions();
  }

  updatePagedTransactions(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedTransactions = this.filteredTransactions.slice(start, end);
  }

  previousPage(event: Event): void {
    event.preventDefault();
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePagedTransactions();
    }
  }

  nextPage(event: Event): void {
    event.preventDefault();
    if (this.currentPage < this.getTotalPages() - 1) {
      this.currentPage++;
      this.updatePagedTransactions();
    }
  }

  goToPage(page: number, event: Event): void {
    event.preventDefault();
    this.currentPage = page;
    this.updatePagedTransactions();
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.pageSize);
  }

  getPages(): number[] {
    return Array.from({ length: this.getTotalPages() }, (_, i) => i);
  }

  // Ethiopian Date Formatting
  formatEthiopianDate(date: string | null): string {
    if (!date || date === 'Unknown Date') {
      return 'ያልታወቀ ቀን';
    }
    try {
      if (/[\u1200-\u137F]/.test(date)) {
        return date;
      }
      const [monthName, day, year] = date.split(/[\s,]+/).filter(part => part);
      const monthNumber = this.getEthiopianMonthNumber(monthName);
      const amharicMonth = this.getAmharicMonthName(monthNumber);
      return `${amharicMonth} ${day}, ${year}`;
    } catch (error) {
      console.error('Error formatting Ethiopian date:', error);
      return 'ያልታወቀ ቀን';
    }
  }

  private getEthiopianMonthNumber(monthName: string): number {
    const monthMap: { [key: string]: number } = {
      'Meskerem': 1, 'Tikimt': 2, 'Hidar': 3, 'Tahsas': 4, 'Tir': 5,
      'Yekatit': 6, 'Megabit': 7, 'Miazia': 8, 'Ginbot': 9, 'Sene': 10,
      'Hamle': 11, 'Nehase': 12, 'Pagume': 13
    };
    return monthMap[monthName] || 1;
  }

  private getAmharicMonthName(monthNumber: number): string {
    const amharicMonths = [
      'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
      'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
    ];
    return amharicMonths[monthNumber - 1] || 'መስከረም';
  }

  private convertToSortableDate(date: string | null): string {
    if (!date || date === 'Unknown Date') {
      return '0000-00-00';
    }
    try {
      if (/[\u1200-\u137F]/.test(date)) {
        const amharicMonthMap: { [key: string]: number } = {
          'መስከረም': 1, 'ጥቅምት': 2, 'ህዳር': 3, 'ታህሳስ': 4, 'ጥር': 5,
          'የካቲት': 6, 'መጋቢት': 7, 'ሚያዝያ': 8, 'ግንቦት': 9, 'ሰኔ': 10,
          'ሐምሌ': 11, 'ነሐሴ': 12, 'ጳጉሜ': 13
        };
        const [monthName, day, year] = date.split(/[\s,]+/).filter(part => part);
        const monthNumber = amharicMonthMap[monthName] || 1;
        return `${year}-${monthNumber.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        const [monthName, day, year] = date.split(/[\s,]+/).filter(part => part);
        const monthNumber = this.getEthiopianMonthNumber(monthName);
        return `${year}-${monthNumber.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (error) {
      console.error('Error converting date for sorting:', date, error);
      return '0000-00-00';
    }
  }

  getRecipient(transaction: TransactionEntryDto): string {
    if (!transaction.details) {
      console.warn(`No details for transaction ID ${transaction.id}`);
      return 'ያልታወቀ';
    }
    const parts = transaction.details.split(', ');
    for (const part of parts) {
      if (part.startsWith('Received From: ')) {
        return part.replace('Received From: ', 'ከ: ').trim();
      }
    }
    return 'ያልታወቀ';
  }

  getRegisteredBy(details: string): string {
    if (!details) return 'ያልታወቀ';
    const parts = details.split(', ');
    for (const part of parts) {
      if (part.startsWith('Registered By: ')) {
        return part.replace('Registered By: ', '').trim();
      }
    }
    return 'ያልታወቀ';
  }
}