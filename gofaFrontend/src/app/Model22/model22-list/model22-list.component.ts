import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Model22Service } from '../../services/model22.service';
import { Model22Dto, Model22Item } from '../../model/model22';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-model22-list',
  templateUrl: './model22-list.component.html',
  styleUrls: ['./model22-list.component.css']
})
export class Model22ListComponent implements OnInit, OnDestroy {
  model22List: Model22Dto[] = [];
  filteredModel22List: Model22Dto[] = [];
  searchTerm: string = '';
  dateFilter: string = '';
  itemsPerPage: number = 5;
  currentPage: number = 1;
  errorMessage: string | null = null;
  isSupplyAndDistributionLeader = false;
  availableRoles: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
  selectedRoles: string[] = [];
  isRoleDropdownOpen: boolean = false;
  isExportDropdownOpen: boolean = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private dateCache = new Map<string, number>();

  constructor(
    private model22Service: Model22Service,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userRole = this.authService.getRole()?.toUpperCase();
    this.isSupplyAndDistributionLeader = userRole === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER' || userRole === 'PROPERTY_CONTROL';
    
    if (this.isSupplyAndDistributionLeader) {
      this.selectedRoles = [...this.availableRoles];
    } else {
      this.selectedRoles = userRole ? [userRole] : [];
    }

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.loadModel22List();
    });

    this.loadModel22List();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseEthiopianDate(ethiopianDate: string): Date {
    if (!ethiopianDate) return new Date(0);
    
    if (this.dateCache.has(ethiopianDate)) {
      return new Date(this.dateCache.get(ethiopianDate)!);
    }

    try {
      const [monthStr, day, year] = ethiopianDate.split(/[\s,]+/);
      const ethMonths = [
        'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
        'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
      ];
      
      const monthIndex = ethMonths.indexOf(monthStr);
      if (monthIndex === -1 || !day || !year) {
        this.dateCache.set(ethiopianDate, 0);
        return new Date(0);
      }
      
      const gregorianYear = parseInt(year) + 7;
      const gregorianDate = new Date(gregorianYear, monthIndex, parseInt(day));
      const result = isNaN(gregorianDate.getTime()) ? new Date(0) : gregorianDate;
      
      this.dateCache.set(ethiopianDate, result.getTime());
      return result;
    } catch (error) {
      console.warn('[Model22List] Error parsing Ethiopian date:', error);
      this.dateCache.set(ethiopianDate, 0);
      return new Date(0);
    }
  }

  loadModel22List(): void {
    if (!this.selectedRoles.length && this.isSupplyAndDistributionLeader) {
      this.errorMessage = 'እባክዎ ቢያንስ አንድ ሚና ይምረጡ።';
      this.filteredModel22List = [];
      this.currentPage = 1;
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = null;

    this.model22Service.getFilteredModel22s(this.searchTerm, this.dateFilter, this.selectedRoles).subscribe({
      next: (data: Model22Dto[]) => {
        this.model22List = data.map(model22 => ({
          ...model22,
          description: this.generateDescription(model22.items),
          totalPrice: this.calculateTotalPrice(model22.items)
        }));

        this.filteredModel22List = [...this.model22List].sort((a, b) => {
          const dateA = this.parseEthiopianDate(a.ethiopianDate || '').getTime();
          const dateB = this.parseEthiopianDate(b.ethiopianDate || '').getTime();
          return dateB - dateA;
        });

        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[Model22List] Error fetching records:', err);
        this.errorMessage = 'ሞዴል 22 መዝገቦችን መጫን አልተሳካም፡ ' + (err.message || 'Unknown error');
        this.filteredModel22List = [];
        this.cdr.detectChanges();
      }
    });
  }

  private generateDescription(items: Model22Item[] = []): string {
    if (!items || items.length === 0) {
      return 'No description / ምንም መግለጫ የለም';
    }
    
    const descriptions = items
      .slice(0, 3)
      .map(item => item.description)
      .filter(desc => desc && desc.trim() !== '')
      .join(', ');
      
    return descriptions || 'No description / ምንም መግለጫ የለም';
  }

  private calculateTotalPrice(items: Model22Item[] = []): string {
    if (!items || items.length === 0) {
      return '0.00 ETB';
    }
    
    const total = items.reduce((sum, item) => {
      return sum + ((item.unitPrice || 0) * (item.quantity || 0));
    }, 0);
    
    const currency = items[0]?.currency || 'ETB';
    return `${total.toFixed(2)} ${currency}`;
  }

  get grandTotal(): string {
    if (this.filteredModel22List.length === 0) {
      return '0.00 ETB';
    }

    const totalsByCurrency = new Map<string, number>();
    const currencyOrder: string[] = [];

    this.filteredModel22List.forEach(model22 => {
      if (!model22.totalPrice) return;

      const match = model22.totalPrice.match(/^(\d+\.\d{2})\s*(\w+)$/);
      if (!match) return;

      const [, amount, currency] = match;
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return;

      if (!totalsByCurrency.has(currency)) {
        totalsByCurrency.set(currency, 0);
        currencyOrder.push(currency);
      }
      
      totalsByCurrency.set(currency, totalsByCurrency.get(currency)! + numAmount);
    });

    if (currencyOrder.length === 0) {
      return '0.00 ETB';
    }

    return currencyOrder
      .map(currency => `${currency}: ${totalsByCurrency.get(currency)!.toFixed(2)}`)
      .join(' | ');
  }

  get paginatedList(): Model22Dto[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredModel22List.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredModel22List.length / this.itemsPerPage);
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
    this.loadModel22List();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onDateFilterChange(): void {
    this.loadModel22List();
  }

  viewDetails(id: number): void {
    if (id === undefined || id === null) {
      this.errorMessage = 'ልክ ያልሆነ ሞዴል 22 መለያ።';
      return;
    }
    
    const userRole = this.authService.getRole()?.toUpperCase();
    const roleFilter = this.isSupplyAndDistributionLeader ? undefined : userRole;
    
    this.router.navigate(['/model22-detail', id], {
      queryParams: { role: roleFilter }
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  exportToExcel(): void {
    try {
      this.isExportDropdownOpen = false;
      
      const worksheetData = this.prepareExcelData();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      const wscols = [
        { wch: 15 }, // Voucher
        { wch: 25 }, // Recipient
        { wch: 15 }, // Date
        { wch: 20 }, // Organization
        { wch: 15 }, // Role
        { wch: 40 }, // Description
        { wch: 20 }  // Total Price
      ];
      worksheet['!cols'] = wscols;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Model22 Report');
      
      this.addSummarySheet(workbook);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
      const filename = `Model22_Report_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      console.log('Model22 Excel file exported successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.errorMessage = 'Failed to export Excel file. Please try again.';
    }
  }

  private prepareExcelData(): any[] {
    return this.filteredModel22List.map(model22 => ({
      'Voucher': model22.voucherNumber || 'N/A',
      'Recipient': model22.recipientName || '',
      'Date': model22.ethiopianDate || '',
      'Organization': model22.recipientOrganization || '',
      'Role': model22.role || '',
      'Description': model22.description || 'No description / ምንም መግለጫ የለም',
      'Total Price': model22.totalPrice || '0.00 ETB'
    }));
  }

  private addSummarySheet(workbook: XLSX.WorkBook): void {
    const summaryData = [
      ['Model 22 Report Summary', 'የሞዴል 22 ሪፖርት ማጠቃለያ'],
      ['Generated Date', new Date().toLocaleString()],
      ['Total Records', this.filteredModel22List.length],
      [''],
      ['Grand Total', this.grandTotal],
      [''],
      ['Filter Criteria', ''],
      ['Search Query', this.searchTerm || 'None'],
      ['Date Period', this.dateFilter || 'All Dates'],
      ['Selected Roles', this.selectedRoles.join(', ') || 'All']
    ];
    
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
    
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
  }

  exportToCsv(): void {
    this.isExportDropdownOpen = false;
    
    const headers = ['Voucher', 'Recipient', 'Date', 'Organization', 'Role', 'Description', 'Total Price'];
    const rows = this.filteredModel22List.map(model22 => [
      model22.voucherNumber || 'N/A',
      model22.recipientName,
      model22.ethiopianDate,
      model22.recipientOrganization,
      model22.role,
      model22.description || 'No description / ምንም መግለጫ የለም',
      model22.totalPrice || '0.00 ETB'
    ]);

    const csvLines = [headers.join(','), ...rows.map(row => row.join(','))];
    const csvContent = csvLines.join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `model22_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  trackByModel22Id(index: number, model22: Model22Dto): number {
    return model22.model22Id || index;
  }
}