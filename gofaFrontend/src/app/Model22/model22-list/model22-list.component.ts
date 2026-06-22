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
  categoryFilter: string = '';
  categories: string[] = [];
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
    this.isSupplyAndDistributionLeader =
      userRole === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER' || userRole === 'PROPERTY_CONTROL';

    if (this.isSupplyAndDistributionLeader) {
      this.selectedRoles = [...this.availableRoles];
    } else {
      this.selectedRoles = userRole ? [userRole] : [];
    }

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.loadModel22List();
      });

    this.loadModel22List();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Date helpers
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────────────

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

    this.model22Service
      .getFilteredModel22s(this.searchTerm, this.dateFilter, this.selectedRoles)
      .subscribe({
        next: (data: Model22Dto[]) => {
          console.log('✅ Model22 data received:', {
            count: data.length,
            firstItem: data[0]
              ? {
                  id: data[0].model22Id,
                  voucher: data[0].voucherNumber,
                  itemsCount: data[0].items?.length,
                  hasAccessories: data[0].items?.some(
                    i => (i.withdrawnAccessories?.length || 0) > 0
                  )
                }
              : 'No data'
          });

          this.model22List = data.map(model22 => ({
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
            totalItems: model22.totalItems || model22.items?.length || 0,
            date: model22.date || model22.ethiopianDate,
            description: this.getDescription(model22),
            totalPrice: this.getTotalPrice(model22)
          }));

          this.filteredModel22List = [...this.model22List].sort((a, b) => {
            const dateA = this.parseEthiopianDate(a.ethiopianDate || '').getTime();
            const dateB = this.parseEthiopianDate(b.ethiopianDate || '').getTime();
            return dateB - dateA;
          });

          // Extract categories
          const categorySet = new Set<string>();
          this.model22List.forEach(m22 => {
            m22.items.forEach(item => {
              if (item.category?.trim()) categorySet.add(item.category);
            });
          });
          this.categories = Array.from(categorySet).sort();

          this.applyCategoryFilter();

          console.log('✅ Model22 list processed:', {
            totalCount: this.model22List.length,
            filteredCount: this.filteredModel22List.length
          });

          this.currentPage = 1;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('❌ [Model22List] Error fetching records:', err);

          this.errorMessage = err.message?.includes('WithdrawnSerialNumbers')
            ? 'ሞዴል 22 መዝገቦችን መጫን አልተሳካም፡ የውሂብ መዋቅር ስህተት። እባክዎ ስርዓት አስተዳዳሪዎን ያነጋግሩ።'
            : 'ሞዴል 22 መዝገቦችን መጫን አልተሳካም፡ ' + (err.message || 'Unknown error');

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
      category: item.category || '',
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
    return accessories.map(acc => ({
      ...acc,
      model22ItemAccessoryId: acc.model22ItemAccessoryId || 0,
      model22ItemId: acc.model22ItemId || 0,
      accessoryId: acc.accessoryId || 0,
      name: acc.name || '',
      model: acc.model || '',
      quantity: acc.quantity || 0,
      unitPrice: acc.unitPrice || 0,
      currency: acc.currency || 'ETB',
      withdrawnSerialNumbers: acc.withdrawnSerialNumbers || []
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Display helpers
  // ─────────────────────────────────────────────────────────────────────────────

  getDescription(model22: Model22 | Model22Dto): string {
    if (!model22.items || model22.items.length === 0) {
      return 'No description / ምንም መግለጫ የለም';
    }

    const descriptions = model22.items
      .slice(0, 3)
      .map(item => {
        let desc = item.description;
        if (item.withdrawnAccessories && item.withdrawnAccessories.length > 0) {
          const accessoryNames = item.withdrawnAccessories
            .map(acc => `${acc.name}(${acc.quantity})`)
            .join(', ');
          desc += ` [Accessories: ${accessoryNames}]`;
        }
        return desc;
      })
      .filter(desc => desc?.trim())
      .join(', ');

    return descriptions || 'No description / ምንም መግለጫ የለም';
  }

  getTotalPrice(model22: Model22 | Model22Dto): string {
    if (!model22.items || model22.items.length === 0) return '0.00 ETB';

    const totalsByCurrency = new Map<string, number>();

    model22.items.forEach(item => {
      const itemTotal = (item as any).isAccessoryOnly
        ? 0
        : (item.unitPrice || 0) * (item.quantity || 0);

      const accTotal = (item.withdrawnAccessories || []).reduce(
        (sum, acc) => sum + (acc.unitPrice || 0) * (acc.quantity || 0),
        0
      );

      const total = itemTotal + accTotal;
      const currency = item.currency || 'ETB';
      if (currency === 'FOC') return;

      totalsByCurrency.set(currency, (totalsByCurrency.get(currency) || 0) + total);
    });

    const parts: string[] = [];
    totalsByCurrency.forEach((value, currency) => {
      parts.push(`${value.toFixed(2)} ${currency}`);
    });

    return parts.join(' + ') || '0.00';
  }

  get grandTotal(): string {
    if (this.filteredModel22List.length === 0) return '0.00 ETB';

    const totalsByCurrency = new Map<string, number>();

    this.filteredModel22List.forEach(model22 => {
      const totalPrice = this.getTotalPrice(model22);
      if (!totalPrice) return;

      totalPrice.split(' + ').forEach(part => {
        const match = part.trim().match(/^([\d,]+\.\d{2})\s*(\w+)$/);
        if (!match) return;
        const [, amount, currency] = match;
        if (currency === 'FOC') return;
        const numAmount = parseFloat(amount.replace(/,/g, ''));
        if (!isNaN(numAmount)) {
          totalsByCurrency.set(currency, (totalsByCurrency.get(currency) || 0) + numAmount);
        }
      });
    });

    if (totalsByCurrency.size === 0) return '0.00 ETB';

    const parts: string[] = [];
    totalsByCurrency.forEach((value, currency) => {
      parts.push(`${currency}: ${value.toFixed(2)}`);
    });
    return parts.join(' | ');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────────────────────────────────────────

  get paginatedList(): Model22Dto[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredModel22List.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredModel22List.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Filters
  // ─────────────────────────────────────────────────────────────────────────────

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onDateFilterChange(): void {
    this.loadModel22List();
  }

  onCategoryFilterChange(): void {
    this.filteredModel22List = [...this.model22List].sort((a, b) => {
      return (
        this.parseEthiopianDate(b.ethiopianDate || '').getTime() -
        this.parseEthiopianDate(a.ethiopianDate || '').getTime()
      );
    });
    this.applyCategoryFilter();
    this.currentPage = 1;
  }

  private applyCategoryFilter(): void {
    if (!this.categoryFilter) return;

    this.filteredModel22List = this.filteredModel22List.filter(model22 =>
      model22.items.some(
        item => (item.category || '').trim() === this.categoryFilter.trim()
      )
    );

    console.log('✅ Category filter applied:', {
      category: this.categoryFilter,
      filteredCount: this.filteredModel22List.length
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Role dropdown
  // ─────────────────────────────────────────────────────────────────────────────

  toggleRoleDropdown(): void {
    this.isRoleDropdownOpen = !this.isRoleDropdownOpen;
  }

  onRoleChange(event: Event, role: string): void {
    const checkbox = event.target as HTMLInputElement;
    this.selectedRoles = checkbox.checked
      ? [...this.selectedRoles, role]
      : this.selectedRoles.filter(r => r !== role);
    this.loadModel22List();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────────

  viewDetails(id: number): void {
    if (!id) {
      this.errorMessage = 'ልክ ያልሆነ ሞዴል 22 መለያ።';
      return;
    }

    const userRole = this.authService.getRole()?.toUpperCase();
    const roleFilter = this.isSupplyAndDistributionLeader ? undefined : userRole;

    this.router.navigate(['/model22-detail', id], {
      queryParams: { role: roleFilter }
    });
  }

  trackByModel22Id(index: number, model22: Model22Dto): number {
    return model22.model22Id || index;
  }

  getAccessoriesSummary(model22: Model22Dto): string {
    if (!model22.items?.length) return '';

    const allAccessories: string[] = [];
    model22.items.forEach(item => {
      (item.withdrawnAccessories || []).forEach(acc => {
        allAccessories.push(`${acc.name}(${acc.quantity})`);
      });
    });

    return allAccessories.length ? `[${allAccessories.join(', ')}]` : '';
  }

  getItemsCount(model22: Model22Dto): number {
    return model22.items?.length || 0;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Export
  // ─────────────────────────────────────────────────────────────────────────────

  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  exportToExcel(): void {
    try {
      this.isExportDropdownOpen = false;

      const workbook = XLSX.utils.book_new();
      this.addMainSheet(workbook);
      this.addSummarySheet(workbook);

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
      XLSX.writeFile(workbook, `Model22_Report_${timestamp}.xlsx`);

      console.log('✅ Excel exported successfully');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      this.errorMessage = 'Failed to export Excel file. Please try again.';
    }
  }

  // Helper: create a typed cell so xlsx never misinterprets Amharic as a number/date
  private cell(value: any, numeric = false): XLSX.CellObject {
    if (value === '' || value === null || value === undefined) {
      return { t: 's', v: '' };
    }
    if (numeric && typeof value === 'number') {
      return { t: 'n', v: value };
    }
    // Force everything else — including Amharic strings — as text
    return { t: 's', v: String(value) };
  }

  // Build a worksheet from a 2-D array of CellObjects
  private buildSheet(rows: XLSX.CellObject[][]): XLSX.WorkSheet {
    const ws: XLSX.WorkSheet = {};
    let maxCol = 0;
    rows.forEach((row, R) => {
      if (row.length > maxCol) maxCol = row.length;
      row.forEach((cellObj, C) => {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        ws[addr] = cellObj;
      });
    });
    ws['!ref'] = XLSX.utils.encode_range(
      { r: 0, c: 0 },
      { r: rows.length - 1, c: maxCol - 1 }
    );
    return ws;
  }

  private addMainSheet(workbook: XLSX.WorkBook): void {
    const headers = [
      '#',
      'Voucher / ሰነድ ቁጥር',
      'Date / ቀን',
      'Department / ክፍል',
      'Recipient / ተቀባይ',
      'Organization / ድርጅት',
      'Role / ሚና',
      'Registered By / የመዘገበው',
      'Item Description / የእቃ መግለጫ',
      'Model / ሞዴል',
      'Category / ምድብ',
      'Quantity / ብዛት',
      'Unit Price / የነጠላ ዋጋ',
      'Currency / መገበያያ',
      'Item Total / የእቃ ጠቅላላ',
      'Serial Numbers / ተከታታይ ቁጥሮች',
      'Accessory Name / መለዋወጫ ስም',
      'Accessory Model / መለዋወጫ ሞዴል',
      'Accessory Qty / መለዋወጫ ብዛት',
      'Accessory Unit Price / የነጠላ ዋጋ',
      'Accessory Currency / መገበያያ',
      'Accessory Total / ጠቅላላ',
      'Record Total / መዝገብ ጠቅላላ',
    ];

    const e  = (v: any)             => this.cell(v);         // text cell
    const n  = (v: any)             => this.cell(v, true);   // numeric cell
    const blank                     = () => this.cell('');
    const blankRow = ()             => headers.map(() => blank());

    const rows: XLSX.CellObject[][] = [headers.map(h => e(h))];

    this.filteredModel22List.forEach((model22, recordIdx) => {
      const recordTotal = this.getTotalPrice(model22);
      const items = model22.items || [];

      if (items.length === 0) {
        rows.push([
          n(recordIdx + 1), e(model22.voucherNumber), e(model22.ethiopianDate),
          e(model22.department), e(model22.recipientName), e(model22.recipientOrganization),
          e(model22.role), e(model22.registeredBy),
          blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(),
          blank(), blank(), blank(), blank(), blank(), blank(),
          e(recordTotal),
        ]);
        rows.push(blankRow());
        return;
      }

      let recordFirstRow = true;

      items.forEach(item => {
        const isAccessoryOnly = !!(item as any).isAccessoryOnly;
        const itemTotal       = isAccessoryOnly ? 0 : (item.unitPrice || 0) * (item.quantity || 0);
        const serials         = (item.serialNumbers || []).join(', ');
        const accessories     = item.withdrawnAccessories || [];

        // Shared parent-record cells (only on first row of each record)
        const pCells = recordFirstRow
          ? [n(recordIdx + 1), e(model22.voucherNumber), e(model22.ethiopianDate),
             e(model22.department), e(model22.recipientName), e(model22.recipientOrganization),
             e(model22.role), e(model22.registeredBy)]
          : [blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()];

        if (accessories.length === 0) {
          rows.push([
            ...pCells,
            e(item.description), e(item.model), e(item.category),
            n(item.quantity || 0), n(item.unitPrice || 0), e(item.currency || 'ETB'),
            n(itemTotal), e(serials),
            blank(), blank(), blank(), blank(), blank(), blank(),
            recordFirstRow ? e(recordTotal) : blank(),
          ]);
          recordFirstRow = false;
        } else {
          accessories.forEach((acc, accIdx) => {
            const accTotal = (acc.unitPrice || 0) * (acc.quantity || 0);

            // Item cells only on the first accessory row
            const iCells = accIdx === 0
              ? [e(item.description), e(item.model), e(item.category),
                 n(item.quantity || 0), n(item.unitPrice || 0), e(item.currency || 'ETB'),
                 n(itemTotal), e(serials)]
              : [blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()];

            rows.push([
              ...pCells,
              ...iCells,
              e(acc.name), e(acc.model),
              n(acc.quantity || 0), n(acc.unitPrice || 0), e(acc.currency || 'ETB'),
              n(accTotal),
              recordFirstRow ? e(recordTotal) : blank(),
            ]);
            recordFirstRow = false;
          });
        }
      });

      rows.push(blankRow());
    });

    // Grand total row
    const grandRow = blankRow();
    grandRow[0]  = e('GRAND TOTAL / ጠቅላላ ድምር');
    grandRow[22] = e(this.grandTotal);
    rows.push(grandRow);

    const worksheet = this.buildSheet(rows);

    worksheet['!cols'] = [
      { wch: 5  }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 22 }, { wch: 25 }, { wch: 12 }, { wch: 20 },
      { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
      { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 28 },
      { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Model22 Records');
  }

  private addSummarySheet(workbook: XLSX.WorkBook): void {
    const e = (v: any) => this.cell(v);
    const rows: XLSX.CellObject[][] = [
      [e('Model 22 Report Summary'),              e('የሞዴል 22 ሪፖርት ማጠቃለያ')],
      [e('Generated Date / የተፈጠረበት ቀን'),         e(new Date().toLocaleString())],
      [e('Total Records / አጠቃላይ መዝገቦች'),         this.cell(this.filteredModel22List.length, true)],
      [e('Grand Total / ጠቅላላ ድምር'),               e(this.grandTotal)],
      [e('')],
      [e('Filter Criteria / የማጣሪያ መስፈርት'),        e('')],
      [e('Search Query / ፍለጋ'),                   e(this.searchTerm || 'None')],
      [e('Date Filter / የቀን ማጣሪያ'),               e(this.dateFilter || 'All Dates')],
      [e('Category Filter / የምድብ ማጣሪያ'),           e(this.categoryFilter || 'All')],
      [e('Selected Roles / የተመረጡ ሚናዎች'),          e(this.selectedRoles.join(', ') || 'All')],
    ];

    const ws = this.buildSheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, ws, 'Summary');
  }

  // CSV cannot reliably render Amharic in Excel — always export as xlsx
  exportToCsv(): void {
    this.exportToExcel();
  }
}