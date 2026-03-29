import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Model22Service } from '../../services/model22.service';
import { Model22, Model22Dto, Model22Item, Model22ItemAccessory } from '../../model/model22';
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
  categoryFilter: string = ''; // Add category filter
  categories: string[] = []; // Add categories list
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
  ) { }

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
    console.log('🔄 Loading Model22 list...', {
      selectedRoles: this.selectedRoles,
      searchTerm: this.searchTerm,
      dateFilter: this.dateFilter,
      isSupplyAndDistributionLeader: this.isSupplyAndDistributionLeader
    });

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
        console.log('✅ Model22 data received:', {
          count: data.length,
          firstItem: data[0] ? {
            id: data[0].model22Id,
            voucher: data[0].voucherNumber,
            itemsCount: data[0].items?.length,
            hasAccessories: data[0].items?.some(i => (i.withdrawnAccessories?.length || 0) > 0)
          } : 'No data'
        });

        // Process the data to ensure all fields are properly initialized
        this.model22List = data.map(model22 => {
          const processedModel22: Model22Dto = {
            ...model22,
            model22Id: model22.model22Id || 0,
            voucherNumber: model22.voucherNumber || '',
            department: model22.department || '',
            recipientName: model22.recipientName || '',
            recipientOrganization: model22.recipientOrganization || '',
            ethiopianDate: model22.ethiopianDate || '',
            role: model22.role || '',
            registeredBy: model22.registeredBy || '',
            items: this.processItems(model22.items || []),
            totalItems: model22.totalItems || (model22.items?.length || 0),
            date: model22.date || model22.ethiopianDate,
            description: this.getDescription(model22),
            totalPrice: this.getTotalPrice(model22)
          };
          return processedModel22;
        });

        this.filteredModel22List = [...this.model22List].sort((a, b) => {
          const dateA = this.parseEthiopianDate(a.ethiopianDate || '').getTime();
          const dateB = this.parseEthiopianDate(b.ethiopianDate || '').getTime();
          return dateB - dateA;
        });

        // Extract categories from the loaded Model22 data
        const categorySet = new Set<string>();
        this.model22List.forEach(model22 => {
          model22.items.forEach(item => {
            if (item.category && item.category.trim() !== '') {
              categorySet.add(item.category);
            }
          });
        });
        this.categories = Array.from(categorySet).sort();
        
        console.log('✅ Categories extracted:', this.categories);

        // Apply category filter if set
        this.applyCategoryFilter();

        console.log('✅ Model22 list processed:', {
          totalCount: this.model22List.length,
          filteredCount: this.filteredModel22List.length
        });

        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('❌ [Model22List] Error fetching records:', {
          message: err.message,
          error: err,
          stack: err.stack
        });

        if (err.message?.includes('WithdrawnSerialNumbers')) {
          this.errorMessage = 'ሞዴል 22 መዝገቦችን መጫን አልተሳካም፡ የውሂብ መዋቅር ስህተት። እባክዎ ስርዓት አስተዳዳሪዎን ያነጋግሩ።';
        } else {
          this.errorMessage = 'ሞዴል 22 መዝገቦችን መጫን አልተሳካም፡ ' + (err.message || 'Unknown error');
        }

        this.filteredModel22List = [];
        this.cdr.detectChanges();
      }
    });
  }

  private processItems(items: Model22Item[]): Model22Item[] {
    return items.map(item => ({
      ...item,
      model22ItemId: item.model22ItemId || 0,
      model22Id: item.model22Id || 0,
      description: item.description || '',
      model: item.model || '',
      category: item.category || '', // Preserve category field
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      currency: item.currency || 'ETB',
      serialNumbers: item.serialNumbers || [],
      serialNumber: item.serialNumber || '',
      voucherNumber: item.voucherNumber || '',
      withdrawnAccessories: this.processAccessories(item.withdrawnAccessories || [])
    }));
  }

  private processAccessories(accessories: Model22ItemAccessory[]): Model22ItemAccessory[] {
    return accessories.map(accessory => ({
      ...accessory,
      model22ItemAccessoryId: accessory.model22ItemAccessoryId || 0,
      model22ItemId: accessory.model22ItemId || 0,
      accessoryId: accessory.accessoryId || 0,
      name: accessory.name || '',
      model: accessory.model || '',
      quantity: accessory.quantity || 0,
      unitPrice: accessory.unitPrice || 0,
      currency: accessory.currency || 'ETB',
      withdrawnSerialNumbers: accessory.withdrawnSerialNumbers || []
    }));
  }

  getDescription(model22: Model22 | Model22Dto): string {
    if (!model22.items || model22.items.length === 0) {
      return 'No description / ምንም መግለጫ የለም';
    }

    const descriptions = model22.items
      .slice(0, 3)
      .map(item => {
        let desc = item.description;
        // Add accessories info if present
        if (item.withdrawnAccessories && item.withdrawnAccessories.length > 0) {
          const accessoryNames = item.withdrawnAccessories
            .map(acc => `${acc.name}(${acc.quantity})`)
            .join(', ');
          desc += ` [Accessories: ${accessoryNames}]`;
        }
        return desc;
      })
      .filter(desc => desc && desc.trim() !== '')
      .join(', ');

    return descriptions || 'No description / ምንም መግለጫ የለም';
  }

  getTotalPrice(model22: Model22 | Model22Dto): string {
    if (!model22.items || model22.items.length === 0) {
      return '0.00 ETB';
    }

    // Group totals by currency
    const totalsByCurrency = new Map<string, number>();

    model22.items.forEach(item => {
      // If accessory-only, don't include item price, only accessories
      const itemTotal = (item as any).isAccessoryOnly ? 0 : ((item.unitPrice || 0) * (item.quantity || 0));
      
      // Add accessories total
      let accTotal = 0;
      if (item.withdrawnAccessories && item.withdrawnAccessories.length > 0) {
        accTotal = item.withdrawnAccessories.reduce((sum, acc) => 
          sum + ((acc.unitPrice || 0) * (acc.quantity || 0)), 0
        );
      }
      
      const total = itemTotal + accTotal;
      const currency = item.currency || 'ETB';
      
      // Skip FOC currency
      if (currency === 'FOC') return;
      
      const currentTotal = totalsByCurrency.get(currency) || 0;
      totalsByCurrency.set(currency, currentTotal + total);
    });

    // Format as "10,000.00 ETB + 2,000.00 USD"
    const parts: string[] = [];
    totalsByCurrency.forEach((value, currency) => {
      parts.push(`${value.toFixed(2)} ${currency}`);
    });

    return parts.join(' + ') || '0.00';
  }

  get grandTotal(): string {
    if (this.filteredModel22List.length === 0) {
      return '0.00 ETB';
    }

    const totalsByCurrency = new Map<string, number>();

    this.filteredModel22List.forEach(model22 => {
      const totalPrice = this.getTotalPrice(model22);
      if (!totalPrice) return;

      // Parse format like "10,000.00 ETB + 2,000.00 USD"
      const parts = totalPrice.split(' + ');
      
      parts.forEach(part => {
        const match = part.trim().match(/^([\d,]+\.\d{2})\s*(\w+)$/);
        if (!match) return;

        const [, amount, currency] = match;
        
        // Skip FOC currency
        if (currency === 'FOC') return;
        
        const numAmount = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(numAmount)) return;

        const currentTotal = totalsByCurrency.get(currency) || 0;
        totalsByCurrency.set(currency, currentTotal + numAmount);
      });
    });

    if (totalsByCurrency.size === 0) {
      return '0.00 ETB';
    }

    // Format as "ETB: 50,000.00 | USD: 10,000.00"
    const parts: string[] = [];
    totalsByCurrency.forEach((value, currency) => {
      parts.push(`${currency}: ${value.toFixed(2)}`);
    });

    return parts.join(' | ');
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

  onCategoryFilterChange(): void {
    // Reset to full list first, then apply category filter
    this.filteredModel22List = [...this.model22List].sort((a, b) => {
      const dateA = this.parseEthiopianDate(a.ethiopianDate || '').getTime();
      const dateB = this.parseEthiopianDate(b.ethiopianDate || '').getTime();
      return dateB - dateA;
    });
    
    this.applyCategoryFilter();
    this.currentPage = 1;
  }

  private applyCategoryFilter(): void {
    if (this.categoryFilter) {
      this.filteredModel22List = this.filteredModel22List.filter(model22 => {
        return model22.items.some(item => {
          const itemCategory = (item.category || '').trim();
          const filterCategory = this.categoryFilter.trim();
          return itemCategory === filterCategory;
        });
      });
      
      console.log('✅ Category filter applied:', {
        category: this.categoryFilter,
        filteredCount: this.filteredModel22List.length
      });
    }
  }

  viewDetails(id: number): void {
    if (id === undefined || id === null || id === 0) {
      this.errorMessage = 'ልክ ያልሆነ ሞዴል 22 መለያ።';
      return;
    }

    const userRole = this.authService.getRole()?.toUpperCase();
    const roleFilter = this.isSupplyAndDistributionLeader ? undefined : userRole;

    console.log('🔍 Viewing Model22 details:', { id, roleFilter });

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

      console.log('✅ Model22 Excel file exported successfully');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
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
      'Description': this.getDescription(model22),
      'Total Price': this.getTotalPrice(model22)
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
      this.getDescription(model22),
      this.getTotalPrice(model22)
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

  getAccessoriesSummary(model22: Model22Dto): string {
    if (!model22.items || model22.items.length === 0) return '';

    const allAccessories: string[] = [];
    model22.items.forEach(item => {
      if (item.withdrawnAccessories && item.withdrawnAccessories.length > 0) {
        item.withdrawnAccessories.forEach(acc => {
          allAccessories.push(`${acc.name}(${acc.quantity})`);
        });
      }
    });

    return allAccessories.length > 0 ? `[${allAccessories.join(', ')}]` : '';
  }

  getItemsCount(model22: Model22Dto): number {
    return model22.items?.length || 0;
  }
}
