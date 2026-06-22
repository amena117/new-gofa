import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Model22Service } from '../../services/model22.service';
import { AuthService } from '../../services/auth.service';
import { Model22Dto } from '../../model/model22';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { NOTO_ETHIOPIC_BASE64 } from '../../../assets/fonts/noto-ethiopic-base64';

interface ItemDistribution {
  description: string;
  model: string;
  totalQuantity: number;
  totalValue: number;
  totalValueByCurrency: { [currency: string]: number };
  currency: string;
  withdrawalCount: number;
  withdrawals: Array<{
    voucherNumber: string;
    date: string;
    recipient: string;
    organization: string;
    quantity: number;
    serialNumbers: string[];
    currency: string;
    unitPrice: number;
    totalPrice: number;
    accessories?: Array<{
      name: string;
      model: string;
      quantity: number;
      unitPrice: number;
      currency: string;
      totalPrice: number;
      withdrawnSerialNumbers?: string[];
      subAccessories?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        currency: string;
      }>;
    }>;
  }>;
}

interface ReportSummary {
  totalItems: number;
  totalWithdrawals: number;
  totalQuantityDistributed: number;
  totalValueByRole: { [role: string]: { [currency: string]: number } };
  topItems: Array<{ description: string; model: string; quantity: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

@Component({
  selector: 'app-item-distribution-report',
  templateUrl: './item-distribution-report.component.html',
  styleUrls: ['./item-distribution-report.component.css']
})
export class ItemDistributionReportComponent implements OnInit, OnDestroy {
  itemDistributions: ItemDistribution[] = [];
  filteredDistributions: ItemDistribution[] = [];
  searchTerm: string = '';
  dateFilter: string = '';
  selectedRole: string = '';
  selectedRoles: string[] = [];
  availableRoles: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
  isLoading = false;
  errorMessage: string | null = null;
  isSupplyAndDistributionLeader = false;
  isRoleDropdownOpen = false;
  userRole: string = '';
  
  // Expose Math to template
  Math = Math;
  
  // Summary statistics
  reportSummary: ReportSummary = {
    totalItems: 0,
    totalWithdrawals: 0,
    totalQuantityDistributed: 0,
    totalValueByRole: {},
    topItems: [],
    recentActivity: []
  };
  
  // View options
  viewMode: 'cards' | 'table' = 'cards';
  sortBy: 'quantity' | 'value' | 'withdrawals' | 'name' = 'quantity';
  sortDirection: 'asc' | 'desc' = 'desc';
  expandedItems: Set<string> = new Set();
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  paginatedDistributions: ItemDistribution[] = [];
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private dateCache = new Map<string, number>();

  constructor(
    private model22Service: Model22Service,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole()?.toUpperCase() || '';
    this.isSupplyAndDistributionLeader = this.userRole === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER' || this.userRole === 'PROPERTY_CONTROL';
    
    if (this.isSupplyAndDistributionLeader) {
      // Team leader can select multiple roles, default to all
      this.selectedRoles = [...this.availableRoles];
    } else {
      // Other roles can only see their own data
      this.selectedRole = this.userRole;
      this.selectedRoles = [this.userRole];
    }
    
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.loadReport();
    });
    
    this.loadReport();
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
      console.warn('[ItemDistribution] Error parsing Ethiopian date:', error);
      this.dateCache.set(ethiopianDate, 0);
      return new Date(0);
    }
  }

  loadReport(): void {
    if (!this.selectedRoles.length && this.isSupplyAndDistributionLeader) {
      this.errorMessage = 'እባክዎ ቢያንስ አንድ ሚና ይምረጡ።';
      this.filteredDistributions = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Use the filtered endpoint with date period - backend does all the filtering
    this.model22Service.getFilteredModel22s(this.searchTerm, this.dateFilter, this.selectedRoles).subscribe({
      next: (model22s: Model22Dto[]) => {
        this.processDistributions(model22s);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ItemDistribution] Error loading report:', err);
        this.errorMessage = 'Failed to load report: ' + (err.message || 'Unknown error');
        this.filteredDistributions = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private processDistributions(model22s: Model22Dto[]): void {
    const distributionMap = new Map<string, ItemDistribution>();

    model22s.forEach(m22 => {
      m22.items.forEach(item => {
        const key = `${item.description}_${item.model}`;
        
        if (!distributionMap.has(key)) {
          distributionMap.set(key, {
            description: item.description,
            model: item.model,
            totalQuantity: 0,
            totalValue: 0,
            totalValueByCurrency: {},
            currency: item.currency || 'ETB',
            withdrawalCount: 0,
            withdrawals: []
          });
        }

        const distribution = distributionMap.get(key)!;
        
        // Only add parent item quantity if it's not an accessory-only withdrawal
        if (!item.isAccessoryOnly) {
          distribution.totalQuantity += item.quantity;
        }
        
        // Calculate value by currency for parent item
        const currency = item.currency || 'ETB';
        const itemValue = (item.unitPrice || 0) * item.quantity;
        
        if (!distribution.totalValueByCurrency[currency]) {
          distribution.totalValueByCurrency[currency] = 0;
        }
        distribution.totalValueByCurrency[currency] += itemValue;
        distribution.totalValue += itemValue;
        
        // Add accessory values to the total
        if (item.withdrawnAccessories && item.withdrawnAccessories.length > 0) {
          item.withdrawnAccessories.forEach(acc => {
            const accCurrency = acc.currency || 'ETB';
            const accValue = (acc.unitPrice || 0) * acc.quantity;
            
            if (!distribution.totalValueByCurrency[accCurrency]) {
              distribution.totalValueByCurrency[accCurrency] = 0;
            }
            distribution.totalValueByCurrency[accCurrency] += accValue;
            distribution.totalValue += accValue;
          });
        }
        
        distribution.withdrawalCount++;
        distribution.withdrawals.push({
          voucherNumber: m22.voucherNumber,
          date: m22.ethiopianDate,
          recipient: m22.recipientName,
          organization: m22.recipientOrganization,
          quantity: item.quantity,
          serialNumbers: item.serialNumbers || [],
          currency: item.currency || 'ETB',
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.unitPrice || 0) * item.quantity,
          accessories: item.withdrawnAccessories?.map(acc => ({
            name: acc.name,
            model: acc.model,
            quantity: acc.quantity,
            unitPrice: acc.unitPrice || 0,
            currency: acc.currency || 'ETB',
            totalPrice: (acc.unitPrice || 0) * acc.quantity,
            withdrawnSerialNumbers: acc.withdrawnSerialNumbers || [],
            subAccessories: acc.withdrawnSubAccessories?.map(subAcc => ({
              name: subAcc.name,
              quantity: subAcc.quantity,
              unitPrice: subAcc.unitPrice || 0,
              currency: subAcc.currency || 'ETB'
            })) || []
          })) || []
        });
      });
    });

    // Convert to array
    this.itemDistributions = Array.from(distributionMap.values());
    
    // Apply sorting
    this.applySorting();
    
    // Calculate summary statistics
    this.calculateSummary(model22s);
  }

  private applySorting(): void {
    this.filteredDistributions = [...this.itemDistributions].sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'quantity':
          comparison = a.totalQuantity - b.totalQuantity;
          break;
        case 'value':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'withdrawals':
          comparison = a.withdrawalCount - b.withdrawalCount;
          break;
        case 'name':
          comparison = a.description.localeCompare(b.description);
          break;
      }
      
      return this.sortDirection === 'desc' ? -comparison : comparison;
    });
    
    // Update pagination after sorting
    this.updatePagination();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDistributions.length / this.itemsPerPage);
    
    // Reset to page 1 if current page is out of bounds
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    
    // Calculate start and end indices
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    // Get paginated items
    this.paginatedDistributions = this.filteredDistributions.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      
      // Scroll to top of the list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);
      
      // Calculate range around current page
      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      // Add ellipsis if needed
      if (start > 2) {
        pages.push(-1); // -1 represents ellipsis
      }
      
      // Add pages around current
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (end < this.totalPages - 1) {
        pages.push(-1); // -1 represents ellipsis
      }
      
      // Show last page
      pages.push(this.totalPages);
    }
    
    return pages;
  }

  private calculateSummary(model22s: Model22Dto[]): void {
    this.reportSummary = {
      totalItems: this.itemDistributions.length,
      totalWithdrawals: model22s.length,
      totalQuantityDistributed: this.itemDistributions.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalValueByRole: {},
      topItems: [],
      recentActivity: []
    };

    // Calculate total value by role and currency (including accessories)
    model22s.forEach(m22 => {
      if (!this.reportSummary.totalValueByRole[m22.role]) {
        this.reportSummary.totalValueByRole[m22.role] = {};
      }
      
      m22.items.forEach(item => {
        // Add parent item value
        const currency = item.currency || 'ETB';
        const value = (item.unitPrice || 0) * item.quantity;
        
        if (!this.reportSummary.totalValueByRole[m22.role][currency]) {
          this.reportSummary.totalValueByRole[m22.role][currency] = 0;
        }
        this.reportSummary.totalValueByRole[m22.role][currency] += value;
        
        // Add accessory values
        if (item.withdrawnAccessories && item.withdrawnAccessories.length > 0) {
          item.withdrawnAccessories.forEach(acc => {
            const accCurrency = acc.currency || 'ETB';
            const accValue = (acc.unitPrice || 0) * acc.quantity;
            
            if (!this.reportSummary.totalValueByRole[m22.role][accCurrency]) {
              this.reportSummary.totalValueByRole[m22.role][accCurrency] = 0;
            }
            this.reportSummary.totalValueByRole[m22.role][accCurrency] += accValue;
          });
        }
      });
    });

    // Get top 5 items by quantity
    this.reportSummary.topItems = [...this.itemDistributions]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5)
      .map(item => ({
        description: item.description,
        model: item.model,
        quantity: item.totalQuantity
      }));

    // Calculate recent activity (group by date)
    const activityMap = new Map<string, number>();
    model22s.forEach(m22 => {
      const date = m22.ethiopianDate;
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    this.reportSummary.recentActivity = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        const dateA = this.parseEthiopianDate(a.date).getTime();
        const dateB = this.parseEthiopianDate(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }

  onSearchChange(): void {
    // Use subject for debouncing
    this.searchSubject.next(this.searchTerm);
  }

  onDateFilterChange(): void {
    this.loadReport();
  }

  onSortChange(sortBy: 'quantity' | 'value' | 'withdrawals' | 'name'): void {
    if (this.sortBy === sortBy) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'desc';
    }
    this.applySorting();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'cards' ? 'table' : 'cards';
  }

  toggleItemExpansion(description: string, model: string): void {
    const key = `${description}_${model}`;
    if (this.expandedItems.has(key)) {
      this.expandedItems.delete(key);
    } else {
      this.expandedItems.add(key);
    }
  }

  isItemExpanded(description: string, model: string): boolean {
    return this.expandedItems.has(`${description}_${model}`);
  }

  getTotalValueFormatted(): string {
    const values: string[] = [];
    
    Object.keys(this.reportSummary.totalValueByRole).forEach(role => {
      Object.keys(this.reportSummary.totalValueByRole[role]).forEach(currency => {
        // Skip FOC currency
        if (currency === 'FOC') return;
        
        const value = this.reportSummary.totalValueByRole[role][currency];
        const existing = values.find(v => v.includes(currency));
        
        if (existing) {
          const index = values.indexOf(existing);
          const currentValue = parseFloat(existing.split(':')[1].trim());
          values[index] = `${currency}: ${(currentValue + value).toFixed(2)}`;
        } else {
          values.push(`${currency}: ${value.toFixed(2)}`);
        }
      });
    });
    
    return values.join(' | ') || '0.00 ETB';
  }

  getItemValueFormatted(item: ItemDistribution): string {
    const values: string[] = [];
    
    Object.keys(item.totalValueByCurrency).forEach(currency => {
      // Skip FOC currency
      if (currency === 'FOC') return;
      
      const value = item.totalValueByCurrency[currency];
      if (value > 0) {
        values.push(`${value.toFixed(2)} ${currency}`);
      }
    });
    
    return values.join(' | ') || '0.00';
  }

  toggleRoleDropdown(): void {
    this.isRoleDropdownOpen = !this.isRoleDropdownOpen;
  }

  onRoleChange(event: any, role: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedRoles = [...this.selectedRoles, role];
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
    this.loadReport();
  }

  private registerEthiopicFont(doc: jsPDF): void {
    doc.addFileToVFS('NotoSerifEthiopic.ttf', NOTO_ETHIOPIC_BASE64);
    doc.addFont('NotoSerifEthiopic.ttf', 'NotoEthiopic', 'normal');
    doc.addFont('NotoSerifEthiopic.ttf', 'NotoEthiopic', 'bold');
  }

  private pdfText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    size: number,
    weight: 'normal' | 'bold' = 'normal',
    color: [number, number, number] = [55, 65, 81],
    align: 'left' | 'center' | 'right' = 'left'
  ): void {
    const hasEthiopic = /[\u1200-\u137F]/.test(text);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    
    if (hasEthiopic) {
      doc.setFont('NotoEthiopic', 'normal');
    } else {
      doc.setFont('helvetica', weight);
    }
    
    doc.text(text, x, y, { align });
    doc.setFont('helvetica', 'normal');
  }

  exportToPDF(): void {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Register Ethiopic font — must be first
  this.registerEthiopicFont(doc);

  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const ml     = 14;
  const mr     = 14;
  const cw     = pageW - ml - mr;
  let   y      = 0;

  const navy     = [4,  44,  83]  as [number,number,number];
  const blue     = [24, 95, 165]  as [number,number,number];
  const blueLight= [230,241,251]  as [number,number,number];
  const blueMid  = [55, 138, 221] as [number,number,number];
  const white    = [255,255,255]  as [number,number,number];
  const rowAlt   = [248,249,250]  as [number,number,number];
  const greenBg  = [234,243,222]  as [number,number,number];
  const greenTxt = [39, 80, 10]   as [number,number,number];
  const amberBg  = [250,238,218]  as [number,number,number];
  const amberTxt = [99, 56, 6]    as [number,number,number];
  const bodyTxt  = [55, 65, 81]   as [number,number,number];
  const mutedTxt = [107,114,128]  as [number,number,number];
  const borderClr= [220,225,230]  as [number,number,number];

  const h = (text: string, x: number, yy: number, size: number,
             color: [number,number,number], align: 'left'|'center'|'right' = 'left') =>
    this.pdfText(doc, text, x, yy, size, 'bold', color, align);

  const p = (text: string, x: number, yy: number, size: number,
             color: [number,number,number], align: 'left'|'center'|'right' = 'left') =>
    this.pdfText(doc, text, x, yy, size, 'normal', color, align);

  const setFill  = (c: [number,number,number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw  = (c: [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const clip = (str: string, max: number) => str?.length > max ? str.slice(0, max) + '...' : (str || '-');

  const checkBreak = (need: number) => {
    if (y + need > pageH - 12) {
      drawFooter();
      doc.addPage();
      y = drawPageHeader();
    }
  };

  const drawPageHeader = (): number => {
    setFill(blueMid);
    doc.rect(0, 0, pageW, 2, 'F');
    return 8;
  };

  const drawFooter = () => {
    const pg    = (doc as any).internal.getCurrentPageInfo().pageNumber;
    const total = (doc as any).internal.getNumberOfPages();
    setDraw(borderClr);
    doc.setLineWidth(0.3);
    doc.line(ml, pageH - 10, ml + cw, pageH - 10);
    p(`Distribution Analytics Report`, ml, pageH - 5, 7, mutedTxt);
    p(`Page ${pg} of ${total}`, ml + cw, pageH - 5, 7, mutedTxt, 'right');
  };

  // Cover header
  setFill(navy);
  doc.rect(0, 0, pageW, 36, 'F');
  setFill(blueMid);
  doc.rect(0, 36, pageW, 2, 'F');

  h('Distribution Analytics Report', ml, 14, 15, white);
  p(`Generated: ${new Date().toLocaleString()}   ·   Roles: ${this.selectedRoles.join(', ')}   ·   Period: ${this.dateFilter || 'All Time'}`,
    ml, 26, 8, [133, 183, 235] as [number,number,number]);

  y = 46;

  // Summary stat cards
  const stats = [
    { label: 'Item Types',        value: String(this.reportSummary.totalItems) },
    { label: 'Total Withdrawals', value: String(this.reportSummary.totalWithdrawals) },
    { label: 'Qty Distributed',   value: String(this.reportSummary.totalQuantityDistributed) },
    { label: 'Total Value',       value: this.getTotalValueFormatted() },
  ];

  const cardW = cw / stats.length - 2;
  stats.forEach((s, i) => {
    const cx = ml + i * (cardW + 2.7);
    setFill(blueLight);
    doc.roundedRect(cx, y, cardW, 22, 2, 2, 'F');
    setFill(blue);
    doc.rect(cx, y, cardW, 1.5, 'F');
    p(s.label, cx + cardW / 2, y + 9, 6.5, mutedTxt, 'center');
    const valFont = s.value.length > 14 ? 9 : 12;
    h(s.value, cx + cardW / 2, y + 19, valFont, navy, 'center');
  });

  y += 30;
  setDraw(borderClr);
  doc.setLineWidth(0.3);
  doc.line(ml, y, ml + cw, y);
  y += 6;

  const COL = {
    voucher:   { x: ml,       w: 28 },
    date:      { x: ml + 28,  w: 26 },
    recipient: { x: ml + 54,  w: 36 },
    org:       { x: ml + 90,  w: 36 },
    qty:       { x: ml + 126, w: 12 },
    unitPrice: { x: ml + 138, w: 22 },
    total:     { x: ml + 160, w: 22 },
  };

  const drawTableHeader = () => {
    setFill(blue);
    doc.rect(ml, y, cw, 9, 'F');
    h('Voucher No.',  COL.voucher.x + 1,   y + 6, 6.5, white);
    h('Date',         COL.date.x + 1,       y + 6, 6.5, white);
    h('Recipient',    COL.recipient.x + 1,  y + 6, 6.5, white);
    h('Organization', COL.org.x + 1,        y + 6, 6.5, white);
    h('Qty',          COL.qty.x + 1,        y + 6, 6.5, white);
    h('Unit Price',   COL.unitPrice.x + 1,  y + 6, 6.5, white);
    h('Total',        COL.total.x + 1,      y + 6, 6.5, white);
    y += 9;
  };

  this.filteredDistributions.forEach((dist, di) => {
    checkBreak(28);
    setFill(navy);
    doc.roundedRect(ml, y, cw, 11, 2, 2, 'F');
    h(`${di + 1}.  ${clip(dist.description, 48)}`, ml + 3, y + 7.5, 9, white);
    p(`Model: ${dist.model}`, ml + cw - 3, y + 7.5, 7.5, white, 'right');
    y += 11;

    setFill(blueLight);
    doc.rect(ml, y, cw, 9, 'F');
    p(`Units distributed: ${dist.totalQuantity}     Value: ${this.getItemValueFormatted(dist)}     Transactions: ${dist.withdrawalCount}`,
      ml + 3, y + 6.5, 7.5, [12, 68, 124] as [number,number,number]);
    y += 9;

    checkBreak(12);
    drawTableHeader();

    dist.withdrawals.forEach((w, wi) => {
      checkBreak(9);
      setFill(wi % 2 === 0 ? white : rowAlt);
      doc.rect(ml, y, cw, 9, 'F');
      p(clip(w.voucherNumber, 16), COL.voucher.x + 1,   y + 6, 7, bodyTxt);
      p(clip(w.date, 14),          COL.date.x + 1,       y + 6, 7, bodyTxt);
      p(clip(w.recipient, 20),     COL.recipient.x + 1,  y + 6, 7, bodyTxt);
      p(clip(w.organization, 20),  COL.org.x + 1,        y + 6, 7, bodyTxt);
      p(String(w.quantity),        COL.qty.x + 1,        y + 6, 7, bodyTxt);
      p(`${w.unitPrice.toFixed(2)} ${w.currency}`,       COL.unitPrice.x + 1, y + 6, 7, bodyTxt);
      h(`${w.totalPrice.toFixed(2)} ${w.currency}`,      COL.total.x + 1,     y + 6, 7, bodyTxt);
      y += 9;

      if (w.serialNumbers?.length > 0) {
        checkBreak(7);
        setFill(greenBg);
        doc.rect(ml, y, cw, 7, 'F');
        const snText = doc.splitTextToSize(`  S/N: ${w.serialNumbers.join(', ')}`, cw - 4);
        p(snText[0], ml + 2, y + 5, 6.5, greenTxt);
        y += 7;
      }

      if (w.accessories?.length) {
        checkBreak(7);
        setFill(amberBg);
        doc.rect(ml, y, cw, 7, 'F');
        h('  Accessories withdrawn:', ml + 2, y + 5, 6.5, amberTxt);
        y += 7;

        w.accessories.forEach(acc => {
          checkBreak(7);
          setFill([255, 251, 235] as [number,number,number]);
          doc.rect(ml, y, cw, 7, 'F');
          const snPart = acc.withdrawnSerialNumbers?.length ? `  S/N: ${acc.withdrawnSerialNumbers.join(', ')}` : '';
          const accLine = doc.splitTextToSize(
            `    - ${acc.name} (${acc.model})   Qty: ${acc.quantity}   Unit: ${acc.unitPrice.toFixed(2)} ${acc.currency}   Total: ${acc.totalPrice.toFixed(2)} ${acc.currency}${snPart}`,
            cw - 4
          );
          p(accLine[0], ml + 2, y + 5, 6.5, amberTxt);
          y += 7;

          acc.subAccessories?.forEach(sub => {
            checkBreak(6);
            setFill([255, 253, 244] as [number,number,number]);
            doc.rect(ml, y, cw, 6, 'F');
            p(`          -> ${sub.name}   Qty: ${sub.quantity}   Unit: ${sub.unitPrice.toFixed(2)} ${sub.currency}`,
              ml + 2, y + 4.5, 6, mutedTxt);
            y += 6;
          });
        });
      }
    });

    y += 3;
    setDraw(borderClr);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.line(ml, y, ml + cw, y);
    doc.setLineDashPattern([], 0);
    y += 5;
  });

  const totalPg = (doc as any).internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPg; pg++) {
    doc.setPage(pg);
    drawFooter();
  }

  doc.save(`Distribution_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

  downloadItemPDF(dist: ItemDistribution, event: Event): void {
    event.stopPropagation();

    const doc = new jsPDF('p', 'mm', 'a4');
    this.registerEthiopicFont(doc);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ml = 14;
    const cw = pageW - ml - ml;
    let y = 0;

    const navy = [4, 44, 83] as [number, number, number];
    const blue = [24, 95, 165] as [number, number, number];
    const blueLight = [230, 241, 251] as [number, number, number];
    const blueMid = [55, 138, 221] as [number, number, number];
    const white = [255, 255, 255] as [number, number, number];
    const rowAlt = [248, 249, 250] as [number, number, number];
    const greenBg = [234, 243, 222] as [number, number, number];
    const greenTxt = [39, 80, 10] as [number, number, number];
    const amberBg = [250, 238, 218] as [number, number, number];
    const amberTxt = [99, 56, 6] as [number, number, number];
    const bodyTxt = [55, 65, 81] as [number, number, number];
    const mutedTxt = [107, 114, 128] as [number, number, number];
    const borderClr = [220, 225, 230] as [number, number, number];

    const h = (text: string, x: number, yy: number, size: number,
               color: [number, number, number], align: 'left' | 'center' | 'right' = 'left') =>
      this.pdfText(doc, text, x, yy, size, 'bold', color, align);

    const p = (text: string, x: number, yy: number, size: number,
               color: [number, number, number], align: 'left' | 'center' | 'right' = 'left') =>
      this.pdfText(doc, text, x, yy, size, 'normal', color, align);

    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const clip = (str: string, max: number) => str?.length > max ? str.slice(0, max) + '...' : (str || '-');

    const checkBreak = (need: number) => {
      if (y + need > pageH - 12) {
        drawFooter();
        doc.addPage();
        y = drawPageHeader();
      }
    };

    const drawPageHeader = (): number => {
      setFill(blueMid);
      doc.rect(0, 0, pageW, 2, 'F');
      return 8;
    };

    const drawFooter = () => {
      const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const total = (doc as any).internal.getNumberOfPages();
      setDraw(borderClr);
      doc.setLineWidth(0.3);
      doc.line(ml, pageH - 10, ml + cw, pageH - 10);
      p(`Item Distribution Report`, ml, pageH - 5, 7, mutedTxt);
      p(`Page ${pg} of ${total}`, ml + cw, pageH - 5, 7, mutedTxt, 'right');
    };

    // Cover header
    setFill(navy);
    doc.rect(0, 0, pageW, 36, 'F');
    setFill(blueMid);
    doc.rect(0, 36, pageW, 2, 'F');

    h(dist.description, ml, 14, 15, white);
    p(`Model: ${dist.model}`, ml, 26, 8, [133, 183, 235] as [number, number, number]);

    y = 46;

    // Summary stat cards
    const stats = [
      { label: 'Units / ብዛት', value: String(dist.totalQuantity) },
      { label: 'Value / ዋጋ', value: this.getItemValueFormatted(dist) },
      { label: 'Transactions / ግብይቶች', value: String(dist.withdrawalCount) },
    ];

    const cardW = cw / stats.length - 2;
    stats.forEach((s, i) => {
      const cx = ml + i * (cardW + 2.7);
      setFill(blueLight);
      doc.roundedRect(cx, y, cardW, 22, 2, 2, 'F');
      setFill(blue);
      doc.rect(cx, y, cardW, 1.5, 'F');
      p(s.label, cx + cardW / 2, y + 9, 6.5, mutedTxt, 'center');
      const valFont = s.value.length > 14 ? 9 : 12;
      h(s.value, cx + cardW / 2, y + 19, valFont, navy, 'center');
    });

    y += 30;
    setDraw(borderClr);
    doc.setLineWidth(0.3);
    doc.line(ml, y, ml + cw, y);
    y += 6;

    const COL = {
      voucher: { x: ml, w: 28 },
      date: { x: ml + 28, w: 26 },
      recipient: { x: ml + 54, w: 36 },
      org: { x: ml + 90, w: 36 },
      qty: { x: ml + 126, w: 12 },
      unitPrice: { x: ml + 138, w: 22 },
      total: { x: ml + 160, w: 22 },
    };

    const drawTableHeader = () => {
      setFill(blue);
      doc.rect(ml, y, cw, 9, 'F');
      h('Voucher No.', COL.voucher.x + 1, y + 6, 6.5, white);
      h('Date', COL.date.x + 1, y + 6, 6.5, white);
      h('Recipient', COL.recipient.x + 1, y + 6, 6.5, white);
      h('Organization', COL.org.x + 1, y + 6, 6.5, white);
      h('Qty', COL.qty.x + 1, y + 6, 6.5, white);
      h('Unit Price', COL.unitPrice.x + 1, y + 6, 6.5, white);
      h('Total', COL.total.x + 1, y + 6, 6.5, white);
      y += 9;
    };

    checkBreak(12);
    drawTableHeader();

    dist.withdrawals.forEach((w, wi) => {
      checkBreak(9);
      setFill(wi % 2 === 0 ? white : rowAlt);
      doc.rect(ml, y, cw, 9, 'F');
      p(clip(w.voucherNumber, 16), COL.voucher.x + 1, y + 6, 7, bodyTxt);
      p(clip(w.date, 14), COL.date.x + 1, y + 6, 7, bodyTxt);
      p(clip(w.recipient, 20), COL.recipient.x + 1, y + 6, 7, bodyTxt);
      p(clip(w.organization, 20), COL.org.x + 1, y + 6, 7, bodyTxt);
      p(String(w.quantity), COL.qty.x + 1, y + 6, 7, bodyTxt);
      p(`${w.unitPrice.toFixed(2)} ${w.currency}`, COL.unitPrice.x + 1, y + 6, 7, bodyTxt);
      h(`${w.totalPrice.toFixed(2)} ${w.currency}`, COL.total.x + 1, y + 6, 7, bodyTxt);
      y += 9;

      if (w.serialNumbers?.length > 0) {
        checkBreak(7);
        setFill(greenBg);
        doc.rect(ml, y, cw, 7, 'F');
        const snText = doc.splitTextToSize(`  S/N: ${w.serialNumbers.join(', ')}`, cw - 4);
        p(snText[0], ml + 2, y + 5, 6.5, greenTxt);
        y += 7;
      }

      if (w.accessories?.length) {
        checkBreak(7);
        setFill(amberBg);
        doc.rect(ml, y, cw, 7, 'F');
        h('  Accessories withdrawn:', ml + 2, y + 5, 6.5, amberTxt);
        y += 7;

        w.accessories.forEach(acc => {
          checkBreak(7);
          setFill([255, 251, 235] as [number, number, number]);
          doc.rect(ml, y, cw, 7, 'F');
          const snPart = acc.withdrawnSerialNumbers?.length ? `  S/N: ${acc.withdrawnSerialNumbers.join(', ')}` : '';
          const accLine = doc.splitTextToSize(
            `    - ${acc.name} (${acc.model})   Qty: ${acc.quantity}   Unit: ${acc.unitPrice.toFixed(2)} ${acc.currency}   Total: ${acc.totalPrice.toFixed(2)} ${acc.currency}${snPart}`,
            cw - 4
          );
          p(accLine[0], ml + 2, y + 5, 6.5, amberTxt);
          y += 7;

          acc.subAccessories?.forEach(sub => {
            checkBreak(6);
            setFill([255, 253, 244] as [number, number, number]);
            doc.rect(ml, y, cw, 6, 'F');
            p(`          -> ${sub.name}   Qty: ${sub.quantity}   Unit: ${sub.unitPrice.toFixed(2)} ${sub.currency}`,
              ml + 2, y + 4.5, 6, mutedTxt);
            y += 6;
          });
        });
      }
    });

    const totalPg = (doc as any).internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPg; pg++) {
      doc.setPage(pg);
      drawFooter();
    }

    const filename = `${dist.description.replace(/[^a-z0-9]/gi, '_')}_${dist.model}_Distribution.pdf`;
    doc.save(filename);
  }
}

