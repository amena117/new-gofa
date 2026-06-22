import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model'; // Assuming Accessory is part of Item or not directly used here
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-model1-report',
  templateUrl: './model1-report.component.html',
  styleUrls: ['./model1-report.component.css']
})
export class Model1ReportComponent implements OnInit {
  records: Item[] = [];
  filteredRecords: Item[] = [];
  paginatedRecords: Item[] = [];
  selectedRange: string = '0'; // Default to show all records
  isLoading: boolean = false;
  errorMessage: string = '';

  // View mode and sorting
  viewMode: 'cards' | 'table' = 'cards';
  sortBy: string = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  expandedItems: Set<any> = new Set();

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 1;

  // Math reference for template
  Math = Math;

  ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

  constructor(private model1Service: TransitService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.model1Service.getAllModel1Records().subscribe({
      next: (data: Item[]) => {
        this.records = data.map(record => ({
          ...record,
          date: record.date?.trim() ?? '',
          supplier: record.supplier ?? '',
          category: record.category ?? '',
          prno: record.prno ?? '',
          invoiceNo: record.invoiceNo ?? '',
          itemType: record.itemType ?? '',
          contactNumber: record.contactNumber ?? '',
          number: record.number ?? '',
          registeredBy: record.registeredBy ?? '',
          serialNumber: record.serialNumber ?? '',
          description: record.description ?? '',
          unitOfMeasurment: record.unitOfMeasurment ?? '',
          ordered: record.ordered ?? 0,
          received: record.received ?? 0,
          unitOfPrice: record.unitOfPrice ?? '',
          amount: record.amount ?? 0,
          currency: record.currency ?? '',
          location: record.location ?? '',
          remark: record.remark ?? '',
          checkedByName: record.checkedByName ?? '',
          cTitle: record.cTitle ?? '',
          recivedByName: record.recivedByName ?? '',
          rTitle: record.rTitle ?? '',
          authorizedByName: record.authorizedByName ?? '',
          aTitle: record.aTitle ?? '',
          model19Ref: record.model19Ref ?? '',
          quantity: record.quantity ?? 0,
          unitPrice: record.unitPrice ?? 0,
          totalPrice: record.totalPrice ?? 0,
          Manufacturer: record.Manufacturer ?? '',
          Warranty: record.Warranty ?? '',
          ExpiryDate: record.ExpiryDate ?? undefined,
          BatchNumber: record.BatchNumber ?? '',
          DateSentForInspection: record.DateSentForInspection ?? undefined,
          DateReceivedByInspection: record.DateReceivedByInspection ?? undefined,
          DateSentToStore: record.DateSentToStore ?? undefined,
          Store: record.Store ?? '',
          status: record.status ?? '',
          storeType: record.storeType ?? '',
          hasAccessories: record.hasAccessories ?? false,
          accessories: record.accessories ?? [],
          hasExtraItems: record.hasExtraItems ?? false,
          extraItems: record.extraItems ?? []
        }));

        console.log('Loaded records:', this.records);
        console.log('Sample record for debugging:', this.records[0]);
        this.records.forEach(record => {
          console.log(`Record ID: ${record.model1Id}, Date: ${record.date}, Store: ${record.Store}, StoreType: ${record.storeType}, Location: ${record.location}`);
        });

        this.filterByRange();
        this.extractFilterOptions();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load records: ' + (err.message ?? 'Unknown error');
        console.error('Error loading records:', err);
        this.isLoading = false;
      }
    });
  }

  // View mode and expansion methods
  currentView: 'grid' | 'list' = 'list'; // Changed default to list
  searchTerm: string = '';
  detailsOpenItems: Set<any> = new Set();
  
  // New filter properties
  selectedStore: string = '';
  selectedStatus: string = '';
  availableStores: string[] = [];
  availableStatuses: string[] = [];

  toggleView(): void {
    this.currentView = this.currentView === 'grid' ? 'list' : 'grid';
  }

  toggleDetails(itemId: any): void {
    if (this.detailsOpenItems.has(itemId)) {
      this.detailsOpenItems.delete(itemId);
    } else {
      this.detailsOpenItems.add(itemId);
    }
  }

  isDetailsOpen(itemId: any): boolean {
    return this.detailsOpenItems.has(itemId);
  }

  // Track expanded sub-accessories per record+accessory index
  expandedAccessories: Map<string, boolean> = new Map();

  toggleAccessory(recordId: any, accIndex: number): void {
    const key = `${recordId}_${accIndex}`;
    this.expandedAccessories.set(key, !this.expandedAccessories.get(key));
  }

  isAccessoryExpanded(recordId: any, accIndex: number): boolean {
    return !!this.expandedAccessories.get(`${recordId}_${accIndex}`);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStoreFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private extractFilterOptions(): void {
    // Extract unique store types (VHF, HF, SPAREPART, ELECTRONICS)
    const stores = new Set<string>();
    this.records.forEach(record => {
      if (record.storeType && record.storeType.trim()) {
        stores.add(record.storeType.trim());
      }
    });
    
    console.log('Extracted store types:', Array.from(stores));
    this.availableStores = Array.from(stores).sort();

    // Extract unique statuses (normalized)
    const statuses = new Set<string>();
    this.records.forEach(record => {
      if (record.status && record.status.trim()) {
        const normalizedStatus = this.getDisplayStatus(record.status);
        statuses.add(normalizedStatus);
      }
    });
    
    console.log('Extracted statuses:', Array.from(statuses));
    this.availableStatuses = Array.from(statuses).sort();
  }

  private applyFilters(): void {
    let filtered = [...this.records];
    
    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        (record.description || '').toLowerCase().includes(searchLower) ||
        (record.supplier || '').toLowerCase().includes(searchLower) ||
        (record.serialNumber || '').toLowerCase().includes(searchLower) ||
        (record.itemType || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply store type filter
    if (this.selectedStore) {
      filtered = filtered.filter(record => 
        record.storeType === this.selectedStore
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(record => 
        this.getDisplayStatus(record.status) === this.selectedStatus
      );
    }
    
    this.filteredRecords = filtered.slice().reverse();
    this.updatePagination();
  }

  // Pagination methods for new design
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, this.currentPage - halfVisible);
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push(-1); // Ellipsis
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) pages.push(-1); // Ellipsis
      pages.push(this.totalPages);
    }
    
    return pages;
  }

  private ethiopianStringToDate(ethDate: string | null): Date | null {
    if (!ethDate || ethDate === 'Unknown Date') {
      console.warn(`Invalid Ethiopian date: ${ethDate}`);
      return null;
    }

    try {
      const cleanedDate = ethDate.trim();
      console.log(`Parsing date: ${cleanedDate}`);

      // Handle YYYY/MM/DD format
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanedDate)) {
        const [year, month, day] = cleanedDate.split('/').map(Number);
        const gregorianYear = year + 7; // Simplified EC to GC conversion
        const parsedDate = moment([gregorianYear, month - 1, day]).startOf('day').toDate();
        if (isNaN(parsedDate.getTime())) {
          console.warn(`Invalid parsed date for: ${cleanedDate}`);
          return null;
        }
        console.log(`Converted YYYY/MM/DD to Gregorian: ${parsedDate.toISOString()}`);
        return parsedDate;
      }

      // Handle Amharic format (e.g., "ነሐሴ 30, 2017" or "ጳጉሜ 3, 2017")
      const parts = cleanedDate.split(/[\s,]+/).filter(part => part);
      if (parts.length !== 3) {
        console.warn(`Invalid date format: ${cleanedDate}, expected 'Month Day, Year'`);
        return null;
      }
      const [monthName, dayStr, yearStr] = parts;
      const monthIndex = this.ethMonthNames.indexOf(monthName);
      if (monthIndex === -1) {
        console.warn(`Invalid month name: ${monthName}`);
        return null;
      }

      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);
      if (isNaN(day) || isNaN(year)) {
        console.warn(`Invalid day or year in: ${cleanedDate}`);
        return null;
      }

      // Ethiopian to Gregorian conversion
      let gregorianYear = year + (monthIndex === 12 ? 8 : 7); // Adjust for Pagumē
      let gregorianMonth = monthIndex; // 0-based for moment
      let gregorianDay = day;

      if (monthIndex === 12) {
        // Pagumē: 5 or 6 days depending on leap year
        const isLeapYear = year % 4 === 3; // Ethiopian leap year
        const maxDays = isLeapYear ? 6 : 5;
        if (day < 1 || day > maxDays) {
          console.warn(`Invalid day ${day} for Pagumē in year ${year} (max: ${maxDays})`);
          return null;
        }
        // Pagumē maps to early September
        gregorianMonth = 8; // September (0-based)
        gregorianDay = day + 4; // Approximate shift (Pagumē 1 ≈ September 5 or 6)
      } else {
        // Validate day for other months (1-30, except for leap year adjustments)
        const maxDays = monthIndex === 11 && year % 4 === 3 ? 6 : 30; // Nehase has 6 days in leap year
        if (day < 1 || day > maxDays) {
          console.warn(`Invalid day ${day} for month ${monthName} in year ${year} (max: ${maxDays})`);
          return null;
        }
        // Adjust for Gregorian month alignment (EC months are ~10 days earlier)
        gregorianDay = day + 10; // Shift forward by ~10 days
        if (gregorianDay > moment([gregorianYear, gregorianMonth]).daysInMonth()) {
          gregorianDay -= moment([gregorianYear, gregorianMonth]).daysInMonth();
          gregorianMonth = (gregorianMonth + 1) % 12;
          if (gregorianMonth === 0) gregorianYear += 1;
        }
      }

      // Create Gregorian date
      const parsedDate = moment([gregorianYear, gregorianMonth, gregorianDay]).startOf('day').toDate();
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid parsed date for: ${cleanedDate}`);
        return null;
      }
      console.log(`Converted to Gregorian: ${parsedDate.toISOString()}`);
      return parsedDate;
    } catch (error) {
      console.error(`Failed to parse Ethiopian date: ${ethDate}`, error);
      return null;
    }
  }

  displayDate(value: string | Date | null | undefined): string {
    if (!value || value === 'Unknown Date') return 'ያልታወቀ ቀን';
    if (typeof value === 'string') {
      try {
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) {
          const [year, month, day] = value.split('/').map(Number);
          const amharicMonth = this.ethMonthNames[month - 1] ?? 'መስከረም';
          return `${amharicMonth} ${day}, ${year}`;
        }
        if (/[\u1200-\u137F]/.test(value)) {
          return value; // Already in Amharic
        }
        return value; // Return as-is if not in expected format
      } catch (error) {
        console.error('Error formatting Ethiopian date:', error);
        return 'ያልታወቀ ቀን';
      }
    }
    return value instanceof Date && !isNaN(value.getTime()) ? moment(value).format('MMMM D, YYYY') : 'ያልታወቀ ቀን';
  }

  getAccessoriesDisplay(record: Item): string {
    if (!record.accessories?.length) {
      return 'None';
    }
    return record.accessories.map(acc => `${acc.name}: ${acc.quantity}`).join(', ');
  }

  getExtraItemsDisplay(record: Item): string {
    if (!record.extraItems?.length) {
      return 'None';
    }
    return record.extraItems.map(item =>
      `${item.name}: ${item.quantity} (${item.store}, ${this.getDisplayStatus(item.extraStatus)}${item.extraRecivedByName ? ', ' + item.extraRecivedByName : ''})`
    ).join(', ');
  }

  private addMonthsToDate(date: Date, months: number): Date {
    const result = moment(date).add(months, 'months').startOf('month').toDate();
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private addDaysToDate(date: Date, days: number): Date {
    const result = moment(date).add(days, 'days').startOf('day').toDate();
    result.setHours(0, 0, 0, 0);
    return result;
  }

  filterByRange(): void {
    if (this.selectedRange === '0') {
      // Show all records (use existing endpoint)
      this.model1Service.getAllModel1Records().subscribe({
        next: (data: Item[]) => {
          console.log('All records received from backend:');
          data.forEach(record => console.log(`ID: ${record.model1Id}, Date (EC): ${record.date}`));
          this.records = data;
          this.applyFilters();
        },
        error: (err) => {
          this.errorMessage = 'Failed to load all records: ' + (err.message ?? 'Unknown error');
        }
      });
      return;
    }

    // Use backend filtering
    this.isLoading = true;
    this.model1Service.getModel1ByDateRange(this.selectedRange).subscribe({
      next: (data: Item[]) => {
        console.log(`Filtered records received for range ${this.selectedRange}:`);
        data.forEach(record => console.log(`ID: ${record.model1Id}, Date (EC): ${record.date}`));

        // Optional: try converting EC -> GC in frontend for logging
        data.forEach(record => {
          const gcDate = this.ethiopianStringToDate(record.date);
          console.log(`ID: ${record.model1Id}, EC Date: ${record.date}, GC Date: ${gcDate}`);
        });

        this.records = data;
        this.applyFilters();
        this.extractFilterOptions();
        this.extractFilterOptions();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to filter records: ' + (err.message ?? 'Unknown error');
        this.isLoading = false;
      }
    });
  }

  // Status class method
  getStatusClass(status: string | undefined): string {
    if (!status) return 'inactive';
    const statusLower = status.toLowerCase();
    
    // Merge all variations of "received" including "Stores Recieved", "received", etc.
    if (statusLower.includes('received') || statusLower.includes('recieved')) return 'stores-received';
    if (statusLower.includes('waiting for store') || statusLower.includes('waiting')) return 'waiting';
    if (statusLower.includes('active') || statusLower.includes('completed') || statusLower.includes('approved')) return 'active';
    if (statusLower.includes('pending') || statusLower.includes('processing') || statusLower.includes('inspection')) return 'pending';
    
    return 'inactive';
  }

  // Method to normalize status display text
  getDisplayStatus(status: string | undefined): string {
    if (!status) return 'Unknown';
    const statusLower = status.toLowerCase();
    
    // Normalize all variations of "received" to "Received by Store"
    if (statusLower.includes('received') || statusLower.includes('recieved')) {
      return 'Received by Store';
    }
    
    // Normalize all variations of "waiting" to "Waiting for Store"
    if (statusLower.includes('waiting for store') || statusLower.includes('waiting for stores')) {
      return 'Waiting for Store';
    }
    
    // Return original status for other cases
    return status;
  }

  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredRecords.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    this.updatePaginatedRecords();
  }

  updatePaginatedRecords(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedRecords();
    }
  }

  onItemsPerPageChange(event: any): void {
    const value = event.target ? event.target.value : event;
    this.itemsPerPage = parseInt(value, 10);
    this.currentPage = 1;
    this.updatePagination();
  }

  trackByRecordId(index: number, record: Item): any {
    return record.model1Id || index;
  }

  clearFilters(): void {
    this.selectedRange = '0';
    this.searchTerm = '';
    this.selectedStore = '';
    this.selectedStatus = '';
    this.filterByRange();
  }

  formatPrice(price: number, currency: string): string {
    if (!price || price === 0) {
      return '0.00 ETB';
    }
    
    // Normalize currency - treat ETB and Birr as the same
    let normalizedCurrency = currency || 'ETB';
    if (normalizedCurrency.toLowerCase() === 'birr' || normalizedCurrency.toLowerCase() === 'etb') {
      normalizedCurrency = 'ETB';
    }
    
    const formattedPrice = price.toFixed(2);
    return `${formattedPrice} ${normalizedCurrency}`;
  }

  getUnitPrice(record: Item): number {
    // Try different fields that might contain unit price
    return record.unitPrice || record.amount || 0;
  }

  getTotalPrice(record: Item): number {
    // Try different fields that might contain total price
    if (record.totalPrice && record.totalPrice > 0) {
      return record.totalPrice;
    }
    // Calculate total price as unit price * received quantity
    const unitPrice = this.getUnitPrice(record);
    const quantity = record.received || record.quantity || 0;
    return unitPrice * quantity;
  }

  getTotalValue(): number {
    return this.filteredRecords.reduce((sum, record) => sum + this.getTotalPrice(record), 0);
  }

  getTotalValueByCurrency(): { [currency: string]: number } {
    const currencyTotals: { [currency: string]: number } = {};
    
    this.filteredRecords.forEach(record => {
      let currency = record.currency || 'ETB';
      
      // Normalize currency - treat ETB and Birr as the same
      if (currency.toLowerCase() === 'birr' || currency.toLowerCase() === 'etb') {
        currency = 'ETB';
      }
      
      const totalPrice = this.getTotalPrice(record);
      
      if (currencyTotals[currency]) {
        currencyTotals[currency] += totalPrice;
      } else {
        currencyTotals[currency] = totalPrice;
      }
    });
    
    return currencyTotals;
  }

  getTotalValueFormatted(): string {
    const currencyTotals = this.getTotalValueByCurrency();
    const currencies = Object.keys(currencyTotals);
    
    if (currencies.length === 0) {
      return '0.00 ETB';
    }
    
    if (currencies.length === 1) {
      const currency = currencies[0];
      return `${currencyTotals[currency].toFixed(2)} ${currency}`;
    }
    
    // Multiple currencies - show them side by side
    return currencies
      .map(currency => `${currencyTotals[currency].toFixed(2)} ${currency}`)
      .join(' | ');
  }

  getTotalQuantity(): number {
    return this.filteredRecords.reduce((sum, record) => sum + (record.received || 0), 0);
  }

  printDetails(): void {
    if (this.filteredRecords.length === 0) {
      this.errorMessage = 'No records to export';
      return;
    }

    try {
      // Create a temporary HTML element to render for html2canvas
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '0';
      tempElement.style.width = '1400px';
      tempElement.style.backgroundColor = 'white';
      tempElement.style.padding = '30px';
      tempElement.style.fontFamily = 'Arial, sans-serif';
      
      // Add header
      tempElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #03203c; margin: 0 0 10px 0;">Model 1 Transit Report</h1>
          <p style="color: #4a5568; margin: 0 0 15px 0;">Report Period: ${this.selectedRange === '0' ? 'All Time' : this.getDateRangeText()}</p>
          <p style="color: #4a5568; margin: 0;">
            Total Records: ${this.filteredRecords.length} | 
            Total Quantity: ${this.getTotalQuantity()} | 
            Total Value: ${this.getTotalValueFormatted()}
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #03203c; color: white;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Supplier</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Serial No</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Value</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Status</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Store Type</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredRecords.map(record => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="border: 1px solid #ddd; padding: 8px;">${this.displayDate(record.date)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.truncateText(record.description || 'N/A', 30)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.truncateText(record.supplier || 'N/A', 20)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${record.serialNumber || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.received || 0}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatPrice(this.getTotalPrice(record), record.currency)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${this.getDisplayStatus(record.status)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.storeType || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      document.body.appendChild(tempElement);
      
      html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      }).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        const fileName = `Model1_Transit_Report_${this.selectedRange}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        // Clean up
        document.body.removeChild(tempElement);
      }).catch((error: any) => {
        console.error('html2canvas failed:', error);
        this.errorMessage = 'Failed to generate PDF';
        document.body.removeChild(tempElement);
      });
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      this.errorMessage = 'Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
  }

  printSingleRecord(record: Item): void {
    try {
      // Create a temporary HTML element to render for html2canvas
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '0';
      tempElement.style.width = '800px';
      tempElement.style.backgroundColor = 'white';
      tempElement.style.padding = '30px';
      tempElement.style.fontFamily = 'Arial, sans-serif';
      
      // Add header and details
      tempElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #03203c; margin: 0 0 10px 0;">Transit Record Details</h1>
          <p style="color: #4a5568; margin: 0;">Record ID: ${record.model1Id}</p>
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div><strong>Date:</strong> ${this.displayDate(record.date)}</div>
          <div><strong>Supplier:</strong> ${record.supplier || 'N/A'}</div>
          <div><strong>Serial Number:</strong> ${record.serialNumber || 'N/A'}</div>
          <div><strong>Item Type:</strong> ${record.itemType || 'N/A'}</div>
          <div><strong>Category:</strong> ${record.category || 'N/A'}</div>
          <div><strong>Quantity Ordered:</strong> ${record.ordered || 0}</div>
          <div><strong>Quantity Received:</strong> ${record.received || 0}</div>
          <div><strong>Unit Price:</strong> ${this.formatPrice(this.getUnitPrice(record), record.currency)}</div>
          <div><strong>Total Value:</strong> ${this.formatPrice(this.getTotalPrice(record), record.currency)}</div>
          <div><strong>Status:</strong> ${this.getDisplayStatus(record.status)}</div>
          <div><strong>Store Type:</strong> ${record.storeType || 'N/A'}</div>
          <div><strong>Store:</strong> ${record.Store || 'N/A'}</div>
          <div><strong>Location:</strong> ${record.location || 'N/A'}</div>
          <div><strong>Invoice No:</strong> ${record.invoiceNo || 'N/A'}</div>
          <div><strong>PR No:</strong> ${record.prno || 'N/A'}</div>
          <div><strong>Checked By:</strong> ${record.checkedByName || 'N/A'}</div>
          <div><strong>Received By:</strong> ${record.recivedByName || 'N/A'}</div>
          <div><strong>Authorized By:</strong> ${record.authorizedByName || 'N/A'}</div>
          <div><strong>Prepared By:</strong> ${record.preparedBy || 'N/A'}</div>
        </div>
        <div style="margin-bottom: 15px;">
          <strong>Remark:</strong> ${record.remark || 'N/A'}
        </div>
      `;
      
      // Add accessories
      if (record.accessories && record.accessories.length > 0) {
        let accessoriesHtml = `
        <div style="margin-top: 20px;">
          <h3 style="color: #03203c;">Accessories:</h3>
          <ul>
            ${record.accessories.map(acc => {
              let accText = `${acc.name} - Qty: ${acc.quantity}`;
              if (acc.unitPrice) {
                accText += ` - Price: ${this.formatPrice(acc.unitPrice, acc.currency || record.currency)}`;
              }
              return `<li>${accText}</li>`;
            }).join('')}
          </ul>
        </div>
      `;
        tempElement.innerHTML += accessoriesHtml;
      }
      
      // Add extra items
      if (record.extraItems && record.extraItems.length > 0) {
        let extraItemsHtml = `
        <div style="margin-top: 20px;">
          <h3 style="color: #03203c;">Extra Items:</h3>
          <ul>
            ${record.extraItems.map(extra => `<li>${extra.name} - Qty: ${extra.quantity} - Store: ${extra.store} - Status: ${this.getDisplayStatus(extra.extraStatus)}</li>`).join('')}
          </ul>
        </div>
      `;
        tempElement.innerHTML += extraItemsHtml;
      }
      
      document.body.appendChild(tempElement);
      
      html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      }).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        const fileName = `Record_${record.model1Id}_${record.serialNumber || 'NO_SERIAL'}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        // Clean up
        document.body.removeChild(tempElement);
      }).catch((error: any) => {
        console.error('html2canvas failed:', error);
        document.body.removeChild(tempElement);
      });
      
    } catch (error) {
      console.error('PDF generation for single record failed:', error);
      this.errorMessage = 'Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private generateManualTable(pdf: jsPDF, columns: any[], tableData: any[], startY: number, margin: number, pageWidth: number, pageHeight: number): void {
    let yPosition = startY;
    const rowHeight = 8;
    const headerHeight = 10;
    
    // Draw table header
    pdf.setFillColor(3, 32, 60); // Main color
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    
    let xPosition = margin + 2;
    columns.forEach(col => {
      pdf.text(col.header, xPosition, yPosition + 7);
      xPosition += col.width;
    });
    
    yPosition += headerHeight;
    
    // Draw table rows
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    tableData.forEach((row, index) => {
      // Check if we need a new page
      if (yPosition + rowHeight > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Alternate row colors
      if (index % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
      }
      
      xPosition = margin + 2;
      columns.forEach(col => {
        const value = row[col.dataKey] || '';
        pdf.text(value.toString(), xPosition, yPosition + 6);
        xPosition += col.width;
      });
      
      yPosition += rowHeight;
    });
    
    // Add footer to all pages
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        margin,
        pageHeight - 10
      );
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - margin - 25,
        pageHeight - 10
      );
    }
  }

  private getDateRangeText(): string {
    switch (this.selectedRange) {
      case '1week': return 'Last Week';
      case '1month': return 'Last Month';
      case '3months': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case '9months': return 'Last 9 Months';
      case '1year': return 'Last Year';
      default: return 'All Time';
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }
}