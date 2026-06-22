import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';
import { ReportEntry } from '../../model/item.model';
import { catchError, finalize } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-transaction-report',
  templateUrl: './transaction-report.component.html',
  styleUrls: ['./transaction-report.component.css']
})
export class TransactionReportComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage: string | null = null;
  searchQuery: string = '';
  pageSize = 5;
  currentPage = 1;
  totalCount = 0;
  sortColumn: keyof ReportEntry = 'ethiopianDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  pagedTransactions: ReportEntry[] = [];
  filteredTransactions: ReportEntry[] = [];
  groupedByVoucher: { voucherNumber: string; date: string; items: ReportEntry[]; totalValue: number; totalQuantity: number; hasVoucher: boolean }[] = [];
  pagedVoucherGroups: { voucherNumber: string; date: string; items: ReportEntry[]; totalValue: number; totalQuantity: number; hasVoucher: boolean }[] = [];
  selectedPeriod: string = '';
  isSupplyAndDistributionLeader: boolean = false;
  availableRoles: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
  selectedRoles: string[] = [];
  isRoleDropdownOpen: boolean = false;
  availableCategories: string[] = [];
  selectedCategories: string[] = [];
  isCategoryDropdownOpen: boolean = false;
  isSearching = false;
  isExportDropdownOpen: boolean = false;
  backendTotalsByCurrency: { [currency: string]: number } = {};
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userRole = this.authService.getRole()?.toUpperCase();
    if (!userRole) {
      this.errorMessage = 'የተጠቃሚ ሚና አልተገኘም። እባክዎ ይግቡ።';
      return;
    }
    
    this.isSupplyAndDistributionLeader = userRole === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER' || userRole === 'PROPERTY_CONTROL';
    
    if (this.isSupplyAndDistributionLeader) {
      this.selectedRoles = [...this.availableRoles];
    } else {
      this.selectedRoles = userRole ? [userRole] : [];
    }

    this.loadCategories();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.subscribe(searchTerm => {
      this.isSearching = false;
      this.searchQuery = searchTerm;
      this.applyFilters();
    });
  }

  private loadCategories(): void {
    this.itemService.getAllCategories().subscribe({
      next: (categories) => {
        const currentUserRole = this.authService.getRole();
        if (currentUserRole === 'SUPER_ADMIN' || this.isSupplyAndDistributionLeader) {
          this.availableCategories = categories.map(c => c.name);
        } else {
          this.availableCategories = categories
            .filter(c => c.role === currentUserRole)
            .map(c => c.name);
        }
        this.loadTransactions();
      },
      error: (err) => {
        console.error('[TransactionReport] Error fetching categories:', err);
        this.errorMessage = 'የምድቦችን መረጃ መጫን አልተሳካም።';
        this.loadTransactions();
      }
    });
  }

  onSearchChange(value: string): void {
    this.isSearching = true;
    this.searchSubject.next(value);
  }

  private parseEthiopianDate(ethiopianDate: string): Date {
    try {
      if (!ethiopianDate || ethiopianDate === 'Unknown Date' || ethiopianDate === 'ያልታወቀ ቀን') {
        return new Date(0);
      }
      
      if (!/[\u1200-\u137F]/.test(ethiopianDate)) {
        const parsedDate = new Date(ethiopianDate);
        return isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
      }
      
      const parts = ethiopianDate.split(/[\s,]+/).filter(Boolean);
      if (parts.length < 3) return new Date(0);
      
      const [monthStr, day, year] = parts;
      const ethMonths = [
        'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
        'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
      ];
      
      const monthIndex = ethMonths.indexOf(monthStr);
      if (monthIndex === -1 || !day || !year) {
        return new Date(0);
      }
      
      const gregorianYear = parseInt(year) + 7;
      const gregorianDate = new Date(gregorianYear, monthIndex, parseInt(day));
      return isNaN(gregorianDate.getTime()) ? new Date(0) : gregorianDate;
    } catch (error) {
      console.warn('Error parsing date:', ethiopianDate, error);
      return new Date(0);
    }
  }

  loadTransactions(): void {
    if (!this.selectedRoles.length && this.isSupplyAndDistributionLeader) {
      this.errorMessage = 'እባክዎ ቢያንስ አንድ ሚና ይምረጡ።';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;

    const period = this.mapPeriod(this.selectedPeriod);

    // ✅ OPTIMIZED: Use server-side pagination - request only current page
    this.itemService.getFilteredReceiveHistory(
      this.searchQuery,
      period,
      this.selectedRoles,
      this.selectedCategories,
      this.currentPage,
      this.pageSize  // Use actual page size, not 10000
    ).pipe(
      catchError(err => {
        this.errorMessage = 'የግብይት መረጃዎችን መጫን አልተሳካም። እባክዋ እንደገና ይሞክሩ።';
        console.error('[TransactionReport] Error loading transactions:', err);
        return of({ data: [], totalCount: 0, page: 1, pageSize: this.pageSize, totalPages: 0, totalsByCurrency: {} });
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe(response => {
      this.filteredTransactions = response.data.map((t: any) => {
        const unitPrice = t.unitPrice ?? 0;
        const quantity = t.quantity ?? 0;
        const currency = t.currency || 'ETB';
        
        // Detect if this is an accessory-only receipt (no main item quantity)
        const isAccessoryOnly = quantity === 0 && t.accessories && t.accessories.length > 0;
        
        // Calculate total including accessories
        let totalPrice = unitPrice * quantity;
        
        // Add accessory values to total
        if (t.accessories && t.accessories.length > 0) {
          t.accessories.forEach((acc: any) => {
            totalPrice += (acc.unitPrice || 0) * acc.quantity;
          });
        }
        
        return {
          id: t.transactionId,
          description: t.description || 'ያልታወቀ',
          department: t.receivedFrom || 'ያልታወቀ',
          model: t.model || 'ያልታወቀ',
          ethiopianDate: t.date || 'ያልታወቀ ቀን',
          recipientName: t.receivedFrom || 'ያልታወቀ',
          voucherNumber: t.voucherNumber || '',
          totalQuantity: quantity,
          unitPrice: unitPrice,
          currency: currency,
          totalPrice: totalPrice,
          isAccessoryOnly: isAccessoryOnly,
          accessories: t.accessories?.map((acc: any) => ({
            name: acc.name,
            model: acc.model,
            quantity: acc.quantity,
            unitPrice: acc.unitPrice || 0,
            currency: acc.currency || 'ETB',
            totalPrice: (acc.unitPrice || 0) * acc.quantity,
            serialNumbers: acc.serialNumbers || [],
            subAccessories: acc.subAccessories?.map((subAcc: any) => ({
              name: subAcc.name,
              quantity: subAcc.quantity * acc.quantity, // Convert per-unit to total
              unitPrice: subAcc.unitPrice || 0,
              currency: subAcc.currency || 'ETB'
            })) || []
          })) || []
        } as ReportEntry;
      });

      this.totalCount = response.totalCount;
      // Backend now provides totals - no need to recalculate
      this.backendTotalsByCurrency = (response as any).totalsByCurrency || {};
      
      // ✅ Data is already sorted by backend, just group by voucher
      this.groupByVoucher();
      this.updatePagination();
    });
  }

  private groupByVoucher(): void {
    const voucherMap = new Map<string, ReportEntry[]>();
    const noVoucherItems: ReportEntry[] = [];
    
    // Group transactions by voucher number
    this.filteredTransactions.forEach(t => {
      const voucher = t.voucherNumber;
      
      // If no voucher or voucher is "-", treat each item individually
      if (!voucher || voucher === '-' || voucher.trim() === '') {
        noVoucherItems.push(t);
      } else {
        if (!voucherMap.has(voucher)) {
          voucherMap.set(voucher, []);
        }
        voucherMap.get(voucher)!.push(t);
      }
    });

    // Convert voucher groups to array
    this.groupedByVoucher = Array.from(voucherMap.entries()).map(([voucherNumber, items]) => {
      const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalQuantity = items.reduce((sum, item) => sum + item.totalQuantity, 0);
      const date = items[0]?.ethiopianDate || '';
      
      return {
        voucherNumber,
        date,
        items,
        totalValue,
        totalQuantity,
        hasVoucher: true
      };
    });

    // Add individual items without vouchers as separate groups
    noVoucherItems.forEach(item => {
      this.groupedByVoucher.push({
        voucherNumber: 'No Voucher',
        date: item.ethiopianDate,
        items: [item],
        totalValue: item.totalPrice,
        totalQuantity: item.totalQuantity,
        hasVoucher: false
      });
    });

    // Sort by date (most recent first)
    this.groupedByVoucher.sort((a, b) => {
      const dateA = this.parseEthiopianDate(a.date).getTime();
      const dateB = this.parseEthiopianDate(b.date).getTime();
      return dateB - dateA;
    });
  }

  private mapPeriod(period: string): string {
    const periodMap: { [key: string]: string } = {
      '': '',
      '1week': '1week',
      '1month': '1month',
      '3months': '3months',
      '6months': '6months',
      '12months': '1year'
    };
    return periodMap[period] || '';
  }

  private updatePagination(): void {
    this.pagedTransactions = this.getPagedTransactions();
    this.pagedVoucherGroups = this.getPagedVoucherGroups();
    this.cdr.detectChanges();
  }

  private getPagedTransactions(): ReportEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredTransactions.slice(start, end);
  }

  private getPagedVoucherGroups() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.groupedByVoucher.slice(start, end);
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page when filters change
    this.loadTransactions(); // Reload from server with new filters
  }

  sortTable(column: keyof ReportEntry): void {
    // ✅ Backend handles sorting by date - no need for client-side sorting
    // Just toggle direction for UI feedback if needed in future
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'ethiopianDate' ? 'desc' : 'asc';
    }
    // Note: Backend always sorts by date descending
    // If you need different sorting, add sortColumn/sortDirection to API call
  }

  toggleRoleDropdown(): void {
    this.isRoleDropdownOpen = !this.isRoleDropdownOpen;
  }

  onRoleChange(event: Event, role: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedRoles = [...this.selectedRoles, role];
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
    this.currentPage = 1;
    this.loadTransactions();
  }

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  onCategoryChange(event: Event, category: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedCategories = [...this.selectedCategories, category];
    } else {
      this.selectedCategories = this.selectedCategories.filter(c => c !== category);
    }
    this.currentPage = 1;
    this.loadTransactions();
  }

  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTransactions(); // Reload from server
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.loadTransactions(); // Reload from server
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadTransactions(); // Reload from server with new page size
  }

  getTotalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize); // Use totalCount from server
  }

  getVoucherTotalByCurrency(items: ReportEntry[]): string {
    const totals: { [currency: string]: number } = {};
    const currencyOrder: string[] = [];

    items.forEach(item => {
      const currency = item.currency || 'ETB';
      if (!totals[currency]) {
        totals[currency] = 0;
        currencyOrder.push(currency);
      }
      totals[currency] += item.totalPrice;
    });

    if (currencyOrder.length === 0) {
      return '0.00 ETB';
    }

    return currencyOrder
      .map(curr => `${totals[curr].toFixed(2)} ${curr}`)
      .join(' | ');
  }

  formatEthiopianDate(date: string): string {
    if (!date || date === 'Unknown Date') return 'ያልታወቀ ቀን';
    return date;
  }

  calculateGrandTotal(): string {
    const totals = this.backendTotalsByCurrency;
    const currencies = Object.keys(totals);
    if (currencies.length === 0) return '0.00 ETB';
    return currencies.map(c => `${c}: ${totals[c].toFixed(2)}`).join(' | ');
  }

  getTotalQuantity(): number {
    // For accessory-only items, count the number of accessories instead of main item quantity
    return this.filteredTransactions.reduce((sum, t) => {
      if (t.isAccessoryOnly && t.accessories) {
        return sum + t.accessories.reduce((accSum, acc) => accSum + acc.quantity, 0);
      }
      return sum + t.totalQuantity;
    }, 0);
  }

  exportToExcel(): void {
    try {
      this.isExportDropdownOpen = false;
      
      // Prepare main worksheet data
      const worksheetData = this.prepareExcelData();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Set column widths
      const wscols = [
        { wch: 5 },    // No
        { wch: 18 },   // Voucher Number
        { wch: 40 },   // Description
        { wch: 20 },   // Model
        { wch: 15 },   // Date
        { wch: 25 },   // Recipient
        { wch: 10 },   // Quantity
        { wch: 15 },   // Unit Price
        { wch: 10 },   // Currency
        { wch: 15 }    // Total Price
      ];
      worksheet['!cols'] = wscols;
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Receive Report');
      
      // Add summary sheet
      this.addSummarySheet(workbook);
      
      // Generate filename and save
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
      const filename = `Receive_Report_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      console.log('Excel file exported successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.errorMessage = 'Failed to export Excel file. Please try again.';
    }
  }

  private prepareExcelData(): any[] {
    return this.filteredTransactions.map((t, index) => ({
      'No': index + 1,
      'Voucher Number': t.voucherNumber || '-',
      'Description': t.description,
      'Model': t.model || 'N/A',
      'Date': this.formatEthiopianDate(t.ethiopianDate),
      'Recipient/From': t.recipientName,
      'Quantity': t.totalQuantity,
      'Unit Price': t.unitPrice.toFixed(2),
      'Currency': t.currency,
      'Total Price': t.totalPrice.toFixed(2)
    }));
  }

  private addSummarySheet(workbook: XLSX.WorkBook): void {
    const summaryData = [
      ['Report Summary', 'የእቃ መቀበያ ሪፖርት ማጠቃለያ'],
      ['Generated Date', new Date().toLocaleString()],
      ['Total Records', this.filteredTransactions.length],
      [''],
      ['Currency', 'Total Amount']
    ];
    
    // Add currency totals
    const totals: { [currency: string]: number } = {};
    this.filteredTransactions.forEach(t => {
      const currency = t.currency || 'ETB';
      totals[currency] = (totals[currency] || 0) + t.totalPrice;
    });
    
    Object.entries(totals).forEach(([currency, amount]) => {
      summaryData.push([currency, amount.toFixed(2)]);
    });
    
    summaryData.push(['']);
    summaryData.push(['Grand Total', this.calculateGrandTotal()]);
    summaryData.push(['']);
    summaryData.push(['Filter Criteria', '']);
    summaryData.push(['Search Query', this.searchQuery || 'None']);
    summaryData.push(['Date Period', this.selectedPeriod || 'All Dates']);
    summaryData.push(['Selected Roles', this.selectedRoles.join(', ') || 'All']);
    summaryData.push(['Selected Categories', this.selectedCategories.join(', ') || 'All']);
    
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
    
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
  }

  exportToCsv(): void {
    this.isExportDropdownOpen = false;
    
    const headers = ['No', 'Description', 'Department', 'Date', 'Recipient', 'Qty', 'Unit Price', 'Currency', 'Total Price'];
    const data = this.filteredTransactions.map((t, i) => [
      i + 1,
      t.description,
      t.department,
      this.formatEthiopianDate(t.ethiopianDate),
      t.recipientName,
      t.totalQuantity,
      t.unitPrice.toFixed(2),
      t.currency,
      t.totalPrice.toFixed(2)
    ]);
    
    const csvContent = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receive_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}