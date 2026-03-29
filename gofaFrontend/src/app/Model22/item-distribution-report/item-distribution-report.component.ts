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

  exportToExcel(): void {
    const data: any[] = [];

    // Add summary sheet data
    const summaryData = [
      ['Item Distribution Report', 'የእቃ ስርጭት ሪፖርት'],
      ['Generated Date', new Date().toLocaleString()],
      ['Date Filter', this.dateFilter || 'All Dates'],
      ['Selected Roles', this.selectedRoles.join(', ')],
      [''],
      ['Summary Statistics', ''],
      ['Total Items', this.reportSummary.totalItems],
      ['Total Withdrawals', this.reportSummary.totalWithdrawals],
      ['Total Quantity Distributed', this.reportSummary.totalQuantityDistributed],
      ['Total Value', this.getTotalValueFormatted()],
      ['']
    ];

    // Add detailed distribution data
    this.filteredDistributions.forEach(dist => {
      // Item header row
      data.push({
        'Item': dist.description,
        'Model': dist.model,
        'Total Qty': dist.totalQuantity,
        'Total Value': `${dist.totalValue.toFixed(2)} ${dist.currency}`,
        'Withdrawals': dist.withdrawalCount,
        'Voucher': '',
        'Date': '',
        'Recipient': '',
        'Organization': '',
        'Qty': '',
        'Unit Price': '',
        'Total Price': '',
        'Serial Numbers': ''
      });

      // Withdrawal details
      dist.withdrawals.forEach((w, index) => {
        data.push({
          'Item': index === 0 ? '' : '',
          'Model': '',
          'Total Qty': '',
          'Total Value': '',
          'Withdrawals': '',
          'Voucher': w.voucherNumber,
          'Date': w.date,
          'Recipient': w.recipient,
          'Organization': w.organization,
          'Qty': w.quantity,
          'Unit Price': `${w.unitPrice.toFixed(2)} ${w.currency}`,
          'Total Price': `${w.totalPrice.toFixed(2)} ${w.currency}`,
          'Serial Numbers': w.serialNumbers.join(', ')
        });
      });
      
      // Add empty row between items
      data.push({});
    });

    // Create worksheets
    const ws = XLSX.utils.json_to_sheet(data);
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, ws, 'Distribution Details');

    // Add top items sheet
    if (this.reportSummary.topItems.length > 0) {
      const topItemsData = [
        ['Rank', 'Item', 'Model', 'Quantity'],
        ...this.reportSummary.topItems.map((item, index) => [
          index + 1,
          item.description,
          item.model,
          item.quantity
        ])
      ];
      const wsTopItems = XLSX.utils.aoa_to_sheet(topItemsData);
      XLSX.utils.book_append_sheet(wb, wsTopItems, 'Top Items');
    }

    // Export file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    const filename = `Item_Distribution_Report_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  downloadItemPDF(dist: ItemDistribution, event: Event): void {
    event.stopPropagation(); // Prevent expanding/collapsing the item
    
    // Create a temporary container for the PDF content
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = 'Arial, sans-serif';
    
    // Build HTML content
    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; font-size: 24px; color: #03203c;">${dist.description}</h1>
        <p style="margin: 0; font-size: 16px; color: #666;">Model: ${dist.model}</p>
      </div>
      
      <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Units / ብዛት</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${dist.totalQuantity}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Value / ዋጋ</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${this.getItemValueFormatted(dist)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Transactions / ግብይቶች</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${dist.withdrawalCount}</td>
        </tr>
      </table>
      
      <h2 style="font-size: 18px; color: #03203c; margin: 20px 0 10px 0;">Transaction Details / የግብይት ዝርዝሮች</h2>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #03203c; color: white;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Voucher No.</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Recipient</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Organization</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Serial Numbers</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    dist.withdrawals.forEach((w, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
      html += `
        <tr style="background: ${bgColor};">
          <td style="padding: 8px; border: 1px solid #ddd;">${w.voucherNumber}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${w.date}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${w.recipient}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${w.organization}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${w.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${w.unitPrice.toFixed(2)} ${w.currency}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${w.totalPrice.toFixed(2)} ${w.currency}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${w.serialNumbers.join(', ')}</td>
        </tr>
      `;
      
      // Add accessories if any
      if (w.accessories && w.accessories.length > 0) {
        html += `
          <tr style="background: #f0f8ff;">
            <td colspan="8" style="padding: 10px; border: 1px solid #ddd;">
              <strong>📦 Withdrawn Accessories / የወጡ አባሪዎች:</strong>
              <table style="width: 100%; margin-top: 5px; border-collapse: collapse; font-size: 10px;">
                <thead>
                  <tr style="background: #0a4b78; color: white;">
                    <th style="padding: 5px; border: 1px solid #ddd;">Name</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">Model</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">Qty</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">Unit Price</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">Total</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">Serial Numbers</th>
                  </tr>
                </thead>
                <tbody>
        `;
        
        w.accessories.forEach(acc => {
          html += `
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd;">${acc.name}</td>
              <td style="padding: 5px; border: 1px solid #ddd;">${acc.model}</td>
              <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${acc.quantity}</td>
              <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${acc.unitPrice.toFixed(2)} ${acc.currency}</td>
              <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${acc.totalPrice.toFixed(2)} ${acc.currency}</td>
              <td style="padding: 5px; border: 1px solid #ddd;">${acc.withdrawnSerialNumbers?.join(', ') || '-'}</td>
            </tr>
          `;
        });
        
        html += `
                </tbody>
              </table>
            </td>
          </tr>
        `;
      }
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    container.innerHTML = html;
    document.body.appendChild(container);
    
    // Generate PDF from HTML
    setTimeout(() => {
      html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - 2 * margin;
        const contentHeight = pageHeight - 2 * margin;
        
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const totalPages = Math.ceil(imgHeight / contentHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          const yOffset = -(page * contentHeight);
          pdf.addImage(imgData, 'PNG', margin, yOffset + margin, imgWidth, imgHeight);
        }
        
        const filename = `${dist.description.replace(/[^a-z0-9]/gi, '_')}_${dist.model}_Distribution.pdf`;
        pdf.save(filename);
        
        // Clean up
        document.body.removeChild(container);
      }).catch(error => {
        console.error('Error generating PDF:', error);
        document.body.removeChild(container);
      });
    }, 100);
  }
}

